// 单个 World Session 的安装器：校验 manifest、创建 scope，并集中管理资源回收。
// Runtime 通过它保证半安装、取消安装和正常销毁都走同一套清理路径。
import type {
  ActivityLevel,
  CollectionNavigationPort,
  CollectionNavigationSnapshot,
  FrameContext,
  FramePhase,
  FramePort,
  InputPort,
  LoaderPort,
  PortalDescriptor,
  PortalPort,
  PortalRegistration,
  QualityBudget,
  RendererHost,
  RenderPort,
  RenderView,
  Registration,
  StoryProgressPort,
  WorldId,
  WorldModule,
} from "./contracts";
import { RuntimeLifecycle } from "./lifecycle";
import { RuntimeResourceScope } from "./resource-scope";
import { RuntimeWorldFocus } from "./world-focus";

export class RuntimeRenderPort implements RenderPort {
  private view: RenderView | null = null;

  publish(view: RenderView): void {
    if (this.view) {
      // 一个 Session 只能有一个 Render View，避免多个渲染目标争夺 Runtime 的最终 render phase。
      throw new Error("A World may publish only one Render View.");
    }
    this.view = view;
  }

  current(): RenderView | null {
    return this.view;
  }

  clear(): void {
    this.view = null;
  }
}

class RuntimeSessionFramePort implements FramePort {
  constructor(
    private readonly upstream: FramePort,
    private readonly resources: RuntimeResourceScope,
    private readonly lifecycle: RuntimeLifecycle,
  ) {}

  add(
    phase: FramePhase,
    task: (frame: FrameContext) => void,
    priority = 0,
  ): Registration {
    let lastRunElapsed: number | null = null;
    let sessionFrame = 0;
    const upstreamRegistration = this.upstream.add(
      phase,
      (frame) => {
        const activity = this.lifecycle.activity;
        if (activity === "distant" || activity === "dormant") {
          lastRunElapsed = null;
          return;
        }

        const targetRate =
          activity === "near"
            ? Math.min(15, this.lifecycle.quality.animationRate)
            : this.lifecycle.quality.animationRate;
        const interval = 1 / targetRate;
        if (
          lastRunElapsed !== null &&
          frame.elapsed - lastRunElapsed + Number.EPSILON < interval
        ) {
          return;
        }

        const rawDelta =
          lastRunElapsed === null
            ? frame.rawDelta
            : Math.max(0, frame.elapsed - lastRunElapsed);
        lastRunElapsed = frame.elapsed;
        task({
          frame: sessionFrame,
          elapsed: frame.elapsed,
          rawDelta,
          // 低帧率是预算行为，允许对应步长；异常长帧仍截断，避免恢复时瞬移。
          delta: Math.min(rawDelta, Math.max(1 / 30, interval)),
        });
        sessionFrame += 1;
      },
      priority,
    );

    // World 可主动注销；即使遗漏，Session dispose 仍保证底层任务被移除。
    return this.resources.defer(() => upstreamRegistration.dispose());
  }
}

class RuntimeSessionPortalPort implements PortalPort {
  constructor(
    private readonly upstream: PortalPort,
    private readonly resources: RuntimeResourceScope,
  ) {}

  register(descriptor: PortalDescriptor): PortalRegistration {
    const upstreamRegistration = this.upstream.register(descriptor);
    const ownedRegistration = this.resources.defer(() =>
      upstreamRegistration.dispose(),
    );
    return {
      setProximity: (value) => upstreamRegistration.setProximity(value),
      preload: () => upstreamRegistration.preload(),
      request: () => upstreamRegistration.request(),
      dispose: () => ownedRegistration.dispose(),
    };
  }
}

class RuntimeSessionCollectionPort implements CollectionNavigationPort {
  constructor(
    private readonly upstream: CollectionNavigationPort,
    private readonly resources: RuntimeResourceScope,
  ) {}

  read(): CollectionNavigationSnapshot {
    return this.upstream.read();
  }

  focus(focusId: string | null): boolean {
    return this.upstream.focus(focusId);
  }

