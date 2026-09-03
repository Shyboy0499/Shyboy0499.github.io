// 浏览器入口：安装站点级增强，并按 URL 参数或随机策略选择初始 World。
// 具体 World 行为由 Runtime 和 registry 接管，本文件不持有渲染生命周期。
import { installImmersiveMode } from "./runtime/immersive-mode";
import type { WorldRegistry, WorldRegistryEntry } from "./runtime/contracts";
import { WORLD_QUERY_PARAM, WORLD_NAMING } from "./worlds/worlds.config";

const canvas = document.querySelector<HTMLCanvasElement>("#world");

installImmersiveMode();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  // Service Worker 只提供安装体验，不接管站点资源缓存策略。
  void navigator.serviceWorker.register("./sw.js").catch(() => undefined);
}

document.querySelector<HTMLElement>("[data-year]")!.textContent = String(
  new Date().getFullYear(),
);

if (canvas) {
  void Promise.all([
    import("./runtime/experience-runtime"),
    import("./worlds/registry"),
  ])
    .then(async ([runtime, registry]) => {
      const requestedWorldId = new URLSearchParams(window.location.search).get(WORLD_QUERY_PARAM);
      const worldRegistry: WorldRegistry = registry.worldRegistry;
      const requestedEntry = requestedWorldId
        ? worldRegistry[requestedWorldId]
        : undefined;
      // Default to the Studio "room tour" world — the only experience for this site.
      const initialEntry = requestedEntry ?? worldRegistry[WORLD_NAMING.studio.id];
      if (!initialEntry) {
        throw new Error("No World registered for portfolio experience.");
      }
      const initialWorld = await initialEntry.load();

      return runtime.startExperience(
        canvas,
        initialWorld,
        worldRegistry,
      );
    })
    .catch((error) => {
      console.error("[portfolio] Experience failed to start:", error);
    });
}
