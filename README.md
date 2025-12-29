# Blog monorepo (Hugo multi-site)

This repo is a Hugo monorepo containing multiple client sites under `sites/<site>/`, all sharing one standardized UI system via `themes/overrides/`.

This README is intentionally the *short front door* (easy to scan). The detailed runbooks live in `docs/` so future Copilot (new chat, no memory) can jump straight to the relevant spec without scrolling 500 lines.

## Quick start

- Dev server: `npm run <site>`
- Production build: `npm run build:<site>`

Examples:

- `npm run rank-utah`
- `npm run build:novagutter`

Notes:

- Dev preflights a quick build + internal link check before starting `hugo server`.
- To skip that preflight (faster startup): `DEV_LINK_CHECK=0 SITE=<site> npm run dev:site`

## Non-negotiable rules

- All sites act in unison: shared behavior + shared UI.
- Styling/layout/UI changes belong in `themes/overrides/`.
- Avoid site-specific template/CSS edits. If a true exception is required, gate it behind a param and document it.
- Content convention: avoid `index.md` page bundles except the site homepage (`content/_index.md`). Prefer single-file pages under `content/`.

## Docs (start here when debugging)

- `docs/policies.md` — repo rules and what belongs where
- `docs/build-and-dev.md` — dev/build commands, config stacking, CI/prod parity
- `docs/theme.md` — dark/light system (Tailwind v4 + bootstrap + novagutter forced light)
- `docs/analytics.md` — standardized analytics block + loading logic
- `docs/message-modal.md` — message FAB/modal behavior and config
- `docs/content-and-seo.md` — content conventions, search page, SEO lints, blog mounts

## Key files map

- Shared config: `themes/overrides/config.shared.toml`
- Site config: `sites/<site>/config.toml`
- Main shared layout: `themes/overrides/layouts/_default/flowbite.html`
- CSS entry: `themes/overrides/assets/css/main.css`
- Tailwind v4 variants: `themes/overrides/assets/css/_variants.css`
- PostCSS pipeline: `postcss.config.cjs`
- Build/dev scripts: `scripts/site-build.mjs`, `scripts/site-dev.mjs`, `scripts/run-hugo-server.mjs`
- Link checks: `scripts/check-links.mjs`

- If dependencies change, refresh and commit `pnpm-lock.yaml` so prod matches local:

```zsh
pnpm install --lockfile-only
pnpm install
pnpm prune
git add pnpm-lock.yaml
git commit -m "chore: refresh lockfile after dep changes"
```

- Node >= 18 and pnpm >= 10 are enforced via `package.json` `engines`.
