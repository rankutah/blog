# Analytics

Analytics is standardized across sites via a shared `[params.analytics]` structure.

## Required config shape

Patterned after `sites/rank-utah/config.toml`:

```toml
[params.analytics]
  # Default deferred load. Set to 0 for immediate load on a specific site.
  delayMs = 5000

  [params.analytics.googleTag]
    # The one Google tag loaded on the page. Route it to every needed
    # destination in Google Tag / Tag Gateway.
    id = "AW-123456789"
    enabled = true
    analyticsEventPrefix = "key_"

  [params.analytics.clarity]
    id = ""
    enabled = false

  [params.analytics.phoneReplace]
    enabled = false
    conversionLabel = ""

  [params.analytics.googleAds]
    id = ""

    [params.analytics.googleAds.conversions.callClick]
      enabled = false
      sendTo = ""
      value = 30
      currency = "USD"
      once = true

    [params.analytics.googleAds.conversions.textClick]
      enabled = false
      sendTo = ""
      value = 20
      currency = "USD"
      once = true

    [params.analytics.googleAds.conversions.pricingPageView]
      enabled = false
      path = "/pricing"
      sendTo = ""

    [params.analytics.googleAds.conversions.contactPageView]
      enabled = false
      path = "/contact"
      sendTo = ""

    [params.analytics.googleAds.conversions.thankYouPageView]
      enabled = false
      path = "/thank-you"
      sendTo = ""

    [params.analytics.googleAds.conversions.welcomePageView]
      enabled = false
      path = "/welcome"
      sendTo = ""
      valueQueryParam = "value"

    [params.analytics.googleAds.conversions.engagedUser]
      enabled = false
      sendTo = ""
      minSessionSeconds = 10
      minPages = 2
      scrollPercent = 60
      once = true

  [params.analytics.meta]
    id = ""
    enabled = false
```

## Loading logic

Shared logic loads analytics scripts:

- on first interaction (any configured `loadEvents`) OR
- after `delayMs` (default 5000ms)

Setting `delayMs = 0` forces immediate load.

The shared loader treats `[params.analytics.googleTag]` as the single client-side Google transport. Google Analytics 4 and Google Ads should be connected to that tag in Google rather than loaded as separate transport tags from site config.

## Google Ads conversions

The shared theme now supports native Google Ads conversion events with per-site config under `[params.analytics.googleAds.conversions]`.

Supported standard conversion keys:

- `callClick`
- `textClick`
- `pricingPageView`
- `contactPageView`
- `thankYouPageView`
- `welcomePageView`
- `engagedUser`

Behavior:

- All configured conversions fire through `gtag('event', 'conversion', { send_to: ... })`
- If `analyticsEventPrefix` is set, each Ads conversion also emits a companion analytics event named `<prefix><conversionKey>`.
- They are deduped with `localStorage`, so they fire only once per browser/user for that site hostname
- Page-view conversions match the configured `path`
- The recommended lead conversion is `thankYouPageView`; shared forms no longer auto-fire a Google Ads form-submit conversion
- `welcomePageView` can read a dynamic conversion value from the query string via `valueQueryParam`.
- For purchase-complete redirects on `/welcome`, set `once = false` so repeat purchases continue to track.
- `engagedUser` fires once when either condition is met:
  - user has stayed on the site at least `minSessionSeconds` seconds
  - user has visited at least `minPages` unique paths on that site
  - user scrolls at least `scrollPercent` on any page

### Dynamic purchase value on welcome page

For purchase-complete redirects, use `welcomePageView` and pass the amount in the redirect URL.

Example config:

```toml
[params.analytics.googleAds.conversions.welcomePageView]
  enabled = true
  path = "/welcome"
  sendTo = "AW-123456789/AbCdEfGhIjKlMnOp"
  valueQueryParam = "value"
  currency = "USD"
  once = false
```

Example redirect URL:

```text
https://clearpresence.io/welcome?value=299
```

