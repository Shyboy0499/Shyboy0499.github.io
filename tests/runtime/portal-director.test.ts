// Portal Journey 回归测试：覆盖预加载、跨 World 状态接力、回滚和资源清理。
// 测试使用降级动画时长，避免依赖真实浏览器渲染。
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortalDirector } from "../../src/runtime/portal-director";

const reducedMotion = {
  matches: true,
  media: "",
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
} satisfies MediaQueryList;

const standardMotion = {
  ...reducedMotion,
  matches: false,
} satisfies MediaQueryList;

beforeEach(() => {
  document.body.innerHTML = `
    <div data-portal-layer hidden>
      <button data-portal-trigger>
        <span data-portal-eyebrow></span>
        <strong data-portal-label></strong>
        <small data-portal-target></small>
      </button>
      <div data-portal-transition aria-hidden="true">
        <img data-portal-snapshot>
        <p data-portal-status></p>
      </div>
    </div>
  `;
});

describe("PortalDirector", () => {
  it("keeps the source World visible for Portal anticipation before capture", async () => {
    vi.useFakeTimers();
    const capture = vi.fn(async () => null);
    const director = new PortalDirector(
      capture,
      standardMotion,
      async () => true,
    );
    const portal = director.register({
      id: "anticipation-portal",
      targetWorldId: "target",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Target",
    });
    portal.setProximity(1);

    portal.request();
    expect(
      document.querySelector<HTMLElement>("[data-portal-layer]")?.dataset.state,
    ).toBe("preparing");
    expect(capture).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(419);
    expect(capture).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(capture).toHaveBeenCalledOnce();

    await vi.runAllTimersAsync();
    director.dispose();
    vi.useRealTimers();
  });

  it("preloads the registered target without starting a Journey", async () => {
    const navigate = vi.fn(async () => true);
    const preloadWorld = vi.fn(async () => undefined);
    const director = new PortalDirector(
      async () => null,
      reducedMotion,
      navigate,
      () => "snapshot",
      preloadWorld,
    );
    const portal = director.register({
      id: "test-portal",
      targetWorldId: "target",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Target",
    });

    portal.preload();
    await Promise.resolve();

    expect(preloadWorld).toHaveBeenCalledWith("target");
    expect(navigate).not.toHaveBeenCalled();
    director.dispose();
  });

  it("rolls back to the armed source Portal when the target fails", async () => {
    vi.useFakeTimers();
    const navigate = vi.fn(async () => false);
    const director = new PortalDirector(
      async () => null,
      reducedMotion,
      navigate,
    );
    const portal = director.register({
      id: "test-portal",
      targetWorldId: "missing",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Missing",
    });
    portal.setProximity(1);

    portal.request();
    await vi.runAllTimersAsync();

    const root = document.querySelector<HTMLElement>("[data-portal-layer]");
    expect(navigate).toHaveBeenCalledWith(
      "missing",
      null,
      expect.any(AbortSignal),
      "portal",
    );
    expect(root?.dataset.state).toBe("armed");
    expect(document.body.classList.contains("portal-journey-active")).toBe(
      false,
    );
    director.dispose();
    vi.useRealTimers();
  });

  it("cancels pending journey work when disposed", async () => {
    vi.useFakeTimers();
    let resolveSnapshot: (blob: Blob | null) => void = () => undefined;
    const snapshot = new Promise<Blob | null>((resolve) => {
      resolveSnapshot = resolve;
    });
    const navigate = vi.fn(async () => true);
    const director = new PortalDirector(
      async () => snapshot,
      reducedMotion,
      navigate,
    );
    const portal = director.register({
      id: "test-portal",
      targetWorldId: "target",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Target",
    });
    portal.setProximity(1);
    portal.request();

    director.dispose();
    resolveSnapshot(null);
    await Promise.resolve();
    await vi.runAllTimersAsync();

    expect(navigate).not.toHaveBeenCalled();
    expect(document.body.classList.contains("portal-journey-active")).toBe(
      false,
    );
    vi.useRealTimers();
  });

  it("aborts target installation before rolling back an escaped Journey", async () => {
    vi.useFakeTimers();
    const navigationSignals: AbortSignal[] = [];
    let targetCommitted = false;
    const navigate = vi.fn(
      async (
        _targetWorldId: string,
        _focusId: string | null,
        signal: AbortSignal,
      ) => {
        navigationSignals.push(signal);
        return new Promise<boolean>((resolve) => {
          signal.addEventListener(
            "abort",
            () => {
              resolve(false);
            },
            { once: true },
          );
        }).then((committed) => {
          targetCommitted = committed;
          return committed;
        });
      },
    );
    const director = new PortalDirector(
      async () => null,
      reducedMotion,
      navigate,
    );
    const portal = director.register({
      id: "source-portal",
      targetWorldId: "target",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Target",
    });
    portal.setProximity(1);
    portal.request();

    await vi.advanceTimersByTimeAsync(60);
    expect(navigationSignals).toHaveLength(1);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await vi.advanceTimersByTimeAsync(40);

    expect(navigationSignals[0]?.aborted).toBe(true);
    expect(targetCommitted).toBe(false);
    expect(
      document.querySelector<HTMLElement>("[data-portal-layer]")?.dataset.state,
    ).toBe("armed");
    expect(document.body.classList.contains("portal-journey-active")).toBe(
      false,
    );
    director.dispose();
    vi.useRealTimers();
  });

  it("skips snapshot capture for the static transition budget", async () => {
    vi.useFakeTimers();
    const capture = vi.fn(async () => null);
    const director = new PortalDirector(
      capture,
      reducedMotion,
      async () => true,
      () => "static",
    );
    const portal = director.register({
      id: "test-portal",
      targetWorldId: "target",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Target",
    });
    portal.setProximity(1);
    portal.request();
    await vi.runAllTimersAsync();

    expect(capture).not.toHaveBeenCalled();
    director.dispose();
    vi.useRealTimers();
  });

  it("keeps the crossing active when the target World registers its Portal", async () => {
    vi.useFakeTimers();
    let releaseNavigation: (value: boolean) => void = () => undefined;
    const navigation = new Promise<boolean>((resolve) => {
      releaseNavigation = resolve;
    });
    const targetStates: string[] = [];
    let director: PortalDirector;
    const navigate = vi.fn(async () => {
      director.register({
        id: "target-portal",
        targetWorldId: "next",
        eyebrow: "Portal",
        label: "Continue",
        targetLabel: "Next",
        transitionStyle: "threshold",
        onStateChange: (state) => targetStates.push(state),
      });
      return navigation;
    });
    director = new PortalDirector(async () => null, reducedMotion, navigate);
    const source = director.register({
      id: "source-portal",
      targetWorldId: "target",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Target",
      transitionStyle: "tidal",
    });
    source.setProximity(1);
    source.request();

    await vi.advanceTimersByTimeAsync(60);
    const root = document.querySelector<HTMLElement>("[data-portal-layer]");
    expect(root?.dataset.state).toBe("crossing");
    expect(root?.dataset.transition).toBe("tidal");
    expect(targetStates).toContain("crossing");

    releaseNavigation(true);
    await vi.runAllTimersAsync();
    expect(targetStates).toContain("arriving");
    expect(root?.dataset.state).toBe("dormant");
    expect(root?.dataset.transition).toBe("threshold");
    director.dispose();
    vi.useRealTimers();
  });

  it("keeps the original source when a Journey is replaced after target registration", async () => {
    vi.useFakeTimers();
    let director: PortalDirector;
    let replacementJourney: Promise<boolean> | null = null;
    let navigationCount = 0;
    const navigate = vi.fn(async () => {
      navigationCount += 1;
      if (navigationCount === 1) {
        director.register({
          id: "target-portal",
          targetWorldId: "next",
          eyebrow: "Portal",
          label: "Continue",
          targetLabel: "Next",
          transitionStyle: "threshold",
        });
        replacementJourney = director.navigateFromHistory("previous", null);
      }
      return false;
    });
    director = new PortalDirector(async () => null, reducedMotion, navigate);
    const source = director.register({
      id: "source-portal",
      targetWorldId: "target",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Target",
      transitionStyle: "tidal",
    });
    source.setProximity(1);
    source.request();

    await vi.runAllTimersAsync();
    await expect(replacementJourney).resolves.toBe(false);

    const root = document.querySelector<HTMLElement>("[data-portal-layer]");
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(root?.dataset.state).toBe("armed");
    expect(root?.dataset.transition).toBe("tidal");
    director.dispose();
    vi.useRealTimers();
  });

  it("does not roll back after the target World has committed", async () => {
    vi.useFakeTimers();
    let director: PortalDirector;
    const navigate = vi.fn(async () => {
      director.register({
        id: "target-portal",
        targetWorldId: "next",
        eyebrow: "Portal",
        label: "Continue",
        targetLabel: "Next",
        transitionStyle: "threshold",
      });
      return true;
    });
    director = new PortalDirector(async () => null, reducedMotion, navigate);
    const source = director.register({
      id: "source-portal",
      targetWorldId: "target",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Target",
      transitionStyle: "tidal",
    });
    source.setProximity(1);
    source.request();

    await vi.advanceTimersByTimeAsync(60);
    const root = document.querySelector<HTMLElement>("[data-portal-layer]");
    expect(root?.dataset.state).toBe("arriving");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await vi.advanceTimersByTimeAsync(20);

    expect(root?.dataset.state).toBe("dormant");
    expect(root?.dataset.transition).toBe("threshold");
    director.dispose();
    vi.useRealTimers();
  });

  it("uses the registered Portal origin for the tidal transition", async () => {
    vi.useFakeTimers();
    const director = new PortalDirector(
      async () => null,
      reducedMotion,
      async () => true,
    );
    const portal = director.register({
      id: "tidal-portal",
      targetWorldId: "archipelago",
      eyebrow: "Portal",
      label: "Enter",
      targetLabel: "Archipelago",
      transitionStyle: "tidal",
      getTransitionOrigin: () => ({ x: 120, y: 240 }),
    });
    portal.setProximity(1);
    portal.request();
    await vi.advanceTimersByTimeAsync(0);

    const root = document.querySelector<HTMLElement>("[data-portal-layer]");
    expect(root?.dataset.transition).toBe("tidal");
    expect(root?.style.getPropertyValue("--portal-origin-x")).toBe("120px");
    expect(root?.style.getPropertyValue("--portal-origin-y")).toBe("240px");

    await vi.runAllTimersAsync();
    director.dispose();
    vi.useRealTimers();
  });

  it("restores browser history through the same cancellable Journey", async () => {
    vi.useFakeTimers();
    const navigate = vi.fn(async () => true);
    const director = new PortalDirector(
      async () => null,
      reducedMotion,
      navigate,
    );
    director.register({
      id: "current-portal",
      targetWorldId: "next",
      eyebrow: "Portal",
      label: "Continue",
      targetLabel: "Next",
    });

    const restored = director.navigateFromHistory(
      "previous",
      "claude-nexus",
    );
    await vi.runAllTimersAsync();

    await expect(restored).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith(
      "previous",
      "claude-nexus",
      expect.any(AbortSignal),
      "history",
    );
    director.dispose();
    vi.useRealTimers();
  });
});
