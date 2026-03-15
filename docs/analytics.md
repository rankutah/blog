# Analytics

Analytics is standardized across sites via a shared `[params.analytics]` structure.

## Required config shape

Patterned after `sites/rank-utah/config.toml`:

```toml
[params.analytics]
  [params.analytics.googleTag]
    # The one Google tag loaded on the page. Route it to every needed
    # destination in Google Tag / Tag Gateway.
    id = "AW-123456789"
    enabled = true
    delayMs = 5000
    onlyOnInteraction = false
    lcpGate = true
    debugMode = false
    analyticsEventPrefix = "key_"

    [params.analytics.googleTag.conversions.callClick]
      enabled = false
      sendTo = ""
      value = 30
      includeInPageAttribution = true
      includeLastPageInAttribution = true

    [params.analytics.googleTag.conversions.textClick]
      enabled = false
      sendTo = ""
      value = 20
      includeInPageAttribution = false

    [params.analytics.googleTag.conversions.pricingPageView]
      enabled = false
      path = "/pricing"
      sendTo = ""
      includeInPageAttribution = false

    [params.analytics.googleTag.conversions.contactPageView]
      enabled = false
      path = "/contact"
      sendTo = ""
      includeInPageAttribution = false

    [params.analytics.googleTag.conversions.thankYouPageView]
      enabled = false
      path = "/thank-you"
      sendTo = ""
      value = 100
      includeInPageAttribution = true
      includeLastPageInAttribution = false

    [params.analytics.googleTag.conversions.welcomePageView]
      enabled = false
      path = "/welcome"
      sendTo = ""
      valueQueryParam = "value"
      includeInPageAttribution = false

    [params.analytics.googleTag.conversions.engagedUser]
      enabled = false
      sendTo = ""
      value = 5
      minSessionSeconds = 10
      minPages = 2
      includeInPageAttribution = false

    [params.analytics.googleTag.conversions.outboundLinkClick]
      enabled = false
      sendTo = ""
      value = 60
      matchMode = "hrefContains"
      matchValues = ["book.example.com"]
      includeInPageAttribution = true

  [params.analytics.clarity]
    id = ""
    enabled = false
    delayMs = 5000
    onlyOnInteraction = false

  [params.analytics.phoneReplace]
    enabled = false
    conversionLabel = ""

  [params.analytics.attribution]
    enabled = false
    persistDays = 90
    fieldPrefix = "attribution_"
    captureParams = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]

  [params.analytics.googleAds]
    # Optional Ads account override for phone replacement or when your routed
    # googleTag id is not itself an Ads tag.
    id = ""

  [params.analytics.meta]
    id = ""
    enabled = false
```

## Loading logic

Shared logic loads analytics scripts:

- on first interaction (any configured `loadEvents`) OR
- after `delayMs` (default 5000ms)

Set `[params.analytics.googleTag].delayMs = 0` and `lcpGate = false` to force immediate Google tag load.

The shared loader treats `[params.analytics.googleTag]` as the single client-side Google transport. Google Analytics 4 and Google Ads should be connected to that tag in Google rather than loaded as separate transport tags from site config.

Preferred location for Google tag loading/debug settings is also `[params.analytics.googleTag]`: `delayMs`, `loadEvents`, `onlyOnInteraction`, `lcpGate`, `lcpMaxWaitMs`, `lcpQuietWindowMs`, and `debugMode`.

Clarity-specific delay and interaction settings should live under `[params.analytics.clarity]` so all Clarity settings stay in one block.

## First-party attribution persistence

Use `[params.analytics.attribution]` when you want the site to keep important click and campaign parameters after the landing-page URL changes.

This is first-party persistence:

- the site reads values like `gclid`, `gbraid`, `wbraid`, and `utm_*` from the landing-page URL
- it stores them in the browser's own localStorage for that site
- shared lead/contact forms automatically receive them as hidden inputs later, even after the visitor moves to other pages

