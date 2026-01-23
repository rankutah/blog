# Content, Search, SEO

## Content indexing policy (keep grep/simple navigation)

- Only the homepage should use `_index.md` (e.g. `sites/<site>/content/_index.md`).
- Avoid section `_index.md` files in subdirectories.
- Prefer a single top-level listing file per section:
  - Prefer `content/locations.md` over `content/locations/_index.md`.

Rationale: keeps index pages centralized and easy to search across sites.

## Shared search page

All sites include a `content/search.md` with a consistent meta description and the search shortcode. This is created/updated automatically during dev/build.

Backfill all sites:

```zsh
node scripts/ensure-search-all.mjs
```

## SEO authoring & lints

- Archetype for pages: `themes/overrides/archetypes/page.md`
- Lints: `scripts/seo-lint.mjs`

Manual usage:

- `node scripts/seo-lint.mjs --site=<site>`
- Add `--autofix=1` to auto-fill empty descriptions from content.

## Anchors with sticky header (learn-more offset)

Preferred pattern: place an anchor element above the target section heading and use the runtime header height CSS variable:

```html
<span id="learn-more" class="block" style="scroll-margin-top: calc(var(--site-header-h, 64px) + 8px)" aria-hidden="true"></span>
```

## Blogs (per-site; never shared)

To add a blog to a site without leaking content across sites:

- In `sites/<site>/config.toml`, mount that site’s `posts` into `content/blog` (and don’t forget to mount `content` too when defining mounts).

Example mounts:

```toml
[[module.mounts]]
source = "content"
target = "content"

[[module.mounts]]
source = "posts"
target = "content/blog"
```

- Create `sites/<site>/content/blog/_index.md`:

```md
---
title: "Blog"
layout: "flowbite"
---

{{< blog-list section="blog" >}}
```

- Use the shared archetype:

```sh
hugo new --source ./sites/<site> blog/my-new-post.md
```

## Client PDFs with embedded notes

Some clients send PDFs with feedback/notes embedded as annotations (e.g., FreeText notes). You can extract both the page text and the annotation contents with:

```sh
python3 scripts/extract-pdf-notes.py "/absolute/path/to/file.pdf" --format md
```

This prints:

- **Annotations** (who wrote the note + what it says + page number)
- **Extracted text** per page (best-effort)

Use the **Annotations** section as “instructions”, and convert the extracted text into proper Markdown sections/bullets.
