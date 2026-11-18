// 根据浏览器能力信号推导初始质量预算；World 接收预算，不自行判断设备档位。
// 这里集中处理省流量、低动效、移动端和硬件能力带来的性能取舍。
import type { QualityBudget } from "./contracts";

export interface QualitySignals {
  isMobile: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
}

export const QUALITY_BUDGETS = {
  high: {
    tier: "high",
    pixelRatioCap: 1.8,
    shadows: "dynamic",
    postProcessing: "full",
    effectDensity: 1,
    animationRate: 60,
    portalMode: "snapshot",
    preloadDepth: "next-world",
  },
  balanced: {
    tier: "balanced",
    pixelRatioCap: 1.5,
    shadows: "reduced",
    postProcessing: "reduced",
    effectDensity: 0.72,
    animationRate: 60,
    portalMode: "snapshot",
    preloadDepth: "critical-only",
  },
  low: {
    tier: "low",
    pixelRatioCap: 1,
    shadows: "off",
    postProcessing: "off",
    effectDensity: 0.42,
    animationRate: 30,
    portalMode: "static",
    preloadDepth: "none",
  },
  static: {
    tier: "static",
    pixelRatioCap: 1,
    shadows: "off",
    postProcessing: "off",
    effectDensity: 0,
    animationRate: 15,
    portalMode: "static",
    preloadDepth: "none",
  },
} as const satisfies Record<string, QualityBudget>;

export function selectInitialQualityBudget(
  signals: QualitySignals,
): QualityBudget {
  if (signals.saveData) return QUALITY_BUDGETS.low;
  if (signals.reducedMotion) {
    return signals.isMobile
      ? QUALITY_BUDGETS.low
      : QUALITY_BUDGETS.balanced;
  }

  const constrained =
    signals.hardwareConcurrency <= 4 ||
    (signals.deviceMemoryGb !== undefined && signals.deviceMemoryGb <= 4);
  if (signals.isMobile || constrained) return QUALITY_BUDGETS.low;

  const capable =
    signals.hardwareConcurrency >= 8 &&
    (signals.deviceMemoryGb === undefined || signals.deviceMemoryGb >= 8);
  return capable ? QUALITY_BUDGETS.high : QUALITY_BUDGETS.balanced;
}

export function applyDebugQualityOverride(
  budget: QualityBudget,
  search: string,
): QualityBudget {
  const params = new URLSearchParams(search);
  if (params.get("debug") !== "runtime") return budget;
  const requested = params.get("quality");
  if (!requested || !(requested in QUALITY_BUDGETS)) return budget;
  return QUALITY_BUDGETS[requested as keyof typeof QUALITY_BUDGETS];
}

export function readBrowserQualitySignals(
  reducedMotion: MediaQueryList,
  isMobile: boolean,
): QualitySignals {
  const navigatorWithHints = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };

  return {
    isMobile,
    reducedMotion: reducedMotion.matches,
    saveData: navigatorWithHints.connection?.saveData ?? false,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemoryGb: navigatorWithHints.deviceMemory,
  };
}
