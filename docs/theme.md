# Theme (Light/Dark) System

This repo’s theme behavior is **runtime-driven**: the JS bootstrap sets state on `<html>`/`<body>`, and Tailwind v4 is configured so `dark:` utilities respond to that state (not OS media queries).

## Runtime signals

The bootstrap maintains these signals:

- `.dark` class on `<html>` and `<body>`
- `data-theme="dark|light"` on `<html>` and `<body>`
- `data-force-theme="dark|light|"` on `<html>` (optional override)

## Decision order

On first paint (and then reactively on changes), theme is chosen in this order:

1. `params.forceTheme` if set to `"light"` or `"dark"` (comes from `<html data-force-theme="...">`)
2. Stored preference in `localStorage` (set by the theme toggle)
3. `params.defaultTheme`:
   - `"dark"` → always dark
   - `"light"` → always light
   - `"auto"` → follow OS (`prefers-color-scheme`)

## Storage keys (per-site; avoids cross-site dev leakage)

Theme preference is stored as:

- `pref-theme:<siteKey>`

Where:

- `siteKey` is derived from the `SITE` env var passed to Hugo as `HUGO_SITE` by the build/dev scripts.

This prevents the classic localhost “same origin” problem where multiple sites would otherwise share a single key.

## Localhost auto-recovery (dev safety)

To avoid getting stuck in the wrong theme during local dev:

- On `localhost` only, if a stored preference conflicts with the OS while `defaultTheme="auto"` and no `forceTheme` is set, the bootstrap clears the stored preference **once** and falls back to OS.
- It marks this recovery with: `pref-theme:recovered:<siteKey> = "1"`.

## Per-site exception: novagutter is forced light

- `sites/novagutter/config.toml` sets:
  - `params.forceTheme = "light"`
  - `params.disableThemeToggle = true`

All other sites default to `defaultTheme = "auto"` via `themes/overrides/config.shared.toml`.

## Tailwind v4 details (how `dark:` works here)

Tailwind v4 is configured so `dark:` utilities respond to a selector-based variant:

- `themes/overrides/assets/css/_variants.css`
  - `@custom-variant dark (:where(.dark, [data-theme="dark"]) &);`

Important: Tailwind v4 emits nested CSS; PostCSS must apply nesting.

- `postcss.config.cjs` includes `postcss-nesting`.

## Where the bootstrap lives

There are three places that must stay in sync:

- `themes/overrides/layouts/partials/head.html`
- `themes/overrides/layouts/_default/flowbite.html`
- `themes/overrides/layouts/search/baseof.html`

## Troubleshooting checklist

- Site “stuck” in light/dark:
  - Check `<html data-force-theme>` first. If it’s `light`/`dark`, it wins.
  - If `data-force-theme` is empty and `defaultTheme="auto"`, check `localStorage` for `pref-theme:<siteKey>`.
- Localhost recovery confirmation:
  - If it auto-cleared, you’ll see `pref-theme:recovered:<siteKey> = "1"`.
- `.dark` is present but UI still looks light:
  - Inspect compiled CSS for selectors like `:where(.dark,[data-theme=dark]) .dark\:...`.
  - If you see nested `&` blocks, PostCSS nesting likely didn’t run.
- OS switching doesn’t update the page:
  - The bootstrap listens to `(prefers-color-scheme: dark)` changes, but devtools emulation can behave differently; try a full refresh.
