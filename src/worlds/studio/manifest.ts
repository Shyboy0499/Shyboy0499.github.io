// Studio World 的资源与性能预算；主体模型由程序化几何生成。
// Manifest 不保存布局或交互状态，只供 Runtime 预加载和质量决策。
import { defineWorldManifest } from "../../runtime/world-manifest";
import { WORLD_NAMING } from "../worlds.config";

export const studioManifest = defineWorldManifest({
  id: WORLD_NAMING.studio.id,
  title: WORLD_NAMING.studio.title,
  entryPoster: WORLD_NAMING.studio.entryPoster,
  supportedActivities: ["active", "near", "distant"],
  assets: {
    critical: [
      "/assets/projects/deepseek-harness-cover.webp",
      "/assets/projects/dsh-git-tools-cover.webp",
      "/assets/projects/deepseek-obsidian-cover.webp",
    ],
    deferred: [
      "/assets/build-log/build-01-hello-deepseek.webp",
      "/assets/build-log/build-04-open-source-prs.webp",
      "/assets/build-log/build-07-this-room.webp",
    ],
    quality: {
      high: ["studio-dynamic-shadows"],
      balanced: ["studio-reduced-shadows"],
      low: ["studio-unlit-room"],
    },
  },
  budgets: {
    initialTransferKb: 260,
    estimatedGpuMb: {
      high: 62,
      balanced: 44,
      low: 26,
    },
  },
  features: {
    audio: false,
    physics: false,
    postProcessing: false,
    livePortalBlend: false,
  },
} as const);