  subscribe(
    listener: (snapshot: CollectionNavigationSnapshot) => void,
  ): Registration {
    const upstreamRegistration = this.upstream.subscribe(listener);
    return this.resources.defer(() => upstreamRegistration.dispose());
  }

  exit(): void {
    this.upstream.exit();
  }
}

export interface WorldSessionDependencies {
  frame: FramePort;
  story: StoryProgressPort;
  collections: CollectionNavigationPort;
  input: InputPort;
  loader: LoaderPort;
  portals: PortalPort;
  rendering: RendererHost;
  reducedMotion: MediaQueryList;
  quality: QualityBudget;
  activity: ActivityLevel;
  signal?: AbortSignal;
  initialFocusId?: string | null;
  onFocusCommit?: (focusId: string | null) => void;
}

export interface WorldSession {
  readonly id: WorldId;
  readonly render: RuntimeRenderPort;
  readonly lifecycle: RuntimeLifecycle;
  readonly focus: RuntimeWorldFocus;
  diagnostics(): {
    cleanupCount: number;
    disposed: boolean;
  };
  dispose(): void;
}

export async function installWorldSession(
  worldId: WorldId,
  world: WorldModule,
  dependencies: WorldSessionDependencies,
): Promise<WorldSession> {
  if (world.manifest.id !== worldId) {
    throw new Error(
      `World id mismatch: registry "${worldId}", manifest "${world.manifest.id}".`,
    );
  }
  if (!world.manifest.supportedActivities.includes(dependencies.activity)) {
    throw new Error(
      `World "${worldId}" does not support activity "${dependencies.activity}".`,
    );
  }

  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  if (dependencies.signal?.aborted) controller.abort();
  dependencies.signal?.addEventListener("abort", abortFromParent, {
    once: true,
  });
  const resources = new RuntimeResourceScope();
  const render = new RuntimeRenderPort();
  const lifecycle = new RuntimeLifecycle(
    dependencies.activity,
    dependencies.quality,
  );
  const sessionFrame = new RuntimeSessionFramePort(
    dependencies.frame,
    resources,
    lifecycle,
  );
  const sessionPortals = new RuntimeSessionPortalPort(
    dependencies.portals,
    resources,
  );
  const sessionCollections = new RuntimeSessionCollectionPort(
    dependencies.collections,
    resources,
  );
  const focus = new RuntimeWorldFocus(
    dependencies.initialFocusId ?? null,
    dependencies.onFocusCommit ?? (() => undefined),
  );
  resources.defer(() => lifecycle.dispose());
  resources.defer(() => focus.dispose());
  resources.defer(() =>
    dependencies.signal?.removeEventListener("abort", abortFromParent),
  );

  try {
    // install 可能在 async import 或资源加载后才继续，前后都检查 abort 以防半安装泄漏。
    if (controller.signal.aborted) {
      throw new DOMException("World installation aborted.", "AbortError");
    }

    const installation = world.install({
      id: worldId,
      signal: controller.signal,
      manifest: world.manifest,
      frame: sessionFrame,
      resources,
      lifecycle,
      story: dependencies.story,
      collections: sessionCollections,
      input: dependencies.input,
      loader: dependencies.loader,
      focus,
      portals: sessionPortals,
      rendering: dependencies.rendering,
      render,
      reducedMotion: dependencies.reducedMotion,
    });
    let rejectAbort: (() => void) | null = null;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectAbort = () =>
        reject(new DOMException("World installation aborted.", "AbortError"));
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    try {
      await Promise.race([installation, aborted]);
    } finally {
      if (rejectAbort) {
        controller.signal.removeEventListener("abort", rejectAbort);
      }
    }

    if (controller.signal.aborted) {
      throw new DOMException("World installation aborted.", "AbortError");
    }
    if (!render.current()) {
      throw new Error("World installation did not publish a Render View.");
    }
  } catch (error) {
    controller.abort();
    resources.dispose();
    render.clear();
    throw error;
  }

  let disposed = false;
  return {
    id: worldId,
    render,
    lifecycle,
    focus,
    diagnostics: () => ({
      cleanupCount: resources.pendingCleanupCount,
      disposed,
    }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      controller.abort();
      resources.dispose();
      render.clear();
    },
  };
}
