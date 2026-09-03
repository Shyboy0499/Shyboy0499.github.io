// Archipelago World Binding：把 Portfolio 项目映射成群岛世界的岛屿呈现。
// 主题、排序和视觉角色属于这里，内容语义仍由 Content Kernel 拥有。
import {
  portfolio,
  portfolioProjectById,
  type PortfolioProjectId,
} from "../../content/portfolio";

export type ArchipelagoTheme = "forest" | "volcano" | "snow" | "kame";

export interface ArchipelagoIslandSource {
  id: string;
  name: string;
  builder: string;
  description: string;
  theme: ArchipelagoTheme;
  projects: {
    id: string;
    name: string;
    url: string;
    cover?: string;
  }[];
  photos: {
    id: string;
    url: string;
    caption?: string;
    alt: string;
  }[];
}

export const archipelagoBinding = [
  {
    portfolioId: "claude-nexus",
    theme: "volcano",
  },
  {
    portfolioId: "ai-application-roadmap",
    theme: "forest",
  },
  {
    portfolioId: "isometric-contributions-plus",
    theme: "snow",
  },
] as const satisfies readonly {
  portfolioId: PortfolioProjectId;
  theme: ArchipelagoTheme;
}[];

export function createArchipelagoIslandSources(): ArchipelagoIslandSource[] {
  const seen = new Set<string>();

  return archipelagoBinding.map((binding) => {
    if (seen.has(binding.portfolioId)) {
      throw new Error(`Duplicate Archipelago binding: ${binding.portfolioId}`);
    }
    seen.add(binding.portfolioId);

    const project = portfolioProjectById(binding.portfolioId);
    const cover = project.media.find((media) => media.role === "cover");

    if (project.links.length === 0) {
      throw new Error(
        `Archipelago project has no navigable link: ${project.id}`,
      );
    }

    return {
      id: project.id,
      name: project.title,
      builder: portfolio.person.name,
      description: project.description,
      theme: binding.theme,
      projects: project.links.map((link) => ({
        id: `${project.id}-${link.id}`,
        name: link.label,
        url: link.href,
        cover: cover?.src,
      })),
      photos: project.media.map((media) => ({
        id: media.id,
        url: media.src,
        caption: media.caption,
        alt: media.alt,
      })),
    };
  });
}
