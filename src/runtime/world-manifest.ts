// World Manifest 的定义和校验入口；注册前先挡住非法活动、预算和重复资源。
// 这样 Runtime 可以信任 registry 中的世界元数据。
import type { ActivityLevel, WorldManifest } from "./contracts";

const VALID_ACTIVITIES = new Set<ActivityLevel>([
  "active",
  "near",
  "distant",
  "dormant",
]);

export function defineWorldManifest<const T extends WorldManifest>(
  manifest: T,
): T {
  if (!manifest.id.trim()) throw new Error("World Manifest id is required.");
  if (!manifest.title.trim()) {
    throw new Error(`World Manifest title is required: ${manifest.id}`);
  }
  if (!manifest.supportedActivities.includes("active")) {
    throw new Error(`World must support active activity: ${manifest.id}`);
  }
  if (manifest.budgets.initialTransferKb < 0) {
    throw new Error(`World transfer budget must be positive: ${manifest.id}`);
  }

  for (const activity of manifest.supportedActivities) {
    if (!VALID_ACTIVITIES.has(activity)) {
      throw new Error(`Unknown activity "${activity}": ${manifest.id}`);
    }
  }

  const assets = [
    manifest.entryPoster,
    ...manifest.assets.critical,
    ...manifest.assets.deferred,
    ...Object.values(manifest.assets.quality).flatMap((items) => items ?? []),
  ];
  const duplicates = assets.filter(
    (asset, index) => assets.indexOf(asset) !== index,
  );
  if (duplicates.length > 0) {
    throw new Error(
      `World Manifest contains duplicate assets: ${manifest.id} (${[
        ...new Set(duplicates),
      ].join(", ")})`,
    );
  }

  return manifest;
}
