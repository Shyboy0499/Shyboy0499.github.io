import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type {
  FrameContext,
  FramePhase,
  QualityBudget,
  WorldManifest,
  WorldModule,
  WorldScope,
} from "../../src/runtime/contracts";
import { installWorldSession } from "../../src/runtime/world-session";

const manifest: WorldManifest = {
  id: "test-world",
  title: "Test World",
  entryPoster: "poster",
  supportedActivities: ["active", "near", "distant"],
  assets: { critical: [], deferred: [], quality: {} },
  budgets: { initialTransferKb: 1, estimatedGpuMb: {} },
  features: {
    audio: false,
    physics: false,
    postProcessing: false,
    livePortalBlend: false,
  },
};

const quality: QualityBudget = {
  tier: "balanced",
  pixelRatioCap: 1.5,
  shadows: "reduced",
  postProcessing: "reduced",
  effectDensity: 0.72,
  animationRate: 60,
  portalMode: "snapshot",
  preloadDepth: "critical-only",
};

const mediaQuery = {
  matches: false,
  media: "",
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
} satisfies MediaQueryList;

function dependencies() {
  return {
    frame: { add: vi.fn(() => ({ dispose: vi.fn() })) },
    story: {
      read: vi.fn(() => ({ progress: 0, activeId: "test" })),
      refresh: vi.fn(),
    },
    collections: {
      read: vi.fn(() => ({
        mode: "overview" as const,
        collectionId: null,
        focusId: null,
        itemIndex: 0,
        itemCount: 0,
      })),
      focus: vi.fn(() => true),
      subscribe: vi.fn(() => ({ dispose: vi.fn() })),
      exit: vi.fn(),
    },
    input: { pointer: new THREE.Vector2() },
    loader: { manager: new THREE.LoadingManager(), hide: vi.fn() },
    portals: { register: vi.fn() },
    rendering: {
      renderer: {} as THREE.WebGLRenderer,
      isMobile: false,
      setQuality: vi.fn(),
      resetWorldState: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    },
    reducedMotion: mediaQuery,
    quality,
    activity: "active" as const,
  };
}

function moduleWith(
  install: (scope: WorldScope) => Promise<void> | void,
): WorldModule {
  return {
    manifest,
    install: async (scope) => install(scope),
  };
}

