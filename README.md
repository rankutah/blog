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
- Any new first-party JS/CSS you add must be fingerprinted (Hugo Pipes) so it can be cached immutably without going stale.
	- Pattern: `resources.Get` → `minify` → `fingerprint`, then reference via `.RelPermalink`.
- Avoid site-specific template/CSS edits. If a true exception is required, gate it behind a param and document it.
- Content convention: avoid `index.md` page bundles except the site homepage (`content/_index.md`). Prefer single-file pages under `content/`.
- Content styling: prefer shared shortcodes over inline HTML in Markdown content files (`sites/<site>/content/**/*.md`). Only use raw HTML as a last resort when no shortcode fits.
	- Prefer Markdown + existing shortcodes (common ones: `hero`, `cols`/`col`, `button`, `badge`, `video`, `map-embed`, `contact-form`).
	- Do not use the `section` shortcode (unnecessary for normal content; keep only for legacy/edge cases).
	- If you find yourself writing `<div class="...">` in content, stop and either (a) use a shortcode, or (b) add/extend a shortcode in `themes/overrides/layouts/shortcodes/`.
- Customer-facing copy: use plain language and avoid tech jargon (e.g., “sprints”, “lean builds”, “workflow”).

## New site checklist (do this every time)

- Add a **Thank You** page at `sites/<site>/content/thank-you.md`:
	- Must render at `/thank-you` (`url: "/thank-you"` in front matter)
	- Must be `robotsNoIndex: true` and `sitemap.disable: true`
- Configure form redirect so submissions land on the thank-you page:
	- In `sites/<site>/config.toml` set:
		- `[params.forms] redirect = "https://<domain>/thank-you"`
	- Ensure contact pages use the shared `contact-form` shortcode (it injects the hidden `_redirect` input when `params.forms.redirect` is set).
- Include a footer for every site (preferred: Markdown footer content):
	- Add `sites/<site>/content/footer.md` with `headless: true`
	- Include links to `/privacy/` and `/terms/` in that footer content
	- If you omit `content/footer.md`, the theme falls back to a minimal default footer
- Generate legal pages for every site:
	- Add `sites/<site>/content/privacy.md` (published at `/privacy`)
	- Add `sites/<site>/content/terms.md` (published at `/terms`)
	- Keep them linked from the footer and referenced by forms (defaults to `/privacy` unless `params.privacyURL` overrides it)

## Client PDFs (notes → pages)

Some clients send PDFs with embedded notes/annotations (e.g., “sticky note” / FreeText comments). You can extract both the annotation contents (instructions) and the page text with:

```sh
python3 scripts/extract-pdf-notes.py "/absolute/path/to/client.pdf" --format md
```

Workflow:

1) Read the **Annotations** section (that’s the client’s instructions).
2) Convert the **Extracted text** into a real Markdown page under `sites/<site>/content/` (add headings + bullet lists for readability).
3) If the page should appear in the navbar, add it to that site’s menu in `sites/<site>/config.toml` under `[menu]`.
4) Verify locally with `npm run build:<site>`.

If the script fails with a missing dependency, install it with `pip3 install pypdf`.

## Services naming (Rank Utah / Clear Presence)

When updating copy for the Rank Utah site, keep service names and inclusions consistent:

- **Website Design**: includes basic search setup so the site is ready to be found (fast pages, clean structure, titles/descriptions).
- **Local Marketing**: the ongoing monthly service (no “SEO” wording in customer copy): keyword research + content alignment, Google Business Profile work, Apple Maps + Bing Places, 100+ directory listings, and reporting.
- **Do not promise review management/strategy** anywhere in marketing/service copy.

## Recent changes (notes for future debugging)

### Favicons (Google Search)

Google Search uses (at most) **one favicon per hostname** (for example, `example.com` vs `www.example.com`). Even with everything correct, it can take **several days to several weeks** for Google to recrawl and update the favicon; you can speed this up by using Search Console → URL Inspection → **Request indexing** on the home page.

Repo behavior:

- Favicon tags are emitted by the shared partial: `themes/overrides/layouts/partials/favicons.html`.
- If a site provides `sites/<site>/static/favicon.ico`, the theme emits a **stable** `<link rel="icon" href="/favicon.ico">` first (best for Google’s “stable URL” guideline), then also emits PNG sizes (48/32/16) derived from the site logo.

Requirements checklist (matches Google’s current guidance):

- Home page HTML contains a `<link rel="icon" ...>` tag.
- Favicon is **square (1:1)** and at least **8×8** (we ship **48×48**).
- Favicon URL is stable (avoid frequently changing URLs).
- Googlebot can crawl the home page and Googlebot-Image can crawl the favicon file (not blocked by `robots.txt`).

