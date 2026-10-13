# AGENTS.md

## 项目说明 / Project

本仓库是 Chris Yu 的个人站点（`Shyboy0499.github.io`），一个用 Astro 构建、部署到
GitHub Pages 的站点：顶部是 2D 像素房间的任务式入口，下方是作品、视觉作品与关于。
- 内容数据：`src/content/`（`projects.ts` 个人信息与作品，`missions.ts` 任务与对话，`gallery.ts` 视觉作品）
- 页面结构与样式：`src/pages/index.astro`
- 任务入口运行时：`src/scripts/`（`quest.ts` 循环、输入与任务进度，`quest-map.ts` 房间地图，`quest-sprites.ts` 像素素材）
- 生成艺术：`scripts/gen-art.mjs` 生成 `public/art/` 下的 SVG

This repo is Chris Yu's personal site, built with Astro and deployed to GitHub
Pages: a 2D pixel-room quest at the top, followed by the portfolio, studio, and
About sections.
- Content: `src/content/` (`projects.ts` profile and projects, `missions.ts` missions and dialogs, `gallery.ts` artworks)
- Page structure and styles: `src/pages/index.astro`
- Quest runtime: `src/scripts/` (`quest.ts` loop, input, and mission progress; `quest-map.ts` room map; `quest-sprites.ts` pixel art)
- Generative art: `scripts/gen-art.mjs` writes SVGs to `public/art/`

## 开发规范 / Conventions

- 只改与当前需求直接相关的代码，不顺手重构无关内容。
- 新增项目条目时，编辑 `src/content/projects.ts` 中的 `projects` 数组；数量必须与 `src/scripts/quest-map.ts` 中水晶（`C`）的个数一致，否则"See the work"任务无法完成。
- 修改房间布局时只改 `quest-map.ts` 的 `PLACEMENTS`；物件键（`sign`、`crystal:<n>`、`mailbox`、`portrait`、`door`）必须与 `content/missions.ts` 中的任务一致。
- 修改任务入口时保持无 canvas 2D 时的回退：`quest.ts` 失败时只标记 `no-canvas`，静态内容必须仍可用。
- 提交遵循 Conventional Commits：`type(scope): 中文说明 / English summary`。
- 修改后运行 `npm run build` 确认静态构建通过，不要声称未运行的验证已通过。
- 新增或修改的代码注释使用中文，文件头保留 1–2 行职责说明。
