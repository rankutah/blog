# Monorepo Policies (Rules)

## All sites act in unison

Treat all sites as the same product:

- Same layout system and behavior
- Same shortcodes and partials
- Same CSS pipeline and theme behavior

Differences should be limited to:

- content
- branding colors
- analytics IDs
- menus

## Where changes should go

- Styling/layout/UI changes must be made in `themes/overrides/` so they apply everywhere.
- Avoid site-specific template/CSS edits. If a true exception is required, gate it behind a param and document it.

## Verification expectation

After changing shared UI/CSS/shortcodes:

- build at least two representative sites (one “blog-ish”, one “brochure-ish”)
- keep link checks green
