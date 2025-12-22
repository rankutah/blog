# Analytics

Analytics is standardized across sites via a shared `[params.analytics]` structure.

## Required config shape

Patterned after `sites/rank-utah/config.toml`:

```toml
[params.analytics]
  # Default deferred load. Set to 0 for immediate load on a specific site.
  delayMs = 5000

  [params.analytics.google]
    id = "G-XXXXXXX"
    enabled = true

  [params.analytics.clarity]
    id = ""
    enabled = false

  [params.analytics.googleAds]
    id = ""
    enabled = false

  [params.analytics.meta]
    id = ""
    enabled = false
```

## Loading logic

Shared logic loads analytics scripts:

- on first interaction (any configured `loadEvents`) OR
- after `delayMs` (default 5000ms)

Setting `delayMs = 0` forces immediate load.

## Migration notes

- Legacy `googleAnalyticsID` flat param is removed. Use nested `[params.analytics.google].id`.
- Keep the analytics block even if all IDs are blank; it documents intent and makes future additions consistent.

## Search event suffix strategy

The shared search implementation appends a suffix to `search_term` for GA4 `view_search_results`:

- success: `✅`
- abandoned: `❌`

### Looker Studio derived fields

```text
Outcome:
CASE WHEN REGEXP_MATCH(search_term, r' ✅$') THEN 'success'
     WHEN REGEXP_MATCH(search_term, r' ❌$') THEN 'abandoned' END

Base Term:
REGEXP_REPLACE(search_term, r' (✅|❌)$', '')

Success Rate:
COUNTIF(Outcome = 'success') / COUNT(Outcome)
```
