# Build & Dev

This repo is a Hugo multi-site monorepo. Each site lives in `sites/<site>/` and shares a common theme override layer in `themes/overrides/`.

## Primary commands (what you actually run)

- Dev server: `npm run <site>`
- Production build: `npm run build:<site>`

Examples:

- `npm run rank-utah`
- `npm run build:novagutter`

These are wrappers around the generic orchestrators:

- `SITE=<site> npm run dev:site` → `scripts/site-dev.mjs`
- `SITE=<site> npm run build:site` → `scripts/site-build.mjs`

## Shared config stacking (critical)

All builds/dev must include the shared config file **first**, then the site config:

- `themes/overrides/config.shared.toml`
- `sites/<site>/config.toml`

The scripts enforce this by running Hugo with:

- `--config "../../themes/overrides/config.shared.toml,config.toml"`

## Dev behavior (preflight link checking)

Your local workflow is:

1. `npm run <site>`
2. push

To ensure you see broken links locally (before CI surprises), `scripts/site-dev.mjs`:

- does a quick Hugo build to a temp folder
- runs `scripts/check-links.mjs` against built HTML
- then starts `hugo server` via `scripts/run-hugo-server.mjs`

To disable the quick link check (faster startup):

- set `DEV_LINK_CHECK=0`

Example:

```zsh
DEV_LINK_CHECK=0 SITE=rank-utah npm run dev:site
```

## CI / prod parity (pnpm)

In CI or Cloudflare Pages, use:

```zsh
pnpm install --frozen-lockfile
pnpm run build:<site>
```

## Cloudflare Pages notes

- Publish directory should be: `sites/<site>/public`
- Hugo should be extended and modern (this repo has worked with `hugo v0.151+extended`)

If you change CSS pipeline behavior or fingerprinted bundle paths, purge CDN cache so HTML and CSS fingerprints don’t mismatch.
