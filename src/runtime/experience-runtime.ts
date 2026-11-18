// 顶层体验运行时：唯一拥有 renderer、RAF、输入监听、URL 同步和 World Session 切换。
// 具体 World 只安装到这里提供的 scope，不直接接管全局生命周期或地址栏状态。
import * as THREE from "three";
import type {
  InputPort,
  LoaderPort,
  WorldModule,
  WorldRegistry,
} from "./contracts";
import { CollectionDirector } from "./collection-director";
import { AdaptiveQualityController } from "./adaptive-quality";
import { FrameScheduler } from "./frame-scheduler";
import { PortalDirector } from "./portal-director";
import {
  applyDebugQualityOverride,
  readBrowserQualitySignals,
  selectInitialQualityBudget,
} from "./quality-budget";
import { ThreeRendererHost } from "./renderer-host";
import { RuntimeResourceScope } from "./resource-scope";
import { installRuntimeDiagnostics } from "./runtime-diagnostics";
import { DomStoryProgress } from "./story-progress";
import { WorldHistoryDirector } from "./world-history";
import {
  installWorldSession,
  type WorldSession,
} from "./world-session";
import type { KnownWorldId } from "../worlds/worlds.config";

type WorldHistoryCommit = "replace" | "push" | "traverse";

export async function startExperience(
  canvas: HTMLCanvasElement,
  initialWorld: WorldModule,
  registry: WorldRegistry = {},
): Promise<() => void> {
  // 这些服务跨 World 复用，避免切换世界时产生第二套 RAF、renderer 或全局监听。
  const loaderElement = document.querySelector<HTMLElement>("[data-loader]");
  const loaderBar = document.querySelector<HTMLElement>("[data-loader-bar]");
  const resources = new RuntimeResourceScope();
  const frame = new FrameScheduler();
  const story = new DomStoryProgress();
  const collections = new CollectionDirector();
  resources.defer(() => collections.dispose());
  let activeSession: WorldSession | null = null;
  let activeWorldId = initialWorld.manifest.id as KnownWorldId;
  let sessionGeneration = 0;
  let sessionsInstalled = 0;
  let sessionsDisposed = 0;
  let contextLost = false;
  const pointer = new THREE.Vector2();
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const isMobile = window.matchMedia("(max-width: 720px)").matches;
  let quality = applyDebugQualityOverride(
    selectInitialQualityBudget(
      readBrowserQualitySignals(reducedMotion, isMobile),
    ),
    window.location.search,
  );

  document.documentElement.dataset.webglBoot = "starting";
  document.documentElement.dataset.quality = quality.tier;

  let rendering: ThreeRendererHost;
  try {
    rendering = new ThreeRendererHost(canvas, quality);
  } catch (error) {
    document.body.classList.add("webgl-failed");
    loaderElement?.classList.add("is-hidden");
    console.error("WebGL initialization failed:", error);
    throw error;
  }

  document.documentElement.dataset.webglBoot = "running";

  const handleContextLost = (event: Event): void => {
    // Three.js 负责重建底层 GL 对象；Runtime 负责暂停业务帧与 World 活动状态。
    event.preventDefault();
    contextLost = true;
    document.documentElement.dataset.webglBoot = "context-lost";
    activeSession?.lifecycle.setActivity("distant");
    frame.stop();
  };
  const handleContextRestored = (): void => {
    contextLost = false;
    document.documentElement.dataset.webglBoot = "running";
    rendering.resize();
    activeSession?.lifecycle.setQuality(quality);
    if (!document.hidden) {
      activeSession?.lifecycle.setActivity("active");
      frame.start();
    }
  };
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);
  resources.defer(() => {
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener("webglcontextrestored", handleContextRestored);
  });

  const adaptiveQuality = new AdaptiveQualityController(quality, (budget) => {
    quality = budget;
    document.documentElement.dataset.quality = budget.tier;
    document.documentElement.dataset.qualitySource = "adaptive";
    rendering.setQuality(budget);
    activeSession?.lifecycle.setQuality(budget);
  });
  const qualityRegistration = frame.add("effects", (frameContext) => {
    adaptiveQuality.sample(
      frameContext.rawDelta,
      frameContext.elapsed,
      !document.hidden &&
        !document.documentElement.dataset.portalJourney &&
        activeSession?.lifecycle.activity === "active",
    );
  }, -100);
  resources.defer(() => qualityRegistration.dispose());

  const worldPreloads = new Map<string, Promise<void>>();
  const preloadWorld = (targetWorldId: string): Promise<void> => {
    const existing = worldPreloads.get(targetWorldId);
    if (existing) return existing;
    const entry = registry[targetWorldId];
    if (!entry || targetWorldId === activeWorldId) return Promise.resolve();

    // 强进入意图出现后只预取代码与首屏资源，不提前安装 World Session 或占用 GPU。
    const assetIds = new Set([
      entry.manifest.entryPoster,
      ...entry.manifest.assets.critical,
    ]);
    const preload = Promise.all([
      entry.load().then(() => undefined),
      ...[...assetIds].map(async (assetId) => {
        const path = assetId.replace(/^\/+/, "");
        const url = new URL(`${import.meta.env.BASE_URL}${path}`, location.href);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to preload World asset: ${url.href}`);
        }
      }),
    ])
      .then(() => undefined)
      .catch((error) => {
        worldPreloads.delete(targetWorldId);
        throw error;
      });
    worldPreloads.set(targetWorldId, preload);
    return preload;
  };

  const portals = new PortalDirector(
    () =>
      new Promise((resolve) => {
        // Portal 转场覆盖 canvas 前先抓当前帧，失败时也能用快照回滚视觉状态。
        const view = activeSession?.render.current();
        if (view?.render) view.render();
        else if (view) rendering.renderer.render(view.scene, view.camera);
        canvas.toBlob(resolve, "image/webp", 0.88);
      }),
    reducedMotion,
    async (targetWorldId, focusId, signal, source) => {
      const entry = registry[targetWorldId];
      if (!entry || targetWorldId === activeWorldId) return false;
      const target = await entry.load();
      if (target.manifest !== entry.manifest) {
        throw new Error(
          `Registry Manifest mismatch for World "${targetWorldId}".`,
        );
      }
      await installWorld(
        targetWorldId as KnownWorldId,
        target,
        "near",
        source === "portal" ? "push" : "traverse",
        focusId,
        signal,
      );
      return true;
    },
    () => quality.portalMode,
    preloadWorld,
  );
  resources.defer(() => portals.dispose());

  const worldHistory = new WorldHistoryDirector(
    () => ({
      worldId: activeWorldId,
      focusId: activeSession?.focus.read() ?? null,
    }),
    (targetWorldId, focusId) =>
      portals.navigateFromHistory(targetWorldId, focusId),
    (focusId) => activeSession?.focus.restore(focusId) ?? focusId === null,
  );
  resources.defer(() => worldHistory.dispose());

  const manager = new THREE.LoadingManager();
  const loader: LoaderPort = {
    manager,
    hide: () => loaderElement?.classList.add("is-hidden"),
  };

  manager.onProgress = (_url, loaded, total) => {
    if (loaderBar) {
      loaderBar.style.width = `${Math.max(8, (loaded / total) * 100)}%`;
    }
  };
  manager.onLoad = () => {
    window.setTimeout(loader.hide, 350);
  };
  manager.onError = (url) => {
    console.warn(`Texture failed to load: ${url}`);
  };

  const input: InputPort = { pointer };
  const handlePointer = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
  };
  const handleResize = () => {
    rendering.resize();
    story.refresh();
    const view = activeSession?.render.current();
    if (view?.camera instanceof THREE.PerspectiveCamera) {
      view.camera.aspect = window.innerWidth / window.innerHeight;
      view.camera.fov = window.innerWidth <= 720 ? 54 : 46;
      view.camera.updateProjectionMatrix();
    } else if (view?.camera instanceof THREE.OrthographicCamera) {
      const frustum = Number(view.camera.userData.frustum ?? 78);
      const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
      view.camera.left = -frustum * aspect;
      view.camera.right = frustum * aspect;
      view.camera.top = frustum;
      view.camera.bottom = -frustum;
      view.camera.updateProjectionMatrix();
    }
  };
  const handleVisibility = () => {
    if (document.hidden) {
      activeSession?.lifecycle.setActivity("distant");
      frame.stop();
    } else if (!contextLost) {
      activeSession?.lifecycle.setActivity("active");
      frame.start();
    }
  };

  window.addEventListener("pointermove", handlePointer, { passive: true });
  window.addEventListener("resize", handleResize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  resources.defer(() =>
    window.removeEventListener("pointermove", handlePointer),
  );
  resources.defer(() => window.removeEventListener("resize", handleResize));
  resources.defer(() =>
    document.removeEventListener("visibilitychange", handleVisibility),
  );

  const installWorld = async (
    worldId: KnownWorldId,
    world: WorldModule,
    activity: "active" | "near",
    historyCommit: WorldHistoryCommit,
    initialFocusId: string | null,
    signal?: AbortSignal,
  ): Promise<void> => {
    // 安装期先暴露目标 World，让宿主壳层立即套用对应显隐规则；失败时再由下方回滚。
    const previousWorldDataset = document.documentElement.dataset.world;
    document.documentElement.dataset.world = worldId;
    // 先让目标 World 完整发布 Render View，再替换 activeSession；这样失败时来源世界仍在。
    let nextSession: WorldSession | null = null;
    const renderer = rendering.renderer;
    const previousRendererState = {
      toneMapping: renderer.toneMapping,
      toneMappingExposure: renderer.toneMappingExposure,
      shadowEnabled: renderer.shadowMap.enabled,
      shadowType: renderer.shadowMap.type,
      autoClear: renderer.autoClear,
    };
    try {
      rendering.resetWorldState();
      nextSession = await installWorldSession(worldId, world, {
        frame,
        story,
        collections,
        input,
        loader,
        portals,
        rendering,
        reducedMotion,
        quality,
        activity,
        signal,
        initialFocusId,
        onFocusCommit: (focusId) => {
          if (activeSession?.id === worldId) {
            worldHistory.push(worldId, focusId);
          }
        },
      });
      // World Session、地址栏和输入所有权只在目标首帧就绪后一起提交。
      const committedFocusId = nextSession.focus.read();
      if (historyCommit === "push") {
        worldHistory.push(worldId, committedFocusId);
      } else if (historyCommit === "replace") {
        worldHistory.replace(worldId, committedFocusId);
      }
    } catch (error) {
      nextSession?.dispose();
      renderer.toneMapping = previousRendererState.toneMapping;
      renderer.toneMappingExposure =
        previousRendererState.toneMappingExposure;
      renderer.shadowMap.enabled = previousRendererState.shadowEnabled;
      renderer.shadowMap.type = previousRendererState.shadowType;
      renderer.autoClear = previousRendererState.autoClear;
      renderer.setRenderTarget(null);
      if (previousWorldDataset === undefined) {
        delete document.documentElement.dataset.world;
      } else {
        document.documentElement.dataset.world = previousWorldDataset;
      }
      throw error;
    }

    if (!nextSession) {
      throw new Error(`World "${worldId}" did not create a Session.`);
    }

    const previousSession = activeSession;
    activeSession = nextSession;
    activeWorldId = worldId;
    sessionGeneration += 1;
    sessionsInstalled += 1;
    document.documentElement.dataset.world = worldId;
    nextSession.lifecycle.setActivity(document.hidden ? "distant" : "active");
    handleResize();
    // 目标世界已经接管渲染后再释放旧世界，避免转场中出现空白帧。
    if (previousSession) {
      previousSession.dispose();
      sessionsDisposed += 1;
    }
  };

  try {
    await installWorld(
      initialWorld.manifest.id as KnownWorldId,
      initialWorld,
      "active",
      "replace",
      worldHistory.readLocation().focusId,
    );
  } catch (error) {
    resources.dispose();
    rendering.dispose();
    throw error;
  }
  worldHistory.start();

  const renderRegistration = frame.add("render", () => {
    const view = activeSession?.render.current();
    if (!view) return;
    if (view.render) view.render();
    else rendering.renderer.render(view.scene, view.camera);
  });
  resources.defer(() => renderRegistration.dispose());

  const diagnostics = installRuntimeDiagnostics({
    renderer: rendering.renderer,
    readSnapshot: () => ({
      activeWorldId,
      context: contextLost ? "lost" : "active",
      frameTasks: frame.taskCount,
      frameRunning: frame.isRunning,
      runtimeCleanups: resources.pendingCleanupCount,
      sessionCleanups: activeSession?.diagnostics().cleanupCount ?? 0,
      sessionGeneration,
      sessionsInstalled,
      sessionsDisposed,
    }),
    navigate: (targetWorldId) =>
      targetWorldId === activeWorldId
        ? Promise.resolve(true)
        : portals.navigateFromHistory(targetWorldId, null),
    loseContext: () => rendering.renderer.forceContextLoss(),
    restoreContext: () => rendering.renderer.forceContextRestore(),
  });
  if (diagnostics) resources.defer(() => diagnostics.dispose());

  handleResize();
  frame.start();

  if (quality.preloadDepth === "next-world") {
    const preload = () => {
      const candidate = Object.values(registry).find(
        (entry) => entry.manifest.id !== activeWorldId,
      );
      if (candidate) void candidate.load().catch(() => undefined);
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preload, { timeout: 2500 });
    } else {
      globalThis.setTimeout(preload, 1200);
    }
  }

  window.setTimeout(() => {
    if (!loaderElement?.classList.contains("is-hidden")) loader.hide();
  }, 5000);

  return () => {
    frame.stop();
    if (activeSession) {
      activeSession.dispose();
      sessionsDisposed += 1;
    }
    resources.dispose();
    rendering.dispose();
  };
}
