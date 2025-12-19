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
## Message Modal & Floating Action Button (FAB)

This adds a site‑wide “Message” FAB that opens a modal to collect a quick inquiry. It is disabled by default across all sites and can be enabled per site via config.

### How It Works
- Modal and FAB partials: `themes/overrides/layouts/partials/message-modal.html` and `themes/overrides/layouts/partials/text-fab.html`.
- Rendering is gated in the base layout: `themes/overrides/layouts/_default/flowbite.html`.
- Styling uses the shared palette (`cardBg`/`cardBorder`) so the modal matches each site’s cards.
- Visual robustness: fixed overlay with `svh/svw` caps, internal scroll, visualViewport vertical translation, safe‑area paddings.

### Enable/Disable
- Global default (shared): `[params.messageModal].enable = false` in `themes/overrides/config.shared.toml`.
- Per‑site: set in `sites/<site>/config.toml`:

  ```toml
  [params.messageModal]
  enable = true  # or false to disable
  ```

- Gating logic: Only renders when `enable = true`. A BaseURL fallback is used only if a site has no `messageModal.enable` param at all; the shared config provides the param, so fallback does not apply in normal builds.
- Current state: rank‑utah explicitly sets `enable = false` and is disabled.

### Submission & Fields
- Endpoint: Formspark, configured per site.
- Per‑site config block (rank‑utah example):

  ```toml
  [params.forms]
  action         = "https://submit-form.com/DOH188lWF"
  honeypot       = ""        # optional; disabled when using Turnstile
  successMessage = "Thanks! Your message was sent."
  errorMessage   = "Sorry, something went wrong. Please try again."
  redirect       = "https://<site>/thank-you"
  ```

- Optional Cloudflare Turnstile:

  ```toml
  [params.turnstile]
  enable  = true
  sitekey = "<your-site-key>"
  ```

- Payload sent:
  - `name`, `contact`, `message`, `page_url`, `source = "desktop_modal"`
  - If `contact` looks like an email → adds `email`
  - If `contact` looks like a phone → adds `phone`
  - When Turnstile is enabled and a token is present → `cf-turnstile-response`
  - `_subject = "New message via site modal"`

### Client Behavior
- Validation: Name required; `contact` must be a valid email or phone.
- Submit: Tries CORS fetch with `Accept: application/json` (detect errors), falls back to `no-cors` when needed.
- Status UI: Shows “Sending…”, success, or error messages in the modal.
- Analytics:
  - On open: `contact_text_click` with `{ method: 'desktop_modal' }`.
  - On submit: GA event `form_submit` with `{ event_category: 'lead', event_label: location.pathname + '#desktop_modal' }`.

### Troubleshooting / Current Status
- Current status: Submissions reach Formspark (verified via HTTP 302 to `submitted.formspark.io` with `formspark-status: ok`). Email notifications are not arriving to the inbox yet.
- Likely resolution steps (Formspark side):
  - Verify the notification email is configured for form ID and is verified.
  - Check sender policy / domain settings (SPF/DKIM) if using custom sender.
  - Inspect spam/junk filters and email rules; whitelist `formspark.io`.
  - Confirm form ID (`DOH188lWF`) and check the dashboard submissions.
- Local diagnostics:
  - Enable modal debug logs: `localStorage.setItem('cp-debug-modal','1')` then open the modal and submit to see console diagnostics.
  - Use curl to test endpoint:

    ```zsh
    curl -i -X POST https://submit-form.com/DOH188lWF \
      -d "name=Test User" -d "contact=test@example.com" -d "message=Hello"
    ```

### UI Consistency
- The navbar search input background uses the same card surface as the dedicated search page (`cardBg`/`cardBorder`).


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


We now have generic orchestrators so all sites build and serve the same way:

- `build:site` → Generic production build for any site. Uses `SITE=<name>` env var.
- `dev:site` → Generic local dev run for any site. Uses `SITE=<name>` env var.
#### Shared Search Page

All sites include a `content/search.md` with a consistent meta description and the search shortcode. This is created or updated automatically during `dev:site` and `build:site` runs.

- Default description: "Search the site for pages, services, and blog posts. Find what you need fast."
- Override locally by editing `sites/<site>/content/search.md`.

To backfill all sites now:

```zsh
node scripts/ensure-search-all.mjs
```


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

### Local Workflow Note (npm run <site>)

Your workflow is to only run `npm run <site>` locally, then push (which triggers CI builds you often don’t see). To make sure link issues are visible before you push:

- `npm run <site>` now performs a quick Hugo prebuild to a temporary folder and runs link checks on that built HTML before starting the dev server.
- To disable the quick link check for faster startup, set `DEV_LINK_CHECK=0`:

```zsh
DEV_LINK_CHECK=0 SITE=rank-utah npm run dev:site
```

This keeps dev behavior aligned with production while still being fast. Link checks require a built artifact; doing a quick prebuild inside the dev script ensures you see link issues without changing your workflow.

# Blog monorepo

Shared Hugo setup for multiple client sites using a common theme (`themes/overrides` + PaperMod) and a single shared configuration file.

