// 可加载 World 的集中注册表；这里只声明 manifest 和 lazy import 边界。
// Runtime 通过它解析 Portal 目标和 URL 指定的初始世界。
import type { WorldRegistry } from "../runtime/contracts";
import { archipelagoManifest } from "./archipelago/manifest";
import { cosmicManifest } from "./cosmic/manifest";
import { jianghuManifest } from "./jianghu/manifest";
import { lineworkManifest } from "./linework/manifest";
import { studioManifest } from "./studio/manifest";
import { WORLD_NAMING } from "./worlds.config";

export const worldRegistry = {
  [WORLD_NAMING.cosmic.id]: {
    manifest: cosmicManifest,
    load: async () => (await import("./cosmic")).cosmicWorld,
  },
  [WORLD_NAMING.archipelago.id]: {
    manifest: archipelagoManifest,
    load: async () => (await import("./archipelago")).archipelagoWorld,
  },
  [WORLD_NAMING.jianghu.id]: {
    manifest: jianghuManifest,
    load: async () => (await import("./jianghu")).jianghuWorld,
  },
  [WORLD_NAMING.linework.id]: {
    manifest: lineworkManifest,
    load: async () => (await import("./linework")).lineworkWorld,
  },
  [WORLD_NAMING.studio.id]: {
    manifest: studioManifest,
    load: async () => (await import("./studio")).studioWorld,
  },
} satisfies WorldRegistry;
