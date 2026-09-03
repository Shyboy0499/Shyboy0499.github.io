// Portfolio 内容内核：只保存个人资料的语义、链接和媒体引用。
// 世界坐标、相机路径、视觉角色和布局都必须放在各 World Binding 中。
import type {
  PortfolioCollection,
  PortfolioPerson,
  PortfolioProject,
  PortfolioMedia,
} from "./types";

export const portfolio = {
  metadata: {
    title: "Shyboy0499 | UTS · DeepSeek / LLM / ML",
    description:
      "Shyboy0499 的 3D 个人作品集。沿着个人项目、开源协作、学习与实验四条路径，进入每一组经历的内部。",
    ogDescription:
      "A spatial portfolio of open-source work, learning, and selected projects.",
  },
  person: {
    id: "shyboy0499",
    name: "SHYBOY0499",
    shortName: "S",
    location: "Sydney, AU",
    summary: "我是 Shyboy，一名来自悉尼、专注 DeepSeek、LLM 与机器学习的大学生。",
    description:
      "持续构建 AI 工具、DeepSeek 生态插件与沉浸式 Web 体验，也参与跨项目、跨平台的开源协作。",
    interests: ["DeepSeek", "LLM", "ML", "开源工程"],
    portrait: {
      id: "shyboy0499-avatar",
      role: "portrait",
      src: "/assets/avatar.webp",
      alt: "Shyboy0499",
      caption: "Shyboy0499",
    },
    links: [
      { id: "github", label: "GITHUB", href: "https://github.com/Shyboy0499" },
      { id: "email", label: "EMAIL", href: "mailto:saltlight0609@gmail.com" },
    ],
    githubStarSources: [
      { repo: "Shyboy0499/awesome-deepseek-harness", stars: 1, capturedAt: "2026-09-03" },
      { repo: "Shyboy0499/awesome-deepseek-mcp", stars: 0, capturedAt: "2026-09-03" },
      { repo: "Shyboy0499/dsh-git-tools", stars: 2, capturedAt: "2026-09-03" },
      { repo: "Shyboy0499/DeepSeek-Obsidian", stars: 0, capturedAt: "2026-09-03" },
      { repo: "Shyboy0499/Shyboy0499.github.io", stars: 3, capturedAt: "2026-09-03" },
    ],
  } satisfies PortfolioPerson,
  collections: [
    {
      id: "open-source",
      title: "Open Source Systems",
      summary: "DeepSeek 生态里持续生长的开源项目。",
      description:
        "从插件、工具到知识清单，把具体的不顺手做成真正可以被使用的软件。",
      entryIds: ["awesome-deepseek-harness", "dsh-git-tools", "deepseek-obsidian"],
      media: [] as readonly PortfolioMedia[],
    },
    {
      id: "internship",
      title: "参与开源经历",
      summary: "跨项目的开源协作记录。",
      description:
        "不只介绍自己的项目，也把参与别人的开源项目、提交 PR、修复问题和补齐工程链路的经历单独展开。",
      entryIds: ["dsh-ecosystem-contribution", "dsh-dev-contribution"],
      media: [] as readonly PortfolioMedia[],
    },
    {
      id: "life",
      title: "Study & Build",
      summary: "把学习变成路上的注脚。",
      description:
        "从课程到实验，把一个学生如何通过构建和开源不断学习的过程，放进这座岛屿。",
      entryIds: [] as readonly string[],
      media: [] as readonly PortfolioMedia[],
    },
    {
      id: "projects",
      title: "Projects in Motion",
      summary: "开源之外，仍在演化的作品。",
      description:
        "课程、比赛、实验与长期项目，在这里保留过程、结果和继续生长的方向。",
      entryIds: [] as readonly string[],
      media: [] as readonly PortfolioMedia[],
    },
  ] satisfies readonly PortfolioCollection[],
  projects: [
    {
      id: "awesome-deepseek-harness",
      title: "DeepSeek Harness",
      summary: "DeepSeek 插件与生态的精选清单。",
      description:
        "整理 DeepSeek Harness 生态里的插件、技能、MCP 服务器与工具，做成一份可持续更新的中文清单。",
      metrics: [
        { label: "TYPE", value: "LIST", capturedAt: "2026-09-03" },
        { label: "FOCUS", value: "DEEPSEEK" },
        { label: "STATUS", value: "LIVE" },
      ],
      links: [
        {
          id: "source",
          label: "SOURCE",
          href: "https://github.com/Shyboy0499/awesome-deepseek-harness",
        },
      ],
      media: [] as readonly PortfolioMedia[],
      tags: ["DeepSeek", "Open Source", "Ecosystem"],
    },
    {
      id: "dsh-git-tools",
      title: "dsh-git-tools",
      summary: "DeepSeek Harness 的本地 Git 工具集。",
      description:
        "为 DeepSeek Harness (dsh) 编写的本地 git 工具：git_status、git_diff、git_log、git_commit，让 agent 更顺手地操作仓库。",
      metrics: [
        { label: "STARS", value: "2", capturedAt: "2026-09-03" },
        { label: "FOCUS", value: "GIT" },
        { label: "STATUS", value: "LIVE" },
      ],
      links: [
        { id: "source", label: "SOURCE", href: "https://github.com/Shyboy0499/dsh-git-tools" },
      ],
      media: [] as readonly PortfolioMedia[],
      tags: ["Git", "DeepSeek", "Plugins"],
    },
    {
      id: "deepseek-obsidian",
      title: "DeepSeek-Obsidian",
      summary: "DeepSeek 工作流与知识管理的连接工具。",
      description:
        "把 DeepSeek 工作流接入 Obsidian 知识管理，让模型的能力服务于个人知识库的沉淀与检索。",
      metrics: [
        { label: "FOCUS", value: "OBSIDIAN" },
        { label: "STATUS", value: "BUILDING" },
      ],
      links: [
        { id: "source", label: "SOURCE", href: "https://github.com/Shyboy0499/DeepSeek-Obsidian" },
      ],
      media: [] as readonly PortfolioMedia[],
      tags: ["DeepSeek", "Obsidian", "Tooling"],
    },
    {
      id: "dsh-ecosystem-contribution",
      title: "DSH Ecosystem",
      summary: "参与 DeepSeek Harness 生态的多仓库协作。",
      description:
        "在 DeepSeek Harness 生态中持续提交 PR、维护清单、修复文档与构建路径问题。",
      metrics: [
        { label: "MERGED PRS", value: "100+", capturedAt: "2026-09-03" },
        { label: "FOCUS", value: "ECOSYSTEM" },
      ],
      links: [
        { id: "repo", label: "REPOSITORIES", href: "https://github.com/Shyboy0499" },
      ],
      media: [] as readonly PortfolioMedia[],
      tags: ["Open Source", "DeepSeek", "Docs"],
    },
    {
      id: "dsh-dev-contribution",
      title: "dsh Development",
      summary: "参与 dsh 生态工具的持续开发。",
      description:
        "围绕 DeepSeek Harness 及其周边工具，持续提交功能、测试与文档贡献。",
      metrics: [
        { label: "MERGED PRS", value: "100+", capturedAt: "2026-09-03" },
        { label: "FOCUS", value: "DEVELOPMENT" },
      ],
      links: [
        { id: "repo", label: "GITHUB", href: "https://github.com/Shyboy0499" },
      ],
      media: [] as readonly PortfolioMedia[],
      tags: ["Open Source", "DeepSeek", "Contributions"],
    },
  ] satisfies readonly PortfolioProject[],
} as const;

