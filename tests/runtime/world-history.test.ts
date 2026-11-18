// World 历史回归测试：覆盖 Portal 提交、popstate 恢复、失败回滚与未知 URL。
// 这里替换事务性导航回调，不创建真实 WebGL World Session。
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorldHistoryDirector } from "../../src/runtime/world-history";
import type { KnownWorldId } from "../../src/worlds/worlds.config";

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("WorldHistoryDirector", () => {
  it("pushes a new entry only for a committed Portal Journey", () => {
    const director = new WorldHistoryDirector(
      () => ({ worldId: "cosmic", focusId: null }),
      async () => true,
      () => true,
    );

    director.replace("cosmic");
    director.push("studio", "claude-nexus");

    expect(window.location.search).toBe(
      "?world=studio&focus=claude-nexus",
    );
    expect(window.history.state).toMatchObject({
      qiunerWorld: "studio",
      qiunerFocus: "claude-nexus",
    });
    director.dispose();
  });

  it("restores a valid popstate target through the navigation callback", async () => {
    let activeWorldId: KnownWorldId = "cosmic";
    const navigate = vi.fn(async (targetWorldId: KnownWorldId) => {
      activeWorldId = targetWorldId;
      return true;
    });
    const director = new WorldHistoryDirector(
      () => ({ worldId: activeWorldId, focusId: null }),
      navigate,
      () => true,
    );
    director.start();
    window.history.pushState({}, "", "/?world=linework");

    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("linework", null),
    );

    expect(activeWorldId).toBe("linework");
    expect(window.location.search).toBe("?world=linework");
    director.dispose();
  });

  it("replaces the traversed entry with the surviving source after failure", async () => {
    const navigate = vi.fn(async () => false);
    const director = new WorldHistoryDirector(
      () => ({ worldId: "cosmic", focusId: null }),
      navigate,
      () => true,
    );
    director.start();
    window.history.pushState({}, "", "/?world=studio");

    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("studio", null),
    );
    await vi.waitFor(() => expect(window.location.search).toBe(""));

    expect(window.history.state).toMatchObject({ qiunerWorld: "cosmic" });
    director.dispose();
  });

  it("normalizes an unknown World id to Cosmic without starting a Journey", async () => {
    const navigate = vi.fn(async () => true);
    const director = new WorldHistoryDirector(
      () => ({ worldId: "cosmic", focusId: null }),
      navigate,
      () => true,
    );
    director.start();
    window.history.pushState({}, "", "/?world=missing");

    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() => expect(window.location.search).toBe(""));

    expect(navigate).not.toHaveBeenCalled();
    expect(window.history.state).toMatchObject({ qiunerWorld: "cosmic" });
    director.dispose();
  });

  it("ignores a stale failed restore after a newer history target wins", async () => {
    let activeWorldId: KnownWorldId = "cosmic";
    const resolutions = new Map<
      KnownWorldId,
      (committed: boolean) => void
    >();
    const navigate = vi.fn(
      (targetWorldId: KnownWorldId) =>
        new Promise<boolean>((resolve) => {
          resolutions.set(targetWorldId, (committed) => {
            if (committed) activeWorldId = targetWorldId;
            resolve(committed);
          });
        }),
    );
    const director = new WorldHistoryDirector(
      () => ({ worldId: activeWorldId, focusId: null }),
      navigate,
      () => true,
    );
    director.start();

    window.history.pushState({}, "", "/?world=studio");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() => expect(resolutions.has("studio")).toBe(true));

    window.history.pushState({}, "", "/?world=linework");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() => expect(resolutions.has("linework")).toBe(true));

    resolutions.get("linework")?.(true);
    resolutions.get("studio")?.(false);
    await vi.waitFor(() => expect(activeWorldId).toBe("linework"));

    expect(window.location.search).toBe("?world=linework");
    director.dispose();
  });

  it("restores focus inside the active World without reinstalling it", async () => {
    let activeFocusId: string | null = null;
    const navigate = vi.fn(async () => true);
    const restoreFocus = vi.fn((focusId: string | null) => {
      activeFocusId = focusId;
      return true;
    });
    const director = new WorldHistoryDirector(
      () => ({ worldId: "studio", focusId: activeFocusId }),
      navigate,
      restoreFocus,
    );
    director.start();
    window.history.pushState(
      {},
      "",
      "/?world=studio&focus=claude-nexus",
    );

    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() =>
      expect(restoreFocus).toHaveBeenCalledWith("claude-nexus"),
    );

    expect(activeFocusId).toBe("claude-nexus");
    expect(navigate).not.toHaveBeenCalled();
    director.dispose();
  });
});
