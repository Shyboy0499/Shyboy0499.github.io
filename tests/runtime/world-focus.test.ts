// World Focus 回归测试：覆盖初始恢复、用户提交、无效焦点和历史回滚。
// 测试只验证 Session 端口语义，不依赖具体 World 的视觉实现。
import { describe, expect, it, vi } from "vitest";
import { RuntimeWorldFocus } from "../../src/runtime/world-focus";

describe("RuntimeWorldFocus", () => {
  it("applies an initial focus without creating another history entry", () => {
    const commit = vi.fn();
    const apply = vi.fn(() => true);
    const focus = new RuntimeWorldFocus("claude-nexus", commit);

    focus.register(apply);

    expect(apply).toHaveBeenCalledWith("claude-nexus");
    expect(focus.read()).toBe("claude-nexus");
    expect(commit).not.toHaveBeenCalled();
  });

  it("commits only a changed user focus", () => {
    const commit = vi.fn();
    const focus = new RuntimeWorldFocus(null, commit);
    focus.register(() => true);

    focus.commit("life");
    focus.commit("life");

    expect(commit).toHaveBeenCalledOnce();
    expect(commit).toHaveBeenCalledWith("life");
  });

  it("keeps the previous focus when history restoration is rejected", () => {
    const focus = new RuntimeWorldFocus("life", vi.fn());
    focus.register((focusId) => focusId !== "missing");

    expect(focus.restore("missing")).toBe(false);
    expect(focus.read()).toBe("life");
  });
});
