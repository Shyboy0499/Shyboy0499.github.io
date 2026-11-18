import { describe, expect, it } from "vitest";
import {
  applyDebugQualityOverride,
  QUALITY_BUDGETS,
  selectInitialQualityBudget,
} from "../../src/runtime/quality-budget";

describe("selectInitialQualityBudget", () => {
  it("grants high quality only to capable desktop devices", () => {
    expect(
      selectInitialQualityBudget({
        isMobile: false,
        reducedMotion: false,
        saveData: false,
        hardwareConcurrency: 12,
        deviceMemoryGb: 16,
      }).tier,
    ).toBe("high");
  });

  it("uses low quality for constrained or data-saving devices", () => {
    expect(
      selectInitialQualityBudget({
        isMobile: true,
        reducedMotion: false,
        saveData: false,
        hardwareConcurrency: 8,
        deviceMemoryGb: 8,
      }).tier,
    ).toBe("low");
    expect(
      selectInitialQualityBudget({
        isMobile: false,
        reducedMotion: false,
        saveData: true,
        hardwareConcurrency: 12,
        deviceMemoryGb: 16,
      }).preloadDepth,
    ).toBe("none");
  });

  it("respects reduced motion when selecting transition behavior", () => {
    const budget = selectInitialQualityBudget({
      isMobile: false,
      reducedMotion: true,
      saveData: false,
      hardwareConcurrency: 12,
      deviceMemoryGb: 16,
    });

    expect(budget.portalMode).toBe("snapshot");
    expect(budget.effectDensity).toBeLessThan(1);
  });
});

describe("applyDebugQualityOverride", () => {
  it("allows an explicit tier only in Runtime diagnostics mode", () => {
    expect(
      applyDebugQualityOverride(
        QUALITY_BUDGETS.high,
        "?debug=runtime&quality=low",
      ),
    ).toBe(QUALITY_BUDGETS.low);
    expect(
      applyDebugQualityOverride(QUALITY_BUDGETS.high, "?quality=low"),
    ).toBe(QUALITY_BUDGETS.high);
  });

  it("ignores unknown diagnostic tiers", () => {
    expect(
      applyDebugQualityOverride(
        QUALITY_BUDGETS.balanced,
        "?debug=runtime&quality=ultra",
      ),
    ).toBe(QUALITY_BUDGETS.balanced);
  });
});
