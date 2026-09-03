# ADR-0003：采用静态优先的 Astro 宿主

[English](0003-static-first-astro-host.md)

- 状态：已接受
- 日期：2026-08-02

## 背景

即使 JavaScript、WebGL 或某个世界失败，Portfolio 仍必须可读、可搜索、可链接，并能部署在 GitHub Pages。交互体验不应强迫全部个人内容进入一个仅靠客户端渲染的应用。

## 决策

使用 Astro 静态输出作为文档宿主，Vite 负责构建，TypeScript 负责 Content Kernel 和 Runtime。交互世界按需加载。Vue 是当前 Archipelago World UI Adapter 的表现层技术。其他 World 也可以在自身 Adapter 内使用不同的局部 UI runtime，例如 React，但这些 runtime 不拥有整站导航、内容、渲染、浏览器帧循环或跨世界状态。

## 后果

- GitHub Pages 仍只接收普通静态文件。
- 3D Runtime 启动前，Portfolio 内容已经存在。
- 只有交互区域需要支付 JavaScript 成本。
- 仓库会新增构建步骤和 GitHub Actions 部署。
