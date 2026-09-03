<div align="center">

# Shyboy0499.github.io

### One portfolio, five interactive worlds

> **Fork note:** This site is a personal fork of
> [Qiuner/Qiuner.github.io](https://github.com/Qiuner/Qiuner.github.io) by
> [@Qiuner](https://github.com/Qiuner), rebranded and recontented for
> [@Shyboy0499](https://github.com/Shyboy0499). The design, framework (Astro + Three.js)
> and interactive world engine are Qiuner's original work; the identity, projects and
> content here belong to Shyboy0499. See [Qiuner's original](https://qiuner.github.io/).

An immersive personal portfolio built with Astro and Three.js. The same projects,
experiences, and ideas are reinterpreted as a cosmic journey, a navigable
archipelago, a living jianghu inn, a linework room, and a detailed studio.

[![Live Site](https://img.shields.io/badge/Live%20Site-Explore-111827?style=flat-square)](https://shyboy0499.github.io/)
[![GitHub Pages](https://img.shields.io/github/actions/workflow/status/Shyboy0499/Shyboy0499.github.io/deploy.yml?branch=main&style=flat-square&label=GitHub%20Pages)](https://github.com/Shyboy0499/Shyboy0499.github.io/actions/workflows/deploy.yml)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

[Explore the portfolio](https://qiuner.github.io/) · [中文](README.zh-CN.md) · [Architecture](docs/ARCHITECTURE.md)

</div>

---

## World Previews

<table>
  <tr>
    <td align="center" width="33%"><a href="https://qiuner.github.io/?world=cosmic"><img src="public/assets/avatar.webp" alt="Cosmic World preview" /><br /><strong>Cosmic World</strong></a></td>
    <td align="center" width="33%"><a href="https://qiuner.github.io/?world=archipelago"><img src="public/assets/isometric-preview.webp" alt="Archipelago World preview" /><br /><strong>Archipelago World</strong></a></td>
    <td align="center" width="33%"><a href="https://qiuner.github.io/?world=jianghu"><img src="public/jianghu-world/backgrounds/yuelai-inn-night.webp" alt="Jianghu World preview" /><br /><strong>Jianghu World</strong></a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://qiuner.github.io/?world=linework"><img src="public/linework-world/entry-poster.webp" alt="Linework World preview" /><br /><strong>Linework World</strong></a></td>
    <td align="center"><a href="https://qiuner.github.io/?world=studio"><img src="public/studio-world/entry-poster.webp" alt="Studio World preview" /><br /><strong>Studio World</strong></a></td>
  </tr>
</table>

## Highlights

### Five distinct interpretations

Each World has its own art direction, camera language, interaction model, and
Portfolio Binding. Content is not duplicated or rewritten for individual scenes.

### Portal journeys

Interactive landmarks connect the Worlds. The Runtime prepares the destination,
hands over rendering ownership only when it is ready, and rolls back to the source
World if loading fails or the journey is cancelled.

### One Content Kernel

Projects, awards, skills, timeline entries, links, and media live in one semantic
source of truth. Every World references stable portfolio IDs instead of page order
or scene coordinates.

### Adaptive 3D runtime

A shared Runtime owns the WebGL renderer, frame scheduling, input routing,
quality budgets, World Sessions, and resource cleanup. The experience adapts its
pixel ratio, effects, shadows, update rate, and transition mode to the device.

### Static-first fallback

Astro emits a readable portfolio before WebGL starts. The content remains
available when JavaScript, WebGL, or a 3D World cannot load.

---

## Local Development

```bash
git clone https://github.com/Qiuner/Qiuner.github.io.git
cd Qiuner.github.io
npm install
npm run dev
```

Open the URL printed by Astro, normally `http://localhost:4321`.

```bash
# Type and Astro diagnostics
npm run check

# Test suite
npm test

# Production build and local preview
npm run build
npm run preview
```

## Tech Stack

- **Site and static output:** Astro 7
- **3D runtime:** Three.js `WebGLRenderer`
- **Language:** TypeScript 6
- **World UI:** Vue 3 and DOM overlays
- **Testing:** Vitest + jsdom
- **Hosting:** GitHub Pages + GitHub Actions

## Repository Map

- `src/content/portfolio.ts` — canonical portfolio content
- `src/runtime/` — renderer, frame scheduling, lifecycle, Portal journeys, and resources
- `src/worlds/` — lazy World Modules and their visual bindings
- `src/pages/index.astro` — static portfolio host and Runtime mount point
- `public/` — locally hosted World and portfolio media
- `CONTEXT.zh-CN.md` — domain language and architecture invariants
- `docs/ARCHITECTURE.zh-CN.md` — implemented architecture and evolution plan
- `docs/adr/` — accepted architecture decisions

## Architecture

The project separates portfolio facts from their presentation:

```text
Content Kernel → World Binding → World Module
                         ↓
Astro Host ← Shared Runtime → Portal Journey
```

The Content Kernel is the single source of truth. World Modules are independently
loadable interpretations. The Runtime is the sole owner of renderer, browser frame
loop, input routing, quality policy, and World Session lifetime.

See [the architecture overview](docs/ARCHITECTURE.md) and
[domain context](CONTEXT.md) for the complete model.

## Deployment

Pushes to `main` are built by [the deployment workflow](.github/workflows/deploy.yml)
and published as a static site on GitHub Pages. All production media and the
Three.js dependency are owned by this repository; no runtime CDN is required.