For this conversion, do not set a fixed `value` in config if the purchase amount varies. The tracker will read `?value=` and send that number as the conversion value.
This path uses your existing `content/welcome.md` page when it renders at `/welcome`.

### Shared analytics event prefix

Google Ads conversions should keep using the required event name `conversion` for `send_to` labels. If you also want clean analytics/key-event names, set a shared prefix on the sitewide Google tag:

```toml
[params.analytics.googleTag]
  analyticsEventPrefix = "key_"
```

That will emit companion analytics events like:

- `key_call_click`
- `key_text_click`
- `key_pricing_page_view`
- `key_contact_page_view`
- `key_thank_you_page_view`
- `key_welcome_page_view`
- `key_engaged_user`

This is the recommended way to keep Ads conversion tracking intact while making GA4 key events easy to identify and mark.

Backward compatibility:

- The theme still accepts the old `params.analytics.google.analyticsEventPrefix` and `params.analytics.googleAds.analyticsEventPrefix`, but the preferred location is `params.analytics.googleTag.analyticsEventPrefix`

## Phone Replacement

Google Ads website call conversion number replacement is configured separately from page/event conversions:

```toml
[params.analytics.phoneReplace]
  enabled = true
  conversionLabel = "AbCdEfGhIjKlMnOp"
```

Behavior:

- This uses the site's `params.analytics.googleAds.id` plus `params.analytics.phoneReplace.conversionLabel`
- The shared loader configures Google Ads with `phone_conversion_number` using the site header phone number
- This is only for Google forwarding-number replacement on phone calls, not for thank-you/welcome/page conversions

Backward compatibility:

- The theme still accepts the old `params.analytics.googleAds.phoneReplace` and `params.analytics.googleAds.conversionLabel` fields, but the preferred location is `params.analytics.phoneReplace`

### Custom button/link conversions

For non-standard CTA buttons and links, use data attributes. The shared bootstrap listens immediately, before the delayed footer click tracker loads.

Shortcode example:

```go-html-template
{{< button
  url="/free-audit"
  text="Request Free Audit"
  adsConversion="freeAuditCta"
>}}
```

Direct override example:

```html
<a
  href="/book-now"
  data-ads-send-to="AW-123456789/AbCdEfGhIjKlMnOp"
  data-ads-value="75"
  data-ads-currency="USD"
  data-ads-once-key="book_now_cta"
>
  Book Now
</a>
```

Supported data attributes:

- `data-ads-conversion`: lookup key inside `[params.analytics.googleAds.conversions]`
- `data-ads-send-to`: direct `send_to` override
- `data-ads-value`: direct value override
- `data-ads-currency`: direct currency override
- `data-ads-once-key`: custom once-per-browser dedupe key
- `data-ads-once`: set to `false` to disable dedupe for that element

### Important limitation

"Once per user" here means once per browser/device profile using `localStorage`. It is not person-level dedupe across devices or private browsing sessions.

## Lighthouse: missing source map (Google Tag Gateway)

If you use a reverse-proxy product like **Google Tag Gateway** (e.g. Cloudflare’s feature) to serve `gtag.js`/`gtm.js` from your own domain, Lighthouse may report:

> Large JavaScript file is missing a source map

This is **unscored** and is expected: Google’s tag scripts typically do not ship sourcemaps that you can deploy yourself.

Practical options:

- **Ignore it** (recommended): it doesn’t indicate a functional bug or a performance regression by itself.
- **Stop proxying that file** in the gateway product if you want the warning to disappear.

## Migration notes

- Preferred transport config is `[params.analytics.googleTag]`.
- Legacy `[params.analytics.google]` is still accepted as a fallback source for the single tag ID.
- Legacy `[params.analytics.googleAds].enabled` is still accepted, but new configs should treat `[params.analytics.googleAds]` as an Ads feature block, not a second transport toggle.
- Legacy `googleAnalyticsID` flat param is removed. Use `[params.analytics.googleTag].id` for new configs.
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
