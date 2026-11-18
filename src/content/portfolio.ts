// Portfolio 内容内核：只保存个人资料的语义、链接和媒体引用。
// 世界坐标、相机路径、视觉角色和布局都必须放在各 World Binding 中。
import type {
  PortfolioCollection,
  PortfolioPerson,
  PortfolioProject,
  PortfolioMedia,
} from "./types";
import { pageLang, type Lang } from "../i18n";

// 中文是内容源；英文只覆盖可读文案，id、链接、指标值和媒体路径始终共用同一份。
const portfolioZh = {
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
      media: [
        {
          id: "build-01-hello-deepseek",
          role: "gallery",
          src: "/assets/build-log/build-01-hello-deepseek.webp",
          alt: "Hello, DeepSeek：从一个 API key 开始",
        },
        {
          id: "build-02-curate-ecosystem",
          role: "gallery",
          src: "/assets/build-log/build-02-curate-ecosystem.webp",
          alt: "Curate the Ecosystem：整理 DeepSeek Harness 生态清单",
        },
        {
          id: "build-03-ship-plugin",
          role: "gallery",
          src: "/assets/build-log/build-03-ship-plugin.webp",
          alt: "Ship a Plugin：为 dsh 写本地 Git 工具",
        },
        {
          id: "build-04-open-source-prs",
          role: "gallery",
          src: "/assets/build-log/build-04-open-source-prs.webp",
          alt: "Open Source PRs：在 DSH 生态里提交 PR",
        },
        {
          id: "build-05-knowledge-llm",
          role: "gallery",
          src: "/assets/build-log/build-05-knowledge-llm.webp",
          alt: "Knowledge × LLM：DeepSeek-Obsidian 正在构建",
        },
        {
          id: "build-06-learn-by-building",
          role: "gallery",
          src: "/assets/build-log/build-06-learn-by-building.webp",
          alt: "Learn by Building：在悉尼学习 LLM 与机器学习",
        },
        {
          id: "build-07-this-room",
          role: "gallery",
          src: "/assets/build-log/build-07-this-room.webp",
          alt: "This Room：把作品集做成一个 3D 房间",
        },
      ] as readonly PortfolioMedia[],
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
      media: [
        { id: "deepseek-harness-cover", role: "cover", src: "/assets/projects/deepseek-harness-cover.webp", alt: "DeepSeek Harness 封面" },
      ] as readonly PortfolioMedia[],
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
      media: [
        { id: "dsh-git-tools-cover", role: "cover", src: "/assets/projects/dsh-git-tools-cover.webp", alt: "dsh-git-tools 封面" },
      ] as readonly PortfolioMedia[],
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
      media: [
        { id: "deepseek-obsidian-cover", role: "cover", src: "/assets/projects/deepseek-obsidian-cover.webp", alt: "DeepSeek-Obsidian 封面" },
      ] as readonly PortfolioMedia[],
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

type PortfolioText = { title?: string; summary?: string; description?: string };

const portfolioEn = {
  metadata: {
    description:
      "Shyboy0499's 3D portfolio. Follow four paths — personal projects, open-source collaboration, study and experiments — into each piece of work.",
  },
  person: {
    summary: "I'm Shyboy, a university student in Sydney focused on DeepSeek, LLMs and machine learning.",
    description:
      "I build AI tools, DeepSeek ecosystem plugins and immersive web experiences, and collaborate across open-source projects and platforms.",
    interests: ["DeepSeek", "LLM", "ML", "Open Source"],
  },
  collections: {
    "open-source": {
      summary: "Open-source projects growing inside the DeepSeek ecosystem.",
      description:
        "From plugins and tools to curated lists — turning everyday friction into software people can actually use.",
    },
    internship: {
      title: "Open Source Contributions",
      summary: "A record of collaboration across projects.",
      description:
        "Beyond my own projects: pull requests, fixes and engineering work contributed to other people's open-source repositories.",
    },
    life: {
      summary: "Learning, logged one build at a time.",
      description:
        "From coursework to experiments — how a student keeps learning by building and shipping in the open.",
    },
    projects: {
      summary: "Work still in motion beyond open source.",
      description:
        "Courses, competitions, experiments and long-running projects — the process, the results and where they go next.",
    },
  } satisfies Record<string, PortfolioText>,
  projects: {
    "awesome-deepseek-harness": {
      summary: "A curated list of DeepSeek plugins and ecosystem tools.",
      description:
        "Collects plugins, skills, MCP servers and tools from the DeepSeek Harness ecosystem into a continuously updated list.",
    },
    "dsh-git-tools": {
      summary: "Local Git tools for DeepSeek Harness.",
      description:
        "Local git tools for DeepSeek Harness (dsh) — git_status, git_diff, git_log and git_commit — so agents can work with repositories more smoothly.",
    },
    "deepseek-obsidian": {
      summary: "Connecting DeepSeek workflows to knowledge management.",
      description:
        "Brings DeepSeek workflows into Obsidian so the model can help capture, organise and retrieve a personal knowledge base.",
    },
    "dsh-ecosystem-contribution": {
      summary: "Multi-repository collaboration across the DeepSeek Harness ecosystem.",
      description:
        "Ongoing pull requests across the DeepSeek Harness ecosystem: maintaining lists and fixing documentation and build-path issues.",
    },
    "dsh-dev-contribution": {
      summary: "Ongoing development across dsh ecosystem tools.",
      description:
        "Features, tests and documentation contributed to DeepSeek Harness and the tools around it.",
    },
  } satisfies Record<string, PortfolioText>,
  mediaAlt: {
    "deepseek-harness-cover": "DeepSeek Harness cover",
    "dsh-git-tools-cover": "dsh-git-tools cover",
    "deepseek-obsidian-cover": "DeepSeek-Obsidian cover",
    "build-01-hello-deepseek": "Hello, DeepSeek: it started with an API key",
    "build-02-curate-ecosystem": "Curate the Ecosystem: a DeepSeek Harness list",
    "build-03-ship-plugin": "Ship a Plugin: local Git tools for dsh",
    "build-04-open-source-prs": "Open Source PRs across the DSH ecosystem",
    "build-05-knowledge-llm": "Knowledge × LLM: DeepSeek-Obsidian in progress",
    "build-06-learn-by-building": "Learn by Building: studying LLMs and ML in Sydney",
    "build-07-this-room": "This Room: a portfolio built as a 3D space",
  } as Record<string, string>,
};

function localizeMedia<T extends { id: string; alt: string }>(media: readonly T[]): readonly T[] {
  return media.map((item) => ({ ...item, alt: portfolioEn.mediaAlt[item.id] ?? item.alt }));
}

// 返回与中文源同构的数据，使 World 的类型与稳定 ID 不受语言影响。
export function portfolioFor(lang: Lang): typeof portfolioZh {
  if (lang === "zh") return portfolioZh;
  const collectionText = portfolioEn.collections as Record<string, PortfolioText>;
  const projectText = portfolioEn.projects as Record<string, PortfolioText>;
  return {
    ...portfolioZh,
    metadata: { ...portfolioZh.metadata, ...portfolioEn.metadata },
    person: { ...portfolioZh.person, ...portfolioEn.person },
    collections: portfolioZh.collections.map((collection) => ({
      ...collection,
      ...collectionText[collection.id],
      media: localizeMedia(collection.media),
    })),
    projects: portfolioZh.projects.map((project) => ({
      ...project,
      ...projectText[project.id],
      media: localizeMedia(project.media),
    })),
  } as unknown as typeof portfolioZh;
}

export const portfolio = portfolioFor(pageLang());

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
