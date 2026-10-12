# Shyboy0499.github.io

Personal site for Chris Yu — a minimal, static landing page linking to selected
GitHub projects. Built with [Astro](https://astro.build/) and deployed to GitHub
Pages.

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

- `src/pages/index.astro` — the entire site (content + styles inline)
- `astro.config.mjs` — static output config
