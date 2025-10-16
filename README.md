# Blog monorepo

Shared Hugo setup for multiple client sites using a common theme (`themes/overrides` + PaperMod) and a single shared configuration file.

## How shared config works

We centralize defaults in `themes/overrides/config.shared.toml` and load it first, followed by each site's `config.toml` so site values override shared defaults.

- Load order (first wins, last overrides):
  1) `themes/overrides/config.shared.toml`
  2) `sites/<site>/config.toml`

- Shared config includes:
  - Markup (Goldmark renderer, attributes)
  - Output formats and outputs (HTML/RSS/JSON/FORMS)
  - Taxonomies (tags)
  - Section defaults (layout paddings, etc.)
  - `ignoreLogs` for raw HTML warnings

- Site config can override any value from shared config. Each site also defines `[outputFormats.FORMS]` locally so it still builds if the `--config` flag is omitted during ad-hoc runs.

## Run commands

- Dev server:
  - Rank Utah: `npm run rank-utah`
  - Nova Gutter: `npm run nova-gutter`

- Production build:
  - Rank Utah: `npm run build:rank-utah`
  - Nova Gutter: `npm run build:nova-gutter`

These scripts pass `--config "../../themes/overrides/config.shared.toml,config.toml"` to Hugo so the shared defaults are applied before the site-level overrides.

## Notes

- No Go/Hugo Modules required. We removed all module imports and go.mod files.
- If you later want to use Hugo Modules for config stacking, re-introduce module imports and ensure Go is installed. Until then, the flag-based approach is simpler and reliable.
- Image processing uses the Markdown image render hook in `themes/overrides/layouts/_default/_markup/render-image.html` to generate AVIF sources.
