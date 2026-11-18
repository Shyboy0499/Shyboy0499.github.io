import { describe, expect, it, vi } from "vitest";
import { RuntimeLifecycle } from "../../src/runtime/lifecycle";
import { selectInitialQualityBudget } from "../../src/runtime/quality-budget";

const quality = selectInitialQualityBudget({
  isMobile: false,
  reducedMotion: false,
  saveData: false,
  hardwareConcurrency: 8,
  deviceMemoryGb: 8,
});

describe("RuntimeLifecycle", () => {
  it("delivers current state and ignores repeated values", () => {
    const activity = vi.fn();
    const lifecycle = new RuntimeLifecycle("near", quality);
    lifecycle.onActivity(activity);

    lifecycle.setActivity("active");
    lifecycle.setActivity("active");

    expect(activity.mock.calls.map(([level]) => level)).toEqual([
      "near",
      "active",
    ]);
  });

  it("stops delivering after disposal", () => {
    const activity = vi.fn();
    const lifecycle = new RuntimeLifecycle("active", quality);
    lifecycle.onActivity(activity);
    lifecycle.dispose();

    lifecycle.setActivity("distant");

    expect(activity).toHaveBeenCalledOnce();
  });
});
