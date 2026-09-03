// Cosmic World 的资源与能力声明；Runtime 依赖它做预算和预加载判断。
// manifest 只描述边界，不包含具体 Three.js 场景实现。
import { defineWorldManifest } from "../../runtime/world-manifest";
import { WORLD_NAMING } from "../worlds.config";

export const cosmicManifest = defineWorldManifest({
  id: WORLD_NAMING.cosmic.id,
  title: WORLD_NAMING.cosmic.title,
  entryPoster: WORLD_NAMING.cosmic.entryPoster,
  supportedActivities: ["active", "near", "distant"],
  assets: {
    critical: [
      `${WORLD_NAMING.cosmic.assetBasePath}/isometric-preview.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/claude-nexus-cover.webp`,
    ],
    deferred: [
      `${WORLD_NAMING.cosmic.assetBasePath}/roadmap-cover.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/claude-nexus-icon.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/cycling/ride-01-flat-tire-tools.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/cycling/ride-02-flat-tire-repair.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/cycling/ride-03-tankou-camp.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/cycling/ride-04-shuikou-bike.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/cycling/ride-05-shuikou-town.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/cycling/ride-06-nanping-hotel.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/cycling/ride-07-minjiang-rainbow.webp`,
    ],
    quality: {},
  },
  budgets: {
    initialTransferKb: 2000,
    estimatedGpuMb: {
      high: 132,
      balanced: 96,
      low: 64,
    },
  },
  features: {
    audio: false,
    physics: false,
    postProcessing: false,
    livePortalBlend: false,
  },
} as const);
