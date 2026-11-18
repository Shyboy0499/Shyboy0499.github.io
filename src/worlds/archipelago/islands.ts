// 群岛世界的数据形状与自动布局：这里只给岛屿分配稳定坐标，不创建 Three.js 对象。
// 正式作品来自 Portfolio Binding，未来岛用于保留海域密度和生长动画入口。
export interface ProjectRef {
  id: string;
  name: string;
  url: string;
  cover?: string;
}

export interface IslandPhotoRef {
  id: string;
  url: string;
  caption?: string;
  alt: string;
}

export interface IslandSource {
  id: string;
  name: string;
  builder: string;
  description?: string;
  theme: "forest" | "volcano" | "snow" | "kame";
  projects: ProjectRef[];
  photos: IslandPhotoRef[];
}

export interface IslandDef extends IslandSource {
  position: [number, number];
}

const FUTURE_ISLAND_COUNT = 12;
const THEMES: IslandSource["theme"][] = ["forest", "volcano", "snow", "kame"];
const FUTURE_ISLANDS: IslandSource[] = Array.from(
  { length: FUTURE_ISLAND_COUNT },
  (_, index) => ({
    id: `future-island-${String(index + 1).padStart(2, "0")}`,
    name: `未命名海域 ${String(index + 1).padStart(2, "0")}`,
    builder: "SHYBOY0499",
    description: "等待下一件作品在这里升起",
    theme: THEMES[index % THEMES.length],
    projects: [],
    photos: [],
  }),
);

function lcg(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

function sourceSeed(source: IslandSource): number {
  let hash = 2166136261;
  for (const char of source.id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 20260713;
}

export function layoutIslands(sources: IslandSource[]): IslandDef[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return sources.map((source, index) => {
    const rng = lcg(sourceSeed(source));
    // 半径只依赖排序位置，抖动只依赖稳定 ID。末尾新增岛屿时，已有岛不会整体漂移。
    const radius = Math.min(570, 55 + Math.sqrt(index) * 95);
    const angle = index * goldenAngle + (rng() - 0.5) * 0.45;
    const jitter = (rng() - 0.5) * 44;
    const x = Math.round(Math.cos(angle) * radius + jitter);
    const z = Math.round(Math.sin(angle) * radius + (rng() - 0.5) * 44);
    return { ...source, position: [x, z] };
  });
}

export function layoutIslandWorld(
  publishedSources: IslandSource[],
): IslandDef[] {
  const publishedIds = new Set(publishedSources.map((source) => source.id));
  const futureSources = FUTURE_ISLANDS.filter(
    (source) => !publishedIds.has(source.id),
  );
  return layoutIslands([...publishedSources, ...futureSources]);
}

export const WORLD_RADIUS = 640;
export const SPAWN: [number, number] = [0, 0];
