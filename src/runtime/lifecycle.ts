// World Session 内的活动级别和质量预算广播器；状态只在当前 Session 生命周期内有效。
// Runtime 写入状态，World 通过订阅响应暂停、降级或恢复。
import type {
  ActivityLevel,
  LifecyclePort,
  QualityBudget,
  Registration,
} from "./contracts";

export class RuntimeLifecycle implements LifecyclePort {
  private activityListeners = new Set<(level: ActivityLevel) => void>();
  private qualityListeners = new Set<(budget: QualityBudget) => void>();

  constructor(
    private currentActivity: ActivityLevel,
    private currentQuality: QualityBudget,
  ) {}

  get activity(): ActivityLevel {
    return this.currentActivity;
  }

  get quality(): QualityBudget {
    return this.currentQuality;
  }

  onActivity(listener: (level: ActivityLevel) => void): Registration {
    this.activityListeners.add(listener);
    listener(this.currentActivity);
    return { dispose: () => this.activityListeners.delete(listener) };
  }

  onQuality(listener: (budget: QualityBudget) => void): Registration {
    this.qualityListeners.add(listener);
    listener(this.currentQuality);
    return { dispose: () => this.qualityListeners.delete(listener) };
  }

  setActivity(level: ActivityLevel): void {
    if (level === this.currentActivity) return;
    this.currentActivity = level;
    this.activityListeners.forEach((listener) => listener(level));
  }

  setQuality(budget: QualityBudget): void {
    if (budget === this.currentQuality) return;
    this.currentQuality = budget;
    this.qualityListeners.forEach((listener) => listener(budget));
  }

  dispose(): void {
    this.activityListeners.clear();
    this.qualityListeners.clear();
  }
}
