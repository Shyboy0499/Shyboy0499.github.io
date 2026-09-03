// Archipelago 原生 World Module 契约测试：验证共享 renderer、Runtime 帧注册和资源回收。
// 测试隔离真实 WebGL 场景，只检查 World Module 与 scope 之间的 Interface。
import * as THREE from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorldScope } from "../../src/runtime/contracts";
import { archipelagoManifest } from "../../src/worlds/archipelago/manifest";

const world = {
  scene: new THREE.Scene(),
  camera: new THREE.OrthographicCamera(),
  update: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  setPaused: vi.fn(),
  setQuality: vi.fn(),
  leave: vi.fn(),
  fastTravelTo: vi.fn(() => true),
  onOpenProject: null as ((islandId: string, projectId: string) => void) | null,
  onFocusChange: null as ((islandId: string | null) => void) | null,
  onPortalPreload: null as ((targetWorldId: string) => void) | null,
  onPortalRequest: null as ((targetWorldId: string) => void) | null,
};
const createWorld = vi.fn(() => world);
const app = { mount: vi.fn(), unmount: vi.fn() };

vi.mock("vue", () => ({
  createApp: vi.fn(() => app),
  reactive: <T>(value: T) => value,
  computed: <T>(read: () => T) => ({ get value() { return read(); } }),
}));
vi.mock("../../src/worlds/archipelago/ui/App.vue", () => ({
  default: {},
}));
vi.mock("../../src/worlds/archipelago/scene/world/island-world", () => ({
  createWorld,
}));

const { archipelagoWorld } = await import("../../src/worlds/archipelago");

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

function scope(): WorldScope {
  const cleanups: Array<() => void> = [];
  let renderView: Parameters<WorldScope["render"]["publish"]>[0] | null = null;
  return {
    id: archipelagoManifest.id,
    manifest: archipelagoManifest,
    signal: new AbortController().signal,
    resources: {
      defer(cleanup) {
        cleanups.push(cleanup);
        return {
          dispose() {
            const index = cleanups.indexOf(cleanup);
            if (index >= 0) cleanups.splice(index, 1);
          },
        };
      },
      dispose() {
        for (const cleanup of cleanups.splice(0).reverse()) cleanup();
      },
    },
    frame: { add: vi.fn(() => ({ dispose: vi.fn() })) },
    story: { read: vi.fn(), refresh: vi.fn() },
    collections: {
      read: vi.fn(),
      focus: vi.fn(() => true),
      subscribe: vi.fn(() => ({ dispose: vi.fn() })),
      exit: vi.fn(),
    },
    input: { pointer: new THREE.Vector2() },
    loader: { manager: new THREE.LoadingManager(), hide: vi.fn() },
    focus: {
      read: vi.fn(() => null),
      register: vi.fn((apply) => {
        apply(null);
        return { dispose: vi.fn() };
      }),
      commit: vi.fn(),
    },
    portals: {
      register: vi.fn(() => ({
        dispose: vi.fn(),
        preload: vi.fn(),
        request: vi.fn(),
        setProximity: vi.fn(),
      })),
    },
    render: {
      publish: vi.fn((view) => {
        renderView = view;
      }),
      current: vi.fn(() => renderView),
    },
    rendering: {
      renderer: {} as THREE.WebGLRenderer,
      isMobile: false,
      setQuality: vi.fn(),
      resetWorldState: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    },
    lifecycle: {
      activity: "active",
      quality: {
        tier: "balanced",
        pixelRatioCap: 1.5,
        shadows: "reduced",
        postProcessing: "reduced",
        effectDensity: 0.72,
        animationRate: 60,
        portalMode: "snapshot",
        preloadDepth: "critical-only",
      },
      onActivity: vi.fn(() => ({ dispose: vi.fn() })),
      onQuality: vi.fn(() => ({ dispose: vi.fn() })),
    },
    reducedMotion: mediaQuery,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  world.onOpenProject = null;
  world.onFocusChange = null;
  world.onPortalPreload = null;
  world.onPortalRequest = null;
  document.body.innerHTML = "";
});

describe("archipelagoWorld native module", () => {
  it("uses the Runtime renderer and publishes the native scene", async () => {
    const worldScope = scope();

    await archipelagoWorld.install(worldScope);

    expect(createWorld).toHaveBeenCalledWith(
      worldScope.rendering.renderer,
      expect.any(Array),
      true,
    );
    expect(worldScope.frame.add).toHaveBeenCalledWith(
      "animation",
      expect.any(Function),
    );
    expect(worldScope.render.publish).toHaveBeenCalledWith({
      scene: world.scene,
      camera: world.camera,
      render: expect.any(Function),
    });
    expect(world.update).toHaveBeenCalledWith(0);
    expect(world.render).toHaveBeenCalledOnce();
    expect(worldScope.loader.hide).toHaveBeenCalledOnce();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("disposes frame, lifecycle, Vue and scene resources with the scope", async () => {
    const worldScope = scope();
    await archipelagoWorld.install(worldScope);
    const frameRegistration = vi.mocked(worldScope.frame.add).mock.results[0]
      .value;
    const activityRegistration = vi.mocked(
      worldScope.lifecycle.onActivity,
    ).mock.results[0].value;
    const qualityRegistration = vi.mocked(
      worldScope.lifecycle.onQuality,
    ).mock.results[0].value;

    worldScope.resources.dispose();

    expect(frameRegistration.dispose).toHaveBeenCalledOnce();
    expect(activityRegistration.dispose).toHaveBeenCalledOnce();
    expect(qualityRegistration.dispose).toHaveBeenCalledOnce();
    expect(app.unmount).toHaveBeenCalledOnce();
    expect(world.dispose).toHaveBeenCalledOnce();
    expect(document.querySelector(".archipelago-ui-root")).toBeNull();
  });
});