## Styling Consistency
- Shortcodes, partials, and page components MUST remain visually consistent across all sites.
- Make UI changes in `themes/overrides/` (layouts, shortcodes, assets/css, assets/js) so they propagate everywhere.
- Examples: navbar/footers, hero/section overlays, search page, FAQ accordion, dropdown menus, galleries all use the shared palette and utilities.
- After UI changes, rebuild all sites to verify consistency.
- Avoid site-specific inline styles unless there is a documented exception.

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

### SEO Authoring & Lints

- Archetype: Use `themes/overrides/archetypes/page.md` for new pages. It scaffolds front matter (`title`, `description`, `h1`, `targetKeyword`, `city`, `service`, `canonicalURL`, `heroImage`, `faq[]`, `related[]`) and a proven content outline (intro → benefits → process → differentiators → FAQs → CTA).
- Lints: `scripts/seo-lint.mjs` runs during dev/build to warn about:
  - Missing `description` (auto-filled from first paragraph when `--autofix=1`)
  - Missing `title`
  - Future: optional checks (multiple H1, orphan pages) can be enabled per site.
- Usage (runs automatically in site scripts):
  - `node scripts/seo-lint.mjs --site=<site>`
  - Add `--autofix=1` to auto-fill empty descriptions from content.

Policy: Keep warnings minimal and actionable. We do not warn on “thin content” by default.

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

### Content Indexing Policy (No Section `_index.md` Files)

- Only the homepage should use `_index.md` (e.g., `sites/<site>/content/_index.md`).
- Do not create additional section `_index.md` files in subdirectories (e.g., `content/locations/_index.md`).
- Prefer a single top-level file per section for easier discovery and grep:
  - Use `content/locations.md` (outside the `locations/` directory) instead of `locations/_index.md`.
  - If a directory is needed for multiple items (e.g., `locations/pleasant-grove-ut.md`), keep the listing page as `locations.md` at the root, not `_index.md` inside the folder.
- Rationale: Keeps “index” pages centralized and makes searching for files simpler across sites.

## Centralized CSS Linking (All Sites)

- We now use a single partial `themes/overrides/layouts/partials/styles.html` to build and link the site stylesheet.
- The bundle is produced via Hugo Pipes + PostCSS, minified, fingerprinted, and linked with relative URLs for environment robustness.
- Both `partials/head.html` and the Flowbite layout (`layouts/_default/flowbite.html`) include this shared partial; there is no per-layout CSS link logic anymore.
- Result: All sites reference the same path pattern (`/assets/css/site.min.<hash>.css`) and behave identically across dev, preview, and production environments.

## Cloudflare Pages: Make Production Match Local

To ensure production matches local builds and avoids fingerprint mismatches causing 404s:

- Build command (per site):

```zsh
pnpm install --frozen-lockfile
pnpm run build:<site>
```

- Publish directory: `sites/<site>/public`
- Runtime: Node 18+ (or latest LTS); Hugo extended v0.151+ available in the environment; PostCSS present (installed by `pnpm install`).
- After switching bundle paths or changing CSS pipeline, purge CDN cache to prevent old HTML referencing new fingerprints:

```zsh
# Example (manual): purge CSS objects after deploy
# Cloudflare dashboard → Pages project → Purge → Paths: /assets/css/*
```

### Notes
- Microsoft Clarity and GA load via their own absolute URLs; using relative URLs for the stylesheet does not affect them.
- If a Pages project publishes the wrong directory (e.g. repo root `public/`), HTML and assets will not match; fix the publish dir.
- Always standardize on `npm run build:<site>` so Hugo Pipes runs PostCSS and emits the fingerprinted bundle expected by the HTML.

## Anchors with Sticky Header (Learn More Offset)

When linking to in‑page sections from a hero (e.g., a “Learn More” button) and using the sticky header, add a scroll offset so the heading isn’t hidden beneath the navbar.

- Preferred pattern: place a small anchor element above the target section and use the dynamic header height CSS variable set by the navbar (`--site-header-h`).

Example in content files (place the anchor immediately ABOVE the target section heading):

```html
<span id="learn-more" class="block" style="scroll-margin-top: calc(var(--site-header-h, 64px) + 8px)" aria-hidden="true"></span>
```

- Link buttons/anchors to `#learn-more`.
- The variable `--site-header-h` is set at runtime by the navbar partial; the `+ 8px` provides a small cushion.
- Fallback (no JS or outside shared navbar):

```html
<span id="learn-more" class="block" style="scroll-margin-top: 72px" aria-hidden="true"></span>
```

This convention avoids over/underscrolling caused by the sticky navbar.

## CI/Prod Parity (pnpm + Lockfile)

- Use pnpm for installs and builds. In CI, run:

```zsh
pnpm install --frozen-lockfile
pnpm run build:<site>
```

- If dependencies change, refresh and commit `pnpm-lock.yaml` so prod matches local:

```zsh
pnpm install --lockfile-only
pnpm install
pnpm prune
git add pnpm-lock.yaml
git commit -m "chore: refresh lockfile after dep changes"
```

- Node >= 18 and pnpm >= 10 are enforced via `package.json` `engines`.
