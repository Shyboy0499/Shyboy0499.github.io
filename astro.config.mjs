import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";

export default defineConfig({
  output: "static",
  site: "https://shyboy0499.github.io",
  integrations: [vue()],
  build: {
    assets: "_assets",
  },
});
