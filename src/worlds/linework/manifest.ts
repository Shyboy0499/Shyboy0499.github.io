// Linework World 的资源和性能边界；房间主体由轻量程序化几何生成。
// Manifest 只供 Runtime 做预加载与质量判断，不包含场景布局。
import { defineWorldManifest } from "../../runtime/world-manifest";
import { WORLD_NAMING } from "../worlds.config";

export const lineworkManifest = defineWorldManifest({
  id: WORLD_NAMING.linework.id,
  title: WORLD_NAMING.linework.title,
  entryPoster: WORLD_NAMING.linework.entryPoster,
  supportedActivities: ["active", "near", "distant"],
  assets: {
    critical: [],
    deferred: [
      "/assets/build-log/build-01-hello-deepseek.webp",
      "/assets/build-log/build-02-curate-ecosystem.webp",
      "/assets/build-log/build-03-ship-plugin.webp",
      "/assets/build-log/build-04-open-source-prs.webp",
      "/assets/build-log/build-05-knowledge-llm.webp",
      "/assets/build-log/build-06-learn-by-building.webp",
      "/assets/build-log/build-07-this-room.webp",
    ],
    quality: {
      high: ["linework-paper-pass-high"],
      balanced: ["linework-paper-pass-balanced"],
      low: ["linework-geometry-edges"],
    },
  },
  budgets: {
    initialTransferKb: 180,
    estimatedGpuMb: {
      high: 50,
      balanced: 36,
      low: 20,
    },
  },
  features: {
    audio: false,
    physics: false,
    postProcessing: true,
    livePortalBlend: false,
  },
} as const);
