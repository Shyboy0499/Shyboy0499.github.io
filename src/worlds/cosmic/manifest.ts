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
      `${WORLD_NAMING.cosmic.assetBasePath}/projects/deepseek-obsidian-cover.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/projects/deepseek-harness-cover.webp`,
    ],
    deferred: [
      `${WORLD_NAMING.cosmic.assetBasePath}/projects/dsh-git-tools-cover.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/projects/deepseek-harness-icon.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/build-log/build-01-hello-deepseek.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/build-log/build-02-curate-ecosystem.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/build-log/build-03-ship-plugin.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/build-log/build-04-open-source-prs.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/build-log/build-05-knowledge-llm.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/build-log/build-06-learn-by-building.webp`,
      `${WORLD_NAMING.cosmic.assetBasePath}/build-log/build-07-this-room.webp`,
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
