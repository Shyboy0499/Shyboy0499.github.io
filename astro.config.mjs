import { defineConfig } from "astro/config";

// 个人站点为纯静态输出，直接部署到 GitHub Pages 用户页。
export default defineConfig({
  output: "static",
  site: "https://shyboy0499.github.io",
  build: {
    assets: "_assets",
  },
});
