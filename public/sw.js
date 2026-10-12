// 墓碑 Service Worker：注销旧版 PWA 的缓存，让回访浏览器加载新站点。
// 旧沉浸式站点注册过 sw.js 并长期缓存页面；删除源文件不会注销已安装的 SW，
// 浏览器会继续用缓存提供旧内容。本文件清空所有缓存、注销自身并刷新受控页面。
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});
