// Jianghu World 的资源与能力声明；资源主要是 DOM 背景和角色 sprite。
// Runtime 通过它了解预算和 Portal 预加载边界。
import { defineWorldManifest } from "../../runtime/world-manifest";
import { WORLD_NAMING } from "../worlds.config";

export const jianghuManifest = defineWorldManifest({
  id: WORLD_NAMING.jianghu.id,
  title: WORLD_NAMING.jianghu.title,
  entryPoster: WORLD_NAMING.jianghu.entryPoster,
  supportedActivities: ["active", "near", "distant"],
  assets: {
    critical: [],
    deferred: [`${WORLD_NAMING.jianghu.assetBasePath}/agents/caocao/caocao-doze.webp`],
    quality: {},
  },
  budgets: {
    initialTransferKb: 3600,
    estimatedGpuMb: {
      high: 24,
      balanced: 18,
      low: 10,
    },
  },
  features: {
    audio: false,
    physics: false,
    postProcessing: false,
    livePortalBlend: false,
  },
} as const);
