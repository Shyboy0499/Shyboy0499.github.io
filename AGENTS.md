# AGENTS.md

## 项目说明 / Project

本仓库是 Chris Yu 的个人站点（`Shyboy0499.github.io`），一个用 Astro 构建、部署到
GitHub Pages 的极简静态页面。整站内容与样式都集中在 `src/pages/index.astro`。

This repo is Chris Yu's personal site — a minimal static page built with Astro
and deployed to GitHub Pages. All content and styles live in
`src/pages/index.astro`.

## 开发规范 / Conventions

- 只改与当前需求直接相关的代码，不顺手重构无关内容。
- 新增项目条目时，编辑 `src/pages/index.astro` 中的 `projects` 数组。
- 提交遵循 Conventional Commits：`type(scope): 中文说明 / English summary`。
- 修改后运行 `npm run build` 确认静态构建通过，不要声称未运行的验证已通过。
- 新增或修改的代码注释使用中文，文件头保留 1–2 行职责说明。
