// Cosmic World Binding：把 Portfolio 稳定 ID 映射成太空世界中的章节和项目角色。
// 这里可以调整标题、路线和对齐方式，但不能改写内容内核的语义。
import type {
  PortfolioCollectionId,
  PortfolioProjectId,
} from "../../content/portfolio";

export const cosmicBinding = {
  navigation: [
    { id: "open-source", label: "WORK" },
    { id: "life", label: "ABOUT" },
    { id: "contact", label: "CONTACT" },
  ],
  hero: {
    id: "origin",
    number: "01",
    route: "ORIGIN",
    eyebrow: "BUILDING WITH DEEPSEEK",
    line: "把 LLM 从聊天框带进",
    emphasis: "真实工作流。",
    since: "OPEN SOURCE SINCE 2024",
    signals: ["DEEPSEEK", "LLM", "ML", "OPEN SOURCE"],
  },
  collections: [
    {
      portfolioId: "open-source",
      number: "02",
      route: "OPEN",
      eyebrow: "OPEN-SOURCE CONSTELLATION",
      titleLines: ["DeepSeek", "Ecosystem."],
      align: "left",
      signals: ["DEEPSEEK LIST", "DSH GIT TOOLS", "OBSIDIAN", "OPEN SOURCE"],
      enterLabel: "EXPLORE 03 PROJECTS",
    },
    {
      portfolioId: "internship",
      number: "03",
      route: "COLLAB",
      eyebrow: "ENGINEERING ACROSS PROJECTS",
      titleLines: ["参与开源", "经历."],
      align: "right",
      signals: ["PRS", "FIXES", "DOCS", "MERGED PRS"],
      enterLabel: "EXPLORE 02 PROJECTS",
    },
    {
      portfolioId: "life",
      number: "04",
      route: "LIFE",
      eyebrow: "BEYOND THE SCREEN",
      titleLines: ["Study &", "Build."],
      align: "left",
      signals: ["UTS", "LEARN", "BUILD", "CURIOUS"],
      enterLabel: "EXPLORE STUDY LOG",
    },
    {
      portfolioId: "projects",
      number: "05",
      route: "BUILD",
      eyebrow: "SELECTED BUILDS",
      titleLines: ["Projects", "in motion."],
      align: "right",
      signals: ["PRODUCT", "RESEARCH", "EXPERIMENT", "NEXT WORLD"],
    },
  ] satisfies readonly {
    portfolioId: PortfolioCollectionId;
    number: string;
    route: string;
    eyebrow: string;
    titleLines: readonly string[];
    align: "left" | "right";
    signals: readonly string[];
    enterLabel?: string;
  }[],
  projects: [
    {
      portfolioId: "awesome-deepseek-harness",
      number: "01",
      eyebrow: "DEEPSEEK ECOSYSTEM",
      titleLines: ["DeepSeek", "Harness"],
      align: "right",
    },
    {
      portfolioId: "dsh-git-tools",
      number: "02",
      eyebrow: "GIT FOR AGENTS",
      titleLines: ["dsh-git-", "tools"],
      align: "left",
    },
    {
      portfolioId: "deepseek-obsidian",
      number: "03",
      eyebrow: "KNOWLEDGE TOOLING",
      titleLines: ["DeepSeek-", "Obsidian"],
      align: "right",
    },
  ] satisfies readonly {
    portfolioId: PortfolioProjectId;
    number: string;
    eyebrow: string;
    titleLines: readonly string[];
    align: "left" | "right";
  }[],
  collaborations: [
    {
      portfolioId: "dsh-ecosystem-contribution",
      number: "01",
      eyebrow: "ECOSYSTEM ENGINEERING",
      titleLines: ["DSH", "Ecosystem"],
      align: "left",
    },
    {
      portfolioId: "dsh-dev-contribution",
      number: "02",
      eyebrow: "DEVELOPMENT CONTRIBUTIONS",
      titleLines: ["dsh", "Development"],
      align: "right",
    },
  ] satisfies readonly {
    portfolioId: PortfolioProjectId;
    number: string;
    eyebrow: string;
    titleLines: readonly string[];
    align: "left" | "right";
  }[],
  contact: {
    number: "06",
    eyebrow: "CONTACT",
    title: "LET'S BUILD",
    emphasis: "SOMETHING USEFUL.",
  },
} as const;
