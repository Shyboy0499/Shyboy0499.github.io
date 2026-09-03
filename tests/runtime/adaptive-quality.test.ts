// 动态质量回归测试：覆盖持续低帧降档、稳定恢复、初始上限和暂停采样。
// 测试直接喂入帧间隔，不依赖浏览器 RAF 时序。
import { describe, expect, it, vi } from "vitest";
import { AdaptiveQualityController } from "../../src/runtime/adaptive-quality";
import { QUALITY_BUDGETS } from "../../src/runtime/quality-budget";

function sampleFor(
  controller: AdaptiveQualityController,
  start: number,
  duration: number,
  delta: number,
  eligible = true,
): number {
  let elapsed = start;
  const end = start + duration;
  while (elapsed < end) {
    elapsed += delta;
    controller.sample(delta, elapsed, eligible);
  }
  return elapsed;
}

describe("AdaptiveQualityController", () => {
  it("downgrades after sustained low frame rate", () => {
    const onChange = vi.fn();
    const controller = new AdaptiveQualityController(
      QUALITY_BUDGETS.high,
      onChange,
    );

    sampleFor(controller, 0, 3, 1 / 30);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0].tier).toBe("balanced");
  });

  it("recovers only after cooldown and sustained stable frames", () => {
    const tiers: string[] = [];
    const controller = new AdaptiveQualityController(
      QUALITY_BUDGETS.high,
      (budget) => tiers.push(budget.tier),
    );
    let elapsed = sampleFor(controller, 0, 3, 1 / 30);
    elapsed = sampleFor(controller, elapsed, 7, 1 / 60);
    expect(tiers).toEqual(["balanced"]);

    sampleFor(controller, elapsed, 11, 1 / 60);
    expect(tiers).toEqual(["balanced", "high"]);
  });

  it("never upgrades above the device initial ceiling", () => {
    const onChange = vi.fn();
    const controller = new AdaptiveQualityController(
      QUALITY_BUDGETS.balanced,
      onChange,
    );

    sampleFor(controller, 0, 20, 1 / 60);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores samples while a Portal Journey owns the frame", () => {
    const onChange = vi.fn();
    const controller = new AdaptiveQualityController(
      QUALITY_BUDGETS.high,
      onChange,
    );

    sampleFor(controller, 0, 6, 1 / 20, false);

    expect(onChange).not.toHaveBeenCalled();
  });
});