Quick verification commands:

```zsh
# Confirm the homepage emits icon links
curl -sS https://example.com/ | grep -iE "rel=icon|apple-touch-icon|shortcut icon" | head

# Confirm /favicon.ico is reachable (should be 200)
curl -sSI https://example.com/favicon.ico | sed -n '1,12p'

# Confirm www redirects cleanly to the canonical hostname (Google uses 1 favicon per hostname)
curl -sSI https://www.example.com/ | sed -n '1,12p'

# Confirm actual favicon dimensions (macOS)
tmpdir=$(mktemp -d) && cd "$tmpdir" && curl -sSLO https://example.com/favicon.ico && file favicon.ico

# Confirm Googlebot and Googlebot-Image are not blocked/challenged
curl -sSI -A 'Googlebot/2.1 (+http://www.google.com/bot.html)' https://example.com/ | sed -n '1,12p'
curl -sSI -A 'Googlebot-Image/1.0' https://example.com/favicon.ico | sed -n '1,12p'
```

### Titles: brand first

Page titles follow the brand-first pattern:

- `Site Title | Page Title`

This is implemented in shared theme templates:

- `themes/overrides/layouts/_default/flowbite.html`
- `themes/overrides/layouts/partials/head.html`
- `themes/overrides/layouts/search/baseof.html`
- `themes/overrides/layouts/partials/seo-meta.html` (OG title ordering)

### Fonts (per site)

Each site can control its fonts via `sites/<site>/config.toml`.

1) Pick fonts (Google Fonts) and set `params.fonts`

In `sites/<site>/config.toml`:

```toml
[params.fonts]
# Google Fonts CSS2 query string (everything after `css2?`)
# Example:
# load = "family=Playfair+Display:wght@400;700&family=Inter:wght@400;600;700&display=swap"
load = ""

# These become CSS variables and are used across the theme.
body    = "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif"
heading = "ui-serif,Georgia,Times New Roman,Times,serif"

# Optional overrides ("inherit" means: fall back to the defaults above)
navBrand = "inherit"  # falls back to heading
navLink  = "inherit"  # falls back to body
button   = "inherit"  # falls back to body
```

2) Vendor the fonts into the site (recommended)

This repo intentionally self-hosts the font files so you avoid external font requests.
Run:

```zsh
SITE=<site> node scripts/vendor-google-fonts.mjs
```

This will:

- Download the Google Fonts CSS defined by `params.fonts.load`
- Download referenced `.woff2` files into `sites/<site>/static/fonts/google/`
- Write a rewritten stylesheet to `sites/<site>/static/fonts/google/fonts.css`

The shared fonts partial automatically includes `/fonts/google/fonts.css` when `params.fonts.load` is set.
It also adds a deterministic `?v=<hash>` based on the CSS contents so the URL is stable across rebuilds unless the font file changes.

3) Non-Google / custom fonts (self-hosted)

If you want to ship a custom font (your own `.woff2`), the simplest pattern is:

- Put the font file(s) under `sites/<site>/static/fonts/<family>/...`
- Add `@font-face` rules by overriding the fonts partial at `sites/<site>/layouts/partials/fonts.html`
	(copy the shared partial from `themes/overrides/layouts/partials/fonts.html` and add your `@font-face` block)
- Set `params.fonts.body`/`heading` to the new `font-family` name

### Rank Utah: Stripe success /welcome page

- New completion page is `/welcome` (intended for Stripe payment link success redirects).
- Old `/confirmation` URL is kept via `301` redirects in `sites/rank-utah/static/_redirects`.
- Both `/welcome` and `/thank-you` are marked `robotsNoIndex: true` in front matter.

### Zaraz: manual delayed loader + welcome conversion dedupe

For sites using Cloudflare Zaraz (`site.Params.analytics.provider = "zaraz"`), the theme uses a manual loader in:

- `themes/overrides/layouts/partials/google_analytics.html`

Important behaviors:

- The loader injects Zaraz via same-origin `/cdn-cgi/zaraz/i.js` (less brittle than the public host).
- It is guarded to avoid double-injection (global `__cpZarazLoaderInstalled` + script id `cp-zaraz-script`).
- On `/welcome?product=...`, best-effort per-browser dedupe is applied:
	- stores a `localStorage` key `cp_welcome_conv_<product>`
	- strips the `product` query param (via `history.replaceState`) after first load so refresh/back won’t re-trigger.

If you see `"zaraz is loaded twice"` in console, note that pre-defining `window.zaraz = {}` can trigger that warning; avoid stubbing `window.zaraz`.

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
- Main shared layout: `themes/overrides/layouts/_default/flowbite.html` (name is historical; no Flowbite JS dependency)
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
