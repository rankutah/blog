# Cloudflare Turnstile → Formspark Proxy

This Worker sits between your static Hugo site and Formspark. It verifies the Cloudflare Turnstile token server-side, then forwards the form submission to Formspark if valid.

## Why
- Honeypots help, but bots adapt. Turnstile blocks most automated spam.
- Verification must be server-side; static forms can’t validate tokens on their own.

## How it works
1. Browser submits your form to the Worker URL (instead of directly to Formspark).
2. Worker extracts `cf-turnstile-response` from the POST body.
3. Worker verifies it with Cloudflare using your Turnstile secret.
4. If valid, Worker forwards the original form body to Formspark and returns their response.

## Deploy

Prereqs:
- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm i -g wrangler`)

1. Configure wrangler

Edit `wrangler.toml`:
- Set `name` to something like `turnstile-proxy`
- Set your `account_id`

2. Set secrets and environment variables

Run these (interactive) to store secrets in Cloudflare:

```
wrangler secret put TURNSTILE_SECRET
```

Set environment variables (non-secret) in wrangler.toml or via dashboard:
- `FORMSPARK_ENDPOINT` — your Formspark POST URL (e.g., `https://submit-form.com/v9hVDQiYl`)

3. Publish

```
wrangler deploy
```

4. Update your form action
- Change the form `action` in your content to the Worker’s URL, e.g. `https://turnstile-proxy.your-subdomain.workers.dev`

## Notes
- Only the Turnstile site key goes in your Hugo config; the secret key must be stored in Cloudflare (never client-side).
- Logs: use `wrangler tail` to watch runtime logs during testing.
- Rate limiting: optional, can be added in the Worker if needed.
