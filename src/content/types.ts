// Portfolio 内容结构类型；这些类型描述语义数据，不包含任何 World 呈现坐标。
// 视觉映射由各 World Binding 通过稳定 ID 连接到这里。
export interface PortfolioLink {
  id: string;
  label: string;
  href: string;
}

export interface PortfolioMetric {
  label: string;
  value: string;
  capturedAt?: string;
}

export interface PortfolioMedia {
  id: string;
  role: "cover" | "gallery" | "portrait";
  src: string;
  alt: string;
  caption?: string;
}

export interface GitHubStarSource {
  repo: string;
  stars: number;
  capturedAt: string;
}

export interface PortfolioPerson {
  id: string;
  name: string;
  shortName: string;
  location: string;
  summary: string;
  description: string;
  interests: readonly string[];
  portrait: PortfolioMedia;
  links: readonly PortfolioLink[];
  githubStarSources: readonly GitHubStarSource[];
}

export interface PortfolioProject {
  id: string;
  title: string;
  summary: string;
  description: string;
  metrics: readonly PortfolioMetric[];
  links: readonly PortfolioLink[];
  media: readonly PortfolioMedia[];
  tags: readonly string[];
}

export interface PortfolioCollection {
  id: string;
  title: string;
  summary: string;
  description: string;
  entryIds: readonly string[];
  media: readonly PortfolioMedia[];
}
