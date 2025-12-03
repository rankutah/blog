## Standard Analytics Configuration

All sites now use a consistent `[params.analytics]` block patterned after `sites/rank-utah/config.toml`.

### Required Structure

```
[params.analytics]
  # Default deferred load. Set to 0 for immediate load on a specific site.
  delayMs = 5000
  # Optional: interaction gating (set in site or shared config)
  # loadEvents = ["scroll", "mousemove", "touchstart", "click", "keydown"]
  # onlyOnInteraction = true

  [params.analytics.google]
    id = "G-XXXXXXX"   # GA4 measurement ID
    enabled = true      # set false or leave id blank to disable

  [params.analytics.clarity]
    id = ""            # Microsoft Clarity ID
    enabled = false

  [params.analytics.googleAds]
    id = ""            # e.g. AW-XXXXXXX
    enabled = false

  [params.analytics.meta]
    id = ""            # Meta Pixel ID
    enabled = false
```

### Migration Notes
* Legacy `googleAnalyticsID` flat param was removed (e.g. `novagutter`). Use nested `[params.analytics.google].id` instead.
* Sites with explicit `delayMs = 0` retain immediate load (e.g. `rank-utah`, `novagutter`, `blue-ridge-abbey`). Others received an explicit `delayMs = 5000` (previous implicit default was 4000ms).
* Sites without tracking previously (`cedarcitystrength`, `rodmaxfielddds`) now have a disabled analytics block for uniformity; this does not enable tracking.
* Shared config (`themes/overrides/config.shared.toml`) now centralizes: theme declaration, Goldmark unsafe settings, `outputFormats.FORMS`, home outputs (adds RSS to sites that previously omitted), default theme behavior (`defaultTheme = "auto"`, `disableThemeToggle = false`), analytics load events (`scroll, mousemove, touchstart, click, keydown`), and mounts.
* Rooftop Terrace gained RSS feed by removing its local outputs override.
* Per-site overrides remain only for: brand colors, navigation/menu, Turnstile keys, delayMs override (set to 0 for immediate load), analytics IDs, search enable flag.

### Default Theme Behavior
`defaultTheme = "auto"` chooses light or dark based on the visitor's OS preference (`prefers-color-scheme`). Users can still toggle theme because `disableThemeToggle = false`. Sites wanting a fixed theme can override locally without touching shared config.

### Analytics Loading Logic
Shared logic loads scripts on the first interaction (any of the loadEvents) OR after `delayMs` (default 5000ms). Setting `delayMs = 0` at a site level forces immediate load; events still fire but become moot.

### Posts Mount Clarification
The shared `module.mounts` includes a mount for `posts` → `content/posts`. Any top-level `posts/` directory (at repo root) becomes part of every site. Site‑specific posts remain isolated when placed under each site’s own `content/posts` path. If you later want to restrict cross‑site post sharing, remove the shared `posts` mount and add it only to blog sites.

### Permalinks
Permalinks for posts are standardized to `/:contentbasename` across sites; sites previously using another pattern (e.g. `/:slug/`) were updated. If a future site needs a different pattern (SEO or legacy redirects), override `[permalinks]` locally.

### Adding A New Site
1. Copy the block above into the new site's `config.toml`.
2. Set the GA4 ID (and any other platform IDs) and flip `enabled = true`.
3. Override `delayMs` to `0` only if you want scripts loaded immediately.
4. To rely solely on user interaction, add `onlyOnInteraction = true` and appropriate `loadEvents`.

### Search Event Suffix Strategy (Success vs Abandoned)
The shared `search.js` appends a space + emoji to the GA4 `view_search_results` `search_term` value:
* Success: `✅`
* Abandoned: `❌`

Looker Studio Derived Fields:
```
Outcome:
CASE WHEN REGEXP_MATCH(search_term, r' ✅$') THEN 'success'
     WHEN REGEXP_MATCH(search_term, r' ❌$') THEN 'abandoned' END

Base Term:
REGEXP_REPLACE(search_term, r' (✅|❌)$', '')

Success Rate:
COUNTIF(Outcome = 'success') / COUNT(Outcome)
```

