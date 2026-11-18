// Runtime 动态质量控制器：根据真实帧间隔在设备初始上限内升降 Quality Budget。
// 它只做带迟滞的档位判断，不直接操作 renderer、World 或浏览器生命周期。
import type { QualityBudget, QualityTier } from "./contracts";
import { QUALITY_BUDGETS } from "./quality-budget";

const DYNAMIC_TIERS = ["low", "balanced", "high"] as const;
const DOWNGRADE_WINDOW_SECONDS = 2.5;
const UPGRADE_STABLE_SECONDS = 10;
const CHANGE_COOLDOWN_SECONDS = 6;
const DOWNGRADE_FRAME_SECONDS = 1 / 42;
const UPGRADE_FRAME_SECONDS = 1 / 55;

type DynamicTier = (typeof DYNAMIC_TIERS)[number];

function tierIndex(tier: QualityTier): number {
  return DYNAMIC_TIERS.indexOf(tier as DynamicTier);
}

export class AdaptiveQualityController {
  private readonly ceilingIndex: number;
  private currentIndex: number;
  private windowDuration = 0;
  private frameTimeTotal = 0;
  private sampleCount = 0;
  private stableFastDuration = 0;
  private cooldownUntil = 0;

  constructor(
    initial: QualityBudget,
    private readonly onChange: (budget: QualityBudget) => void,
  ) {
    this.currentIndex = tierIndex(initial.tier);
    this.ceilingIndex = this.currentIndex;
  }

  sample(rawDelta: number, elapsed: number, eligible = true): void {
    if (
      !eligible ||
      this.currentIndex < 0 ||
      !Number.isFinite(rawDelta) ||
      rawDelta <= 0 ||
      rawDelta > 0.25
    ) {
      this.resetWindow();
      this.stableFastDuration = 0;
      return;
    }

    this.windowDuration += rawDelta;
    this.frameTimeTotal += rawDelta;
    this.sampleCount += 1;
    if (this.windowDuration < DOWNGRADE_WINDOW_SECONDS) return;

    const measuredDuration = this.windowDuration;
    const averageFrameTime = this.frameTimeTotal / this.sampleCount;
    this.resetWindow();
    if (elapsed < this.cooldownUntil) {
      this.stableFastDuration = 0;
      return;
    }

    if (averageFrameTime > DOWNGRADE_FRAME_SECONDS && this.currentIndex > 0) {
      this.changeTo(this.currentIndex - 1, elapsed);
      return;
    }

    if (
      averageFrameTime < UPGRADE_FRAME_SECONDS &&
      this.currentIndex < this.ceilingIndex
    ) {
      this.stableFastDuration += measuredDuration;
      if (this.stableFastDuration >= UPGRADE_STABLE_SECONDS) {
        this.changeTo(this.currentIndex + 1, elapsed);
      }
      return;
    }

    this.stableFastDuration = 0;
  }

  private changeTo(index: number, elapsed: number): void {
    this.currentIndex = index;
    this.stableFastDuration = 0;
    this.cooldownUntil = elapsed + CHANGE_COOLDOWN_SECONDS;
    const tier = DYNAMIC_TIERS[index];
    this.onChange(QUALITY_BUDGETS[tier]);
  }

  private resetWindow(): void {
    this.windowDuration = 0;
    this.frameTimeTotal = 0;
    this.sampleCount = 0;
  }
}
