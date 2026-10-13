# AGENTS.md

## 项目说明 / Project

本仓库是 Chris Yu 的个人站点（`Shyboy0499.github.io`），一个用 Astro 构建、部署到
GitHub Pages 的站点：顶部是 Three.js 3D 可漫游入口，下方是静态作品与关于。
- 内容数据：`src/content/projects.ts`（个人信息与作品列表的唯一来源）
- 页面结构与样式：`src/pages/index.astro`
- 3D 运行时：`src/scripts/`（`playground.ts` 场景与交互，`world-shaders.ts` 着色器，`trail.ts` 拖尾）

This repo is Chris Yu's personal site, built with Astro and deployed to GitHub
Pages: a playable Three.js 3D intro at the top, followed by a static portfolio
and About section.
- Content data: `src/content/projects.ts` (the single source for profile and projects)
- Page structure and styles: `src/pages/index.astro`
- 3D runtime: `src/scripts/` (`playground.ts` scene and interaction, `world-shaders.ts` shaders, `trail.ts` trail)

## 开发规范 / Conventions

- 只改与当前需求直接相关的代码，不顺手重构无关内容。
- 新增项目条目时，编辑 `src/content/projects.ts` 中的 `projects` 数组；3D 基座按数组顺序生成，建议不超过 5 个。
- 修改 3D 运行时时保持 WebGL 不可用时的回退：`playground.ts` 失败时只标记 `no-webgl`，静态内容必须仍可用。
- 提交遵循 Conventional Commits：`type(scope): 中文说明 / English summary`。
- 修改后运行 `npm run build` 确认静态构建通过，不要声称未运行的验证已通过。
- 新增或修改的代码注释使用中文，文件头保留 1–2 行职责说明。
