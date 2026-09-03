// Studio 墙板资产负责路线图板与贡献图框两块可交互图片展品。
// 展品语义来自 binding，图片材质加载由 StudioRoom 注入。
import type { StudioExhibitBinding } from "../../binding";
import type { StudioPropKit } from "./studio-prop-kit";

export function createStudioBoards(
  kit: StudioPropKit,
  roadmap: StudioExhibitBinding,
  contributions: StudioExhibitBinding,
): void {
  const roadmapGroup = kit.imagePanel(
    kit.scene,
    "/assets/roadmap-cover.webp",
    [2.25, 1.28],
    [-1.65, 3.65, -4.82],
  );
  kit.registerExhibit(roadmap, roadmapGroup);
  kit.addHitTarget("roadmap-board", [2.55, 1.58, 0.35], [-1.65, 3.65, -4.7]);

  const contributionGroup = kit.imagePanel(
    kit.scene,
    "/assets/isometric-preview.webp",
    [2.15, 1.42],
    [2.42, 3.72, -4.82],
  );
  kit.registerExhibit(contributions, contributionGroup);
  kit.addHitTarget("contribution-frame", [2.45, 1.72, 0.35], [2.42, 3.72, -4.7]);
}
