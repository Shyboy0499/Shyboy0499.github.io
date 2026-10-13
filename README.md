# Shyboy0499.github.io

Personal site for Chris Yu — a playable 3D intro (Three.js) followed by a static
portfolio of selected GitHub projects. Built with [Astro](https://astro.build/)
and deployed to GitHub Pages.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # static build to ./dist
npm run preview  # preview the build
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site
and publishes `./dist` to GitHub Pages.

## Structure

- `src/content/projects.ts` — profile and project data (edit this to change content)
- `src/pages/index.astro` — page layout, styles, and the loading sequence
- `src/scripts/playground.ts` — the 3D scene, character movement, and project interaction
- `src/scripts/world-shaders.ts` — floor and sky shaders
- `src/scripts/trail.ts` — the character's dust trail
- `astro.config.mjs` — static output config

If WebGL is unavailable, the 3D intro is hidden and the static project list and
About section still render.
