// Studio Binding 把 Portfolio 条目映射为工作室中的可交互物件。
// 坐标和镜头焦点属于本世界，人物与项目语义仍由 Content Kernel 持有。
import type {
  PortfolioCollectionId,
  PortfolioPersonId,
  PortfolioProjectId,
} from "../../content/portfolio";

export type StudioExhibitId =
  | "workstation"
  | "roadmap-board"
  | "contribution-frame";

interface StudioExhibitBindingBase {
  readonly id: StudioExhibitId;
  readonly objectLabel: string;
  readonly focus: readonly [number, number, number];
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

export type StudioExhibitBinding = StudioProjectBinding | StudioProfileBinding;

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
] as const satisfies readonly StudioExhibitBinding[];
