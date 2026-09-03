// Linework Binding 把 Portfolio Project 映射为线稿房间中的可交互陈设。
// 这里拥有房间坐标与镜头焦点，不重复保存项目语义内容。
import type {
  PortfolioCollectionId,
  PortfolioPersonId,
  PortfolioProjectId,
} from "../../content/portfolio";

export type LineworkExhibitId = "desk" | "bookshelf" | "wall-print" | "photo-wall";

interface LineworkExhibitBindingBase {
  readonly id: LineworkExhibitId;
  readonly number: string;
  readonly objectLabel: string;
  readonly focus: readonly [number, number, number];
}

export interface LineworkProjectExhibitBinding extends LineworkExhibitBindingBase {
  readonly kind: "project";
  readonly portfolioId: PortfolioProjectId;
}

export interface LineworkProfileExhibitBinding extends LineworkExhibitBindingBase {
  readonly kind: "profile";
  readonly personId: PortfolioPersonId;
  readonly collectionId: PortfolioCollectionId;
  readonly mediaIds: readonly string[];
}

export type LineworkExhibitBinding =
  | LineworkProjectExhibitBinding
  | LineworkProfileExhibitBinding;

export const lineworkBinding = [
  {
    id: "desk",
    kind: "project",
    number: "01",
    objectLabel: "WORK DESK",
    portfolioId: "claude-nexus",
    focus: [-2.5, 1.45, -2.45],
  },
  {
    id: "bookshelf",
    kind: "project",
    number: "02",
    objectLabel: "REFERENCE SHELF",
    portfolioId: "ai-application-roadmap",
    focus: [4.35, 2.15, -3.55],
  },
  {
    id: "wall-print",
    kind: "project",
    number: "03",
    objectLabel: "ISOMETRIC PRINT",
    portfolioId: "isometric-contributions-plus",
    focus: [-4.25, 3.15, -4.25],
  },
  {
    id: "photo-wall",
    kind: "profile",
    number: "04",
    objectLabel: "RIDE PHOTO WALL",
    personId: "shyboy0499",
    collectionId: "life",
    mediaIds: [
      "ride-01-flat-tire-tools",
      "ride-02-flat-tire-repair",
      "ride-03-tankou-camp",
      "ride-04-shuikou-bike",
      "ride-05-shuikou-town",
      "ride-06-nanping-hotel",
      "ride-07-minjiang-rainbow",
    ],
    focus: [-5.65, 3.05, 0.25],
  },
] as const satisfies readonly LineworkExhibitBinding[];
