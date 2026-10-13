// 视觉作品的数据来源：图片位于 public/art/，原创生成艺术由 scripts/gen-art.mjs 生成。
// 新增作品时把图片放入 public/art/ 并在此追加；第一项会以大图形式展示。
export type Artwork = {
  src: string;
  title: string;
  note: string;
  alt: string;
};

export const artworks: Artwork[] = [
  {
    src: "/art/studio-cat.jpg",
    title: "Studio cat",
    note: "Photograph",
    alt: "A grey cat sitting in front of a dark floral wall print",
  },
  {
    src: "/art/flow.svg",
    title: "Flow field",
    note: "Generative · line study",
    alt: "Abstract flowing lines on a dark background",
  },
  {
    src: "/art/orbits.svg",
    title: "Orbit study",
    note: "Generative · concentric",
    alt: "Concentric rings with small coloured dots around a glowing centre",
  },
  {
    src: "/art/truchet.svg",
    title: "Truchet tiles",
    note: "Generative · pattern",
    alt: "A grid of curved line segments in violet and teal",
  },
  {
    src: "/art/shards.svg",
    title: "Shard mesh",
    note: "Generative · triangulation",
    alt: "A jittered triangle mesh shaded from violet to coral",
  },
  {
    src: "/art/halo.svg",
    title: "Halo",
    note: "Generative · rings",
    alt: "Fading concentric rings around a bright core",
  },
  {
    src: "/art/strata.svg",
    title: "Strata",
    note: "Generative · layered waves",
    alt: "Layered wave bands fading from violet to coral",
  },
];