### Do Not Remove
* Keep the analytics block even if all IDs are blank; it documents intent and standardizes future additions.

### Appearance & Functionality
These changes do not alter visual appearance. Behavior change: sites without an explicit delay now use a 5000ms load (was previously default 4000ms). Immediate-load sites remain unchanged.

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
  - Novagutter: `npm run novagutter`

  Dev scripts preflight a quick Hugo build and run an internal link check before starting the server. This makes local dev behavior match production more closely and surfaces broken links immediately.

- Production build:
  - Rank Utah: `npm run build:rank-utah`
  - Novagutter: `npm run build:novagutter`

These scripts pass `--config "../../themes/overrides/config.shared.toml,config.toml"` to Hugo so the shared defaults are applied before the site-level overrides.

### Automated Internal Link Checking

- After each production build and whenever you start a dev server, `scripts/check-links.mjs` scans `sites/<site>/public/**/*.html` for internal links and verifies they resolve to files or directories with `index.html`.
- If any broken internal links are found, the script fails hard, prints the broken URL and the source HTML file it was found in, and exits. This keeps builds and dev consistent and prevents surprises.
- Manual usage:
  - `node scripts/check-links.mjs --site=rank-utah`
  - `node scripts/check-links.mjs --site=novagutter`

## Notes

- No Go/Hugo Modules required. We removed all module imports and go.mod files.
- If you later want to use Hugo Modules for config stacking, re-introduce module imports and ensure Go is installed. Until then, the flag-based approach is simpler and reliable.
- Image processing uses the Markdown image render hook in `themes/overrides/layouts/_default/_markup/render-image.html` to generate AVIF sources.

## Adding a blog to a site

Make future blogs easy without sharing content across sites.

- Per-site mounts (required): In `sites/<site>/config.toml`, mount that site’s own `posts` into its blog section, and also mount local `content` when you define mounts:

  ```toml
  [[module.mounts]]
  source = "content"
  target = "content"

  [[module.mounts]]
  source = "posts"
  target = "content/blog"
  ```

- Shared-safe permalinks: Keep the pattern in `themes/overrides/config.shared.toml` so all blogs use `/blog/:contentbasename` unless overridden locally:

  ```toml
  [permalinks]
  blog = "/blog/:contentbasename"
  ```

- Section index: Add `sites/<site>/content/blog/_index.md`:

  ```md
  ---
  title: "Blog"
  layout: "flowbite"
  ---

  {{< blog-list section="blog" >}}
  ```

- Shared archetype: Use the archetype at `themes/overrides/archetypes/blog.md` to scaffold posts consistently:

  ```sh
  hugo new --source ./sites/<site> blog/my-new-post.md
  ```

- Navigation: Add a menu item to `/blog/` in the site’s `config.toml` if needed.

What belongs in shared config vs per-site:

- Shared (`themes/overrides/config.shared.toml`): permalink patterns, taxonomies, cascade/layout defaults, shortcodes/partials. These do not share content.
- Per-site (`sites/<site>/config.toml`): module mounts for `content`, `posts`, `static`, `media`, site params, menus. Keep mounts per-site to prevent any cross-site content leakage.

## Monorepo Philosophy: All Sites Act in Unison

- Uniform behavior: All sites share the same run and build processes, layout cascades, shortcodes, and styling via `themes/overrides`. Differences should be limited to content, branding colors, analytics IDs, and menus.
- Diagnosis made easy: Standardizing the pipeline across sites reduces surprises and makes debugging straightforward.
- Dev = Prod: Dev scripts preflight a build and run the automated internal link checker, matching production behavior closely.
- Avoid site-only config divergences unless absolutely necessary; prefer moving common behavior into shared config.

### Uniform-Site Change Policy

- We do not perform styling, layout, or config changes for only a subset of sites. Changes must be implemented in the shared overrides and shared configuration so every site benefits uniformly.
- If a site needs a truly unique exception, document the rationale and isolate it behind a parameter or a clearly scoped local override that does not break the shared baseline.
- Cleanup tasks (CSS, shortcodes, partials, analytics logic) should be applied across all sites. Verify by building at least two representative sites after changes.