const projectsById = new Map(
  portfolio.projects.map((project) => [project.id, project]),
);
const collectionsById = new Map(
  portfolio.collections.map((collection) => [collection.id, collection]),
);

export type PortfolioProjectId = (typeof portfolio.projects)[number]["id"];
export type PortfolioCollectionId =
  (typeof portfolio.collections)[number]["id"];
export type PortfolioPersonId = (typeof portfolio.person)["id"];

function validatePortfolio(): void {
  const projectIds = new Set<string>();

  for (const project of portfolio.projects) {
    if (projectIds.has(project.id)) {
      throw new Error(`Duplicate Portfolio Project ID: ${project.id}`);
    }
    projectIds.add(project.id);

    const linkIds = new Set<string>();
    for (const link of project.links) {
      if (linkIds.has(link.id)) {
        throw new Error(
          `Duplicate link ID in Portfolio Project ${project.id}: ${link.id}`,
        );
      }
      linkIds.add(link.id);
    }

    const mediaIds = new Set<string>();
    for (const media of project.media) {
      if (mediaIds.has(media.id)) {
        throw new Error(
          `Duplicate media ID in Portfolio Project ${project.id}: ${media.id}`,
        );
      }
      mediaIds.add(media.id);
    }
  }

  const collectionIds = new Set<string>();
  for (const collection of portfolio.collections) {
    if (collectionIds.has(collection.id)) {
      throw new Error(`Duplicate Portfolio Collection ID: ${collection.id}`);
    }
    collectionIds.add(collection.id);

    for (const entryId of collection.entryIds) {
      if (!projectIds.has(entryId)) {
        throw new Error(
          `Portfolio Collection ${collection.id} references unknown entry: ${entryId}`,
        );
      }
    }

    const mediaIds = new Set<string>();
    for (const media of collection.media) {
      if (mediaIds.has(media.id)) {
        throw new Error(
          `Duplicate media ID in Portfolio Collection ${collection.id}: ${media.id}`,
        );
      }
      mediaIds.add(media.id);
    }
  }
}

validatePortfolio();

export function portfolioProjectById(id: PortfolioProjectId) {
  const project = projectsById.get(id);
  if (!project) throw new Error(`Unknown Portfolio Project: ${id}`);
  return project;
}

export function portfolioCollectionById(id: PortfolioCollectionId) {
  const collection = collectionsById.get(id);
  if (!collection) throw new Error(`Unknown Portfolio Collection: ${id}`);
  return collection;
}

export function portfolioPersonById(id: PortfolioPersonId) {
  if (portfolio.person.id !== id) throw new Error(`Unknown Portfolio Person: ${id}`);
  return portfolio.person;
}
