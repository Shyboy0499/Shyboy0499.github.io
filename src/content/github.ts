// GitHub 数据的配置：用户名、首次渲染用的快照，以及要在仓库页置顶的项目。
// 快照只保证无 JS 或 GitHub 暂时不可用时数字仍然合理；浏览器加载后会改为实时数据（见 scripts/repos.ts）。
export const GITHUB_USER = "Shyboy0499";

// 快照日期：2026-10-18。repos 按 GitHub 搜索结果统计（含私有仓库），实时页面只统计公开仓库。
export const SNAPSHOT = {
  repos: 102,
  stars: 371,
  languages: "24+",
};

// 置顶的仓库：antibody 与 precondition-library 为主要项目，Internship-Coach 是一个 Claude 技能。
export const FEATURED = ["antibody", "precondition-library", "Internship-Coach"];
