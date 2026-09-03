// 世界入口布局契约：验证图片数量变化时仍能自动铺满并居中末行。
// 这里不测试 CSS 遮罩细节，只保护配置驱动的几何关系。
import { describe, expect, it } from "vitest";
import { createLiquidWorldPlacement } from "../../src/worlds/world-picker-layout";

describe("liquid World picker layout", () => {
  it("centers the final two images when a fifth World is added", () => {
    const placements = Array.from({ length: 5 }, (_, index) =>
      createLiquidWorldPlacement(index, 5, 3),
    );

    placements.slice(0, 3).forEach((placement, index) => {
      expect(placement.left).toBeCloseTo((index + 0.5) * (100 / 3));
    });
    expect(placements.slice(3).map(({ left }) => left)).toEqual([25, 75]);
    expect(placements.slice(0, 3).map(({ top }) => top)).toEqual([
      25,
      25,
      25,
    ]);
    expect(placements.slice(3).map(({ top }) => top)).toEqual([75, 75]);
  });

  it("rejects a placement outside the configured World count", () => {
    expect(() => createLiquidWorldPlacement(5, 5, 3)).toThrow(RangeError);
  });
});
