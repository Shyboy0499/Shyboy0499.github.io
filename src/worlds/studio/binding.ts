// Studio Binding 把 Portfolio 条目映射为工作室中的可交互物件。
// 坐标和镜头焦点属于本世界，人物与项目语义仍由 Content Kernel 持有。
import type {
  PortfolioCollectionId,
  PortfolioHobbyId,
  PortfolioPersonId,
  PortfolioProjectId,
} from "../../content/portfolio";

export type StudioExhibitId =
  | "workstation"
  | "roadmap-board"
  | "contribution-frame"
  | "research-poster"
  | "latte-art"
  | "fishing"
  | "gym";

interface StudioExhibitBindingBase {
  readonly id: StudioExhibitId;
  readonly objectLabel: string;
  readonly focus: readonly [number, number, number];
  // 选中时的镜头水平角；右墙展品朝向 -X，必须转过去才能正对。省略则保持当前角度。
  readonly yaw?: number;
}

export interface StudioProjectBinding extends StudioExhibitBindingBase {
  readonly kind: "project";
  readonly portfolioId: PortfolioProjectId;
}

export interface StudioProfileBinding extends StudioExhibitBindingBase {
  readonly kind: "profile";
  readonly personId: PortfolioPersonId;
  readonly collectionId: PortfolioCollectionId;
  readonly mediaIds: readonly string[];
}

export interface StudioHobbyBinding extends StudioExhibitBindingBase {
  readonly kind: "hobby";
  readonly hobbyId: PortfolioHobbyId;
}

export type StudioExhibitBinding =
  | StudioProjectBinding
  | StudioProfileBinding
  | StudioHobbyBinding;

// 右墙展品的统一视角：镜头位于墙前偏房间前方，正对墙面。
const RIGHT_WALL_YAW = -1.3;

export const studioBinding = [
  {
    id: "workstation",
    kind: "project",
    objectLabel: "MAIN WORKSTATION",
    portfolioId: "awesome-deepseek-harness",
    focus: [0.1, 2.15, -3.65],
  },
  {
    id: "roadmap-board",
    kind: "project",
    objectLabel: "ROADMAP BOARD",
    portfolioId: "dsh-git-tools",
    focus: [-2.6, 3.45, -4.72],
  },
  {
    id: "contribution-frame",
    kind: "project",
    objectLabel: "CONTRIBUTION FRAME",
    portfolioId: "deepseek-obsidian",
    focus: [3.25, 3.55, -4.72],
  },
  {
    id: "research-poster",
    kind: "project",
    objectLabel: "RESEARCH POSTER",
    portfolioId: "precondition-library",
    focus: [5.6, 3.5, -3.55],
    yaw: RIGHT_WALL_YAW,
  },
  {
    id: "latte-art",
    kind: "hobby",
    objectLabel: "COFFEE BAR",
    hobbyId: "latte-art",
    focus: [5.4, 2.6, -0.6],
    yaw: RIGHT_WALL_YAW,
  },
  {
    id: "fishing",
    kind: "hobby",
    objectLabel: "FISHING ROD",
    hobbyId: "fishing",
    focus: [5.4, 2.4, 1.55],
    yaw: RIGHT_WALL_YAW,
  },
  {
    id: "gym",
    kind: "hobby",
    objectLabel: "DUMBBELLS",
    hobbyId: "gym",
    focus: [5.2, 2.0, 3.4],
    yaw: RIGHT_WALL_YAW,
  },
] as const satisfies readonly StudioExhibitBinding[];
