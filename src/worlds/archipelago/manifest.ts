// Archipelago World 的资源与能力声明；代码由原生 World Module 按需加载。
// 这里声明 Runtime 预加载所需的公开媒体和质量预算，不描述场景内部 Module。
import { defineWorldManifest } from "../../runtime/world-manifest";
import { WORLD_NAMING } from "../worlds.config";

export const archipelagoManifest = defineWorldManifest({
  id: WORLD_NAMING.archipelago.id,
  title: WORLD_NAMING.archipelago.title,
  entryPoster: WORLD_NAMING.archipelago.entryPoster,
  supportedActivities: ["active", "near", "distant"],
  assets: {
    critical: [],
    deferred: [],
    quality: {
      high: ["archipelago-dynamic-shadows"],
      balanced: ["archipelago-reduced-shadows"],
      low: ["archipelago-shadowless-mode"],
    },
  },
  budgets: {
    initialTransferKb: 760,
    estimatedGpuMb: {
      high: 160,
      balanced: 112,
      low: 72,
    },
  },
  features: {
    audio: false,
    physics: false,
    postProcessing: true,
    livePortalBlend: false,
  },
} as const);
