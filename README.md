# Shyboy0499.github.io

Personal site for Chris Yu — a 2D pixel-room quest that gathers my info (walk
around, read objects, finish missions to open the gate), followed by a portfolio,
studio, and About section. Built with [Astro](https://astro.build/) and deployed
to GitHub Pages.

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

- `src/content/projects.ts` — profile and project data
- `src/content/missions.ts` — quest missions and the dialog text for each object
- `src/content/gallery.ts` — studio artworks
- `src/pages/index.astro` — page layout and styles
- `src/scripts/quest.ts` — game loop, input, dialogs, and mission progress
- `src/scripts/quest-map.ts` — room layout (edit `PLACEMENTS` to move objects)
- `src/scripts/quest-sprites.ts` — pixel-art character and objects
- `scripts/gen-art.mjs` — generates the SVG artworks in `public/art/`
- `astro.config.mjs` — static output config

If canvas 2D is unavailable, the quest is hidden and the portfolio, studio, and
About sections still render.
