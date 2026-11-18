// 站点级配置集中管理跨页面复用的资源、路由和外部入口。
// 内容内核仍放在 portfolio.ts，本文件只保存站点壳层会反复引用的常量。
export const SITE_CONFIG = {
  homePath: "/",
  assetGalleryPath: "/3d-assets/",
  manifestPath: "/manifest.webmanifest",
  iconPath: "/assets/avatar.webp",
  ogImagePath: "/assets/avatar.webp",
  githubUrl: "https://github.com/Shyboy0499",
} as const;
