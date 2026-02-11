# Message Modal & FAB

This adds a site-wide “Message” floating action button (FAB) that opens a modal to collect a quick inquiry.

## Status

- Disabled by default across all sites.
- Can be enabled per-site via config.

## Files

- Modal + behavior: `themes/overrides/layouts/partials/message-modal.html`
- FAB button: `themes/overrides/layouts/partials/text-fab.html`
- Gated in base layout: `themes/overrides/layouts/_default/flowbite.html`

## Enable / disable

Shared default:

- `themes/overrides/config.shared.toml`: `[params.messageModal].enable = false`

Per-site override:

```toml
[params.messageModal]
enable = true
```

## Floating button (FAB) label / icon

You can control what the floating button says, and whether the icon is shown:

```toml
[params.messageFab]
text = "Message"      # default
showIcon = true       # set false to hide the icon
```

## Submission

- Endpoint: Formspark (configured per site)

Example:

```toml
[params.forms]
action         = "https://submit-form.com/DOH188lWF"
successMessage = "Thanks! Your message was sent."
errorMessage   = "Sorry, something went wrong. Please try again."
redirect       = "https://<site>/thank-you"
```

Optional Cloudflare Turnstile:

```toml
[params.turnstile]
enable  = true
sitekey = "<your-site-key>"
```

## Debugging

- Enable modal debug logs:
  - `localStorage.setItem('cp-debug-modal','1')`
