// Studio Overlay 直接保证进入门槛已移除；World 一挂载就应当可交互。
// 这里只验 DOM 结构和初始化行为，不模拟 Three.js 或 World Session。
import { describe, expect, it, vi } from "vitest";
import { studioBinding } from "../../src/worlds/studio/binding";
import { createStudioOverlay } from "../../src/worlds/studio/ui/studio-overlay";

describe("Studio Overlay", () => {
  it("starts without an enter screen", () => {
    const onEnter = vi.fn();
    const overlay = createStudioOverlay({
      bindings: studioBinding,
      onEnter,
      onSelect: () => undefined,
      onLampToggle: () => false,
      onNightChange: () => undefined,
    });
    document.body.append(overlay.root);

    expect(overlay.root.querySelector("[data-studio-enter-layer]")).toBeNull();
    expect(overlay.hasEntered()).toBe(true);

    overlay.focusEntry();
    expect(onEnter).toHaveBeenCalledOnce();

    overlay.dispose();
  });
});