describe("installWorldSession", () => {
  it("rolls back every registration when installation fails", async () => {
    const cleanup = vi.fn();
    const world = moduleWith((scope) => {
      scope.resources.defer(cleanup);
      throw new Error("install failed");
    });

    await expect(
      installWorldSession("test-world", world, dependencies()),
    ).rejects.toThrow("install failed");
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("requires exactly one published Render View", async () => {
    const missing = moduleWith(() => undefined);
    await expect(
      installWorldSession("test-world", missing, dependencies()),
    ).rejects.toThrow("did not publish");

    const duplicate = moduleWith((scope) => {
      const scene = new THREE.Scene();
      const camera = new THREE.Camera();
      scope.render.publish({ scene, camera });
      scope.render.publish({ scene, camera });
    });
    await expect(
      installWorldSession("test-world", duplicate, dependencies()),
    ).rejects.toThrow("only one Render View");
  });

  it("makes disposal terminal for late asynchronous resources", async () => {
    const earlyCleanup = vi.fn();
    const lateCleanup = vi.fn();
    let installedScope!: WorldScope;
    const world = moduleWith((scope) => {
      installedScope = scope;
      scope.resources.defer(earlyCleanup);
      scope.render.publish({
        scene: new THREE.Scene(),
        camera: new THREE.Camera(),
      });
    });

    const session = await installWorldSession(
      "test-world",
      world,
      dependencies(),
    );
    session.dispose();
    session.dispose();
    installedScope.resources.defer(lateCleanup);

    expect(earlyCleanup).toHaveBeenCalledOnce();
    expect(lateCleanup).toHaveBeenCalledOnce();
    expect(installedScope.signal.aborted).toBe(true);
  });

  it("releases every repeated World Session", async () => {
    const cleanup = vi.fn();
    const world = moduleWith((scope) => {
      scope.resources.defer(cleanup);
      scope.render.publish({
        scene: new THREE.Scene(),
        camera: new THREE.Camera(),
      });
    });

    for (let index = 0; index < 3; index += 1) {
      const session = await installWorldSession(
        "test-world",
        world,
        dependencies(),
      );
      session.dispose();
    }

    expect(cleanup).toHaveBeenCalledTimes(3);
  });

  it("aborts installation and rejects late registrations from a cancelled Journey", async () => {
    const controller = new AbortController();
    const lateCleanup = vi.fn();
    let releaseInstall: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseInstall = resolve;
    });
    let installedScope!: WorldScope;
    const world = moduleWith(async (scope) => {
      installedScope = scope;
      await gate;
      scope.resources.defer(lateCleanup);
      scope.render.publish({
        scene: new THREE.Scene(),
        camera: new THREE.Camera(),
      });
    });
    const installation = installWorldSession("test-world", world, {
      ...dependencies(),
      signal: controller.signal,
    });

    controller.abort();
    await expect(installation).rejects.toMatchObject({ name: "AbortError" });
    releaseInstall();
    await Promise.resolve();

    expect(installedScope.signal.aborted).toBe(true);
    expect(lateCleanup).toHaveBeenCalledOnce();
  });

  it("owns World frame registrations and applies the Session frame budget", async () => {
    let runFrame: ((frame: FrameContext) => void) | null = null;
    const disposeFrame = vi.fn();
    const sessionDependencies = dependencies();
    sessionDependencies.frame.add = vi.fn(
      (_phase: FramePhase, task: (frame: FrameContext) => void) => {
        runFrame = task;
        return { dispose: disposeFrame };
      },
    );
    const update = vi.fn();
    const world = moduleWith((scope) => {
      scope.frame.add("animation", update);
      scope.render.publish({
        scene: new THREE.Scene(),
        camera: new THREE.Camera(),
      });
    });
    const session = await installWorldSession("test-world", world, {
      ...sessionDependencies,
      quality: { ...quality, animationRate: 30 },
    });
    const tick = (frame: number, elapsed: number) =>
      runFrame?.({ frame, elapsed, rawDelta: 0.016, delta: 0.016 });

    tick(0, 0);
    tick(1, 0.016);
    tick(2, 0.034);

    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]?.[0].rawDelta).toBeCloseTo(0.034);

    session.lifecycle.setActivity("distant");
    tick(3, 0.08);
    session.lifecycle.setActivity("active");
    tick(4, 0.096);
    expect(update).toHaveBeenCalledTimes(3);

    session.dispose();
    expect(disposeFrame).toHaveBeenCalledOnce();
  });

  it("owns Portal and collection registrations created by a World", async () => {
    const disposePortal = vi.fn();
    const disposeCollection = vi.fn();
    const sessionDependencies = dependencies();
    sessionDependencies.portals.register.mockReturnValue({
      setProximity: vi.fn(),
      preload: vi.fn(),
      request: vi.fn(),
      dispose: disposePortal,
    });
    sessionDependencies.collections.subscribe.mockReturnValue({
      dispose: disposeCollection,
    });
    const world = moduleWith((scope) => {
      scope.portals.register({
        id: "test-portal",
        targetWorldId: "target",
        eyebrow: "Portal",
        label: "Enter",
        targetLabel: "Target",
      });
      scope.collections.subscribe(() => undefined);
      scope.render.publish({
        scene: new THREE.Scene(),
        camera: new THREE.Camera(),
      });
    });

    const session = await installWorldSession(
      "test-world",
      world,
      sessionDependencies,
    );
    session.dispose();

    expect(disposePortal).toHaveBeenCalledOnce();
    expect(disposeCollection).toHaveBeenCalledOnce();
  });
});