Example config:

```toml
[params.analytics.attribution]
  enabled = true
  persistDays = 90
  fieldPrefix = "attribution_"
  captureParams = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]
```

Behavior:

- storage only updates when one of the configured query params is present in the current page URL
- shared forms rendered by the theme receive hidden inputs like `attribution_gclid` and `attribution_utm_campaign`
- the first landing page and first referrer are also included by default as `attribution_landing_page` and `attribution_referrer`
- stored values expire after `persistDays`

This does not replace Google Ads attribution or enhanced conversions. It gives your site and form endpoint a first-party copy of the original campaign data.

## Google Ads conversions

The shared theme now supports native conversion events with per-site config under `[params.analytics.googleTag.conversions]`.

Supported standard conversion keys:

- `callClick`
- `textClick`
- `pricingPageView`
- `contactPageView`
- `thankYouPageView`
- `welcomePageView`
- `engagedUser`
- `outboundLinkClick`

Every conversion rule can also include `includeInPageAttribution = true|false` so site configs explicitly declare which conversions should count in the shared page-attribution model.

When a conversion is included in page attribution, `includeLastPageInAttribution = true|false` controls whether the current conversion page is part of the equal split. It defaults to `true`.

Behavior:

- If `sendTo` is set, the conversion also fires through `gtag('event', 'conversion', { send_to: ... })`
- If `analyticsEventPrefix` is set, each matching conversion rule emits a companion analytics event named `<prefix><conversionKey>`, even when `sendTo` is still blank.
- They are deduped with `localStorage`, so they fire only once per browser/user for that site hostname
- `once` defaults to `true`; only set `once = false` when you explicitly want a conversion to be repeatable
- `currency` defaults to `USD` whenever a numeric `value` is sent
- Page-view conversions match the configured `path`
- `outboundLinkClick` matches outbound `http(s)` links using `matchMode`, `matchValues`, and optional `selector`
- The recommended lead conversion is `thankYouPageView`; shared forms no longer auto-fire a Google Ads form-submit conversion
- `welcomePageView` can read a dynamic conversion value from the query string via `valueQueryParam`.
- `engagedUser` uses a simpler default across sites:
  - user must stay on the site at least `minSessionSeconds` seconds
  - user must visit at least `minPages` unique paths on that site
  - scroll only counts when `allowScrollFallback = true` and `scrollPercent` is also configured

### Outbound link click conversion

Use `outboundLinkClick` when a site hands the user off to an external booking, scheduling, checkout, or partner URL.

Example config:

```toml
[params.analytics.googleTag.conversions.outboundLinkClick]
  enabled = true
  sendTo = "AW-123456789/AbCdEfGhIjKlMnOp"
  value = 60
  includeInPageAttribution = true
  includeLastPageInAttribution = true
  matchMode = "hrefContains"
  matchValues = ["secure.thinkreservations.com/blueridgeabbey"]
```

### Page attribution inclusion flag

Use `includeInPageAttribution = true` only on conversions that represent real lead outcomes for that site.

Recommended defaults:

- `thankYouPageView`: `true`
- `callClick`: `true`
- `textClick`: site-specific
- `outboundLinkClick`: site-specific, usually `true` for booking or scheduling handoffs
- `welcomePageView`: usually `false` for lead-gen sites where sales close after an offline conversation
- `engagedUser`, `pricingPageView`, `contactPageView`: usually `false`

For conversions that stay on an intermediate confirmation URL such as `/thank-you`, set `includeLastPageInAttribution = false` when you want attribution to stay on the pages that led into that confirmation page. For call clicks and similar direct-response actions, leave `includeLastPageInAttribution = true` so the current page keeps credit.

This flag is schema-level today so site configs can stay explicit and consistent before the shared page-attribution runtime is added.

### Page attribution event

When a conversion fires with `includeInPageAttribution = true` and a numeric `value`, the shared runtime also emits `attribution_value` events.

