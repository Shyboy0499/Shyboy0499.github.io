// World 命名索引是世界 id、目录、URL 参数和提交 scope 的单一事实来源。
// 具体渲染实现仍留在各自 WorldModule，避免配置文件变成加载器。
export const WORLD_NAMING = {
  cosmic: {
    id: "cosmic",
    title: "Cosmic Portfolio",
    englishTitle: "Cosmic World",
    chineseTitle: "宇宙世界",
    codeDir: "src/worlds/cosmic",
    assetBasePath: "assets",
    entryPoster: "assets/avatar.webp",
    urlWorldParam: "cosmic",
    commitScope: "cosmic",
  },
  archipelago: {
    id: "archipelago",
    title: "作品群岛",
    englishTitle: "Archipelago World",
    chineseTitle: "群岛世界",
    codeDir: "src/worlds/archipelago",
    entryPoster: "archipelago-world/entry-poster.webp",
    urlWorldParam: "archipelago",
    commitScope: "archipelago",
  },
  jianghu: {
    id: "jianghu",
    title: "江湖世界",
    englishTitle: "Jianghu World",
    chineseTitle: "江湖世界",
    codeDir: "src/worlds/jianghu",
    assetBasePath: "jianghu-world",
    sceneBackground: "jianghu-world/backgrounds/yuelai-inn-night.webp",
    entryPoster: "jianghu-world/backgrounds/yuelai-inn-night.webp",
    urlWorldParam: "jianghu",
    commitScope: "jianghu",
  },
  linework: {
    id: "linework",
    title: "线稿工作室",
    englishTitle: "Linework World",
    chineseTitle: "线稿世界",
    codeDir: "src/worlds/linework",
    assetBasePath: "linework-world",
    entryPoster: "linework-world/entry-poster.webp",
    urlWorldParam: "linework",
    commitScope: "linework",
  },
  studio: {
    id: "studio",
    title: "Shyboy0499 Studio",
    englishTitle: "Studio World",
    chineseTitle: "工作室世界",
    codeDir: "src/worlds/studio",
    assetBasePath: "studio-world",
    entryPoster: "studio-world/entry-poster.webp",
    urlWorldParam: "studio",
    commitScope: "studio",
  },
} as const;

export type KnownWorldId = keyof typeof WORLD_NAMING;

export const KNOWN_WORLD_IDS = Object.keys(WORLD_NAMING) as KnownWorldId[];
export const WORLD_QUERY_PARAM = "world";
export const WORLD_FOCUS_QUERY_PARAM = "focus";

export function getWorldUrlParam(id: KnownWorldId): string {
  return WORLD_NAMING[id].urlWorldParam;
}