Current model:

- unique visited pages are tracked for the current browser session only
- the conversion value is split evenly across those visited pages
- the current conversion page is included unless that conversion sets `includeLastPageInAttribution = false`
- one `attribution_value` event is emitted per visited page

Example payload for a $100 conversion across 4 visited pages:

```js
gtag('event', 'attribution_value', {
  value: 25,
  currency: 'USD',
  page_location: 'https://clearpresence.io/pricing/',
  conversion_type: 'thank_you_page_view',
  attribution_model: 'equal_split'
});
```

Notes:

- the event `value` is the attributed split value, not the original full conversion value
- `page_location` is set explicitly for each visited page receiving attributed value
- `conversion_type` uses the normalized conversion key such as `thank_you_page_view` or `call_click`
- `attribution_model` is currently always `equal_split`

### Defaulted fields

To keep site configs smaller, the shared runtime applies these defaults:

- `once = true`
- `currency = "USD"` when a numeric `value` exists
- the conversion rule name is used as the dedupe key unless `onceKey` is explicitly overridden

In most site configs you should not need to set `currency`, `once = true`, or `onceKey`.

Supported matching fields:

- `matchMode = "hrefContains"` compares against the raw link and resolved absolute URL
- `matchMode = "hrefEquals"` requires an exact href match
- `matchMode = "hostEquals"` matches the outbound hostname
- `matchValues` accepts a TOML array of strings; `matchValue` also works for a single string
- `selector` optionally narrows matching to links that also match a CSS selector

Runtime behavior:

- Only outbound `http(s)` links are eligible
- Links opened in a new tab/window are tracked without blocking navigation
- Same-tab clicks use `transport_type = "beacon"` and a short fallback delay so the conversion can leave before the browser navigates away
- `tel:` and `sms:` links continue to use `callClick` and `textClick`

### Dynamic purchase value on welcome page

For purchase-complete redirects, use `welcomePageView` and pass the amount in the redirect URL.

Example config:

```toml
[params.analytics.googleTag.conversions.welcomePageView]
  enabled = true
  path = "/welcome"
  sendTo = "AW-123456789/AbCdEfGhIjKlMnOp"
  valueQueryParam = "value"
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

You can leave `sendTo = ""` temporarily while setting up Google Ads conversion actions. In that state, the rule will still emit the `key_...` analytics event to your routed Google tag, but it will not send an Ads conversion until a real `sendTo` label is configured.

Backward compatibility:

- The theme still accepts legacy root-level loader fields like `params.analytics.delayMs`, `params.analytics.onlyOnInteraction`, `params.analytics.lcpGate`, and `params.analytics.debugMode`, but the preferred location is `[params.analytics.googleTag]`
- The theme still accepts the old `params.analytics.google.analyticsEventPrefix` and `params.analytics.googleAds.analyticsEventPrefix`, but the preferred location is `params.analytics.googleTag.analyticsEventPrefix`
- The theme still accepts the old `[params.analytics.googleAds.conversions]` path, but the preferred location is `[params.analytics.googleTag.conversions]`
- The theme still accepts legacy root-level `params.analytics.clarityDelayMs` and `params.analytics.clarityOnlyOnInteraction`, but the preferred location is `[params.analytics.clarity]`

## Proposed generic rule schema (draft)

This section is a proposed future config shape only. It is not implemented by the shared runtime yet.

The goal is to stop adding one-off conversion names and instead support a small set of generic rule types that cover most tracking needs from config alone.

Recommended generic types:

- `pageView`
- `linkClick`
- `selectorClick`
- `elementView`
- `formLifecycle`
- `engagement`

Draft example:

```toml
[params.analytics.googleTag]
  id = "AW-123456789"
  analyticsEventPrefix = "key_"

  [params.analytics.googleTag.rules.leadThankYou]
    type = "pageView"
    enabled = true
    path = "/thank-you"
    sendTo = "AW-123456789/AbCdEfGhIjKlMnOp"
    value = 100
    includeInPageAttribution = true

  [params.analytics.googleTag.rules.primaryCall]
    type = "linkClick"
    enabled = true
    protocol = "tel"
    selector = "a[href^='tel:']"
    value = 40
    includeInPageAttribution = true

  [params.analytics.googleTag.rules.primaryText]
    type = "linkClick"
    enabled = true
    protocol = "sms"
    selector = "a[href^='sms:']"
    value = 30

  [params.analytics.googleTag.rules.externalBooking]
    type = "linkClick"
    enabled = true
    matchMode = "hrefContains"
    matchValues = ["secure.thinkreservations.com/blueridgeabbey"]
    value = 60
    includeInPageAttribution = true

  [params.analytics.googleTag.rules.quoteButton]
    type = "selectorClick"
    enabled = true
    selector = "[data-track='quote-cta']"
    value = 20

  [params.analytics.googleTag.rules.pricingSectionSeen]
    type = "elementView"
    enabled = true
    selector = "#pricing"
    threshold = 0.5
    value = 10

  [params.analytics.googleTag.rules.contactFormStarted]
    type = "formLifecycle"
    enabled = true
    selector = "form[data-form-role='contact']"
    stage = "start"
    value = 15

  [params.analytics.googleTag.rules.qualifiedVisit]
    type = "engagement"
    enabled = true
    minSessionSeconds = 10
    minPages = 2
    allowScrollFallback = true
    scrollPercent = 60
    value = 5
```

Recommended shared fields across all rule types:

- `enabled`
- `type`
- `sendTo`
- `value`
- `currency`
- `once`
- `onceKey`
- `includeInPageAttribution`
- `includeLastPageInAttribution`
- `analyticsEventName`

Type-specific fields:

- `pageView`: `path`, `pathPrefix`, optional pattern matching
- `linkClick`: `selector`, `protocol`, `matchMode`, `matchValue`, `matchValues`, `hostEquals`
- `selectorClick`: `selector`
- `elementView`: `selector`, `threshold`, optional `minTimeVisibleMs`
- `formLifecycle`: `selector`, `stage = start|submit|success|error`
- `engagement`: `minSessionSeconds`, `minPages`, `allowScrollFallback`, `scrollPercent`

Suggested mapping from the current schema:

- `thankYouPageView` -> `type = "pageView"`, `path = "/thank-you"`
- `welcomePageView` -> `type = "pageView"`, `path = "/welcome"`, `valueQueryParam = "value"`
- `callClick` -> `type = "linkClick"`, `protocol = "tel"`
- `textClick` -> `type = "linkClick"`, `protocol = "sms"`
- `outboundLinkClick` -> `type = "linkClick"`, outbound `http(s)` matching
- `engagedUser` -> `type = "engagement"`
- `pricingPageView` and `contactPageView` -> `type = "pageView"`

Why this shape is recommended:

- it keeps most future tracking requests inside config instead of shared JS changes
- it removes special-case conversion names that only differ by path or click matcher
- it lets sites use business-friendly rule names like `leadThankYou` or `externalBooking`
- it preserves a small, stable runtime surface instead of growing a new bespoke event type for every site

## Phone Replacement

Google Ads website call conversion number replacement is configured separately from page/event conversions:

```toml
[params.analytics.phoneReplace]
  enabled = true
  conversionLabel = "AbCdEfGhIjKlMnOp"
```

Behavior:

- This uses the site's `params.analytics.googleAds.id` plus `params.analytics.phoneReplace.conversionLabel`
- If `params.analytics.googleAds.id` is omitted and `params.analytics.googleTag.id` is an Ads tag like `AW-...`, the shared loader reuses that tag id automatically.
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

- `data-ads-conversion`: lookup key inside `[params.analytics.googleTag.conversions]`
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
- Preferred conversion config is `[params.analytics.googleTag.conversions]`.
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
