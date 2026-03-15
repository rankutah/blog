(function () {
  function readConfig() {
    try {
      var el = document.getElementById('cp-analytics-config');
      if (!el) return {};
      return JSON.parse(el.textContent || '{}');
    } catch (e) {
      return {};
    }
  }

  var cfg = readConfig();
  var adsCfg = cfg.googleAds || {};
  var conversions = adsCfg.conversions || {};
  var analyticsEventPrefix = String(cfg.analyticsEventPrefix || '').trim();
  var storagePrefix = 'cp_ads_conv:' + ((window.location && window.location.hostname) || 'site') + ':';
  var sessionVisitedPaths = [];

  function canStore() {
    try {
      var key = storagePrefix + '__test';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  var storageEnabled = canStore();

  function normalizePath(path) {
    var raw = String(path || '').trim();
    if (!raw) return '';
    raw = raw.split('#')[0].split('?')[0];
    if (!raw) return '';
    if (raw.charAt(0) !== '/') raw = '/' + raw;
    raw = raw.replace(/\/+$/, '');
    return raw || '/';
  }

  function currentPath() {
    return normalizePath((window.location && window.location.pathname) || '/');
  }

  function currentOrigin() {
    try {
      return String((window.location && window.location.origin) || '').replace(/\/+$/, '');
    } catch (e) {
      return '';
    }
  }

  function pathToPageLocation(path) {
    var normalized = normalizePath(path);
    var origin = currentOrigin();
    if (!origin) return normalized;
    if (normalized === '/') return origin + '/';
    return origin + normalized + '/';
  }

  function currentSearchParams() {
    try {
      return new URLSearchParams((window.location && window.location.search) || '');
    } catch (e) {
      return null;
    }
  }

  function toNumber(value) {
    if (value == null || value === '') return null;
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function parseBool(value, fallback) {
    if (value == null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    var normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return fallback;
  }

  function normalizeEventKey(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    raw = raw.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
    raw = raw.replace(/[^a-zA-Z0-9]+/g, '_');
    raw = raw.replace(/_+/g, '_');
    raw = raw.replace(/^_+|_+$/g, '');
    return raw.toLowerCase();
  }

  function getConversion(key) {
    if (!key || typeof conversions !== 'object') return null;
    var entry = conversions[key];
    if (!entry || typeof entry !== 'object') return null;
    return entry;
  }

  function onceStorageKey(key, entry, overrideKey) {
    var raw = overrideKey || (entry && entry.onceKey) || key || (entry && entry.sendTo) || 'conversion';
    return storagePrefix + String(raw);
  }

  function hasFired(key, entry, overrideKey) {
    if (!storageEnabled) return false;
    try {
      return window.localStorage.getItem(onceStorageKey(key, entry, overrideKey)) === '1';
    } catch (e) {
      return false;
    }
  }

  function markFired(key, entry, overrideKey) {
    if (!storageEnabled) return;
    try {
      window.localStorage.setItem(onceStorageKey(key, entry, overrideKey), '1');
    } catch (e) {}
  }

  function fireConversion(key, entry, overrides) {
    var base = entry && typeof entry === 'object' ? entry : {};
    var extra = overrides && typeof overrides === 'object' ? overrides : {};
    var sendTo = String(extra.sendTo || base.sendTo || '').trim();
    var transportType = String(extra.transportType || base.transportType || '').trim();

    var once = parseBool(extra.once, parseBool(base.once, true));
    var overrideOnceKey = String(extra.onceKey || '').trim();
    if (once && hasFired(key, base, overrideOnceKey)) return false;

    var value = toNumber(extra.value != null ? extra.value : base.value);
    var currency = String(extra.currency || base.currency || '').trim();
    if (!currency && value != null) currency = 'USD';
    var eventName = String(extra.eventName || base.eventName || 'conversion').trim() || 'conversion';
    var analyticsPayload = {};
    if (value != null) analyticsPayload.value = value;
    if (currency) analyticsPayload.currency = currency;

    try {
      if (typeof window.gtag === 'function') {
        var fired = false;

        if (sendTo) {
          var adsPayload = { send_to: sendTo };
          if (value != null) adsPayload.value = value;
          if (currency) adsPayload.currency = currency;
          if (transportType) adsPayload.transport_type = transportType;
          window.gtag('event', eventName, adsPayload);
          fired = true;
        }

        if (emitAnalyticsCompanionEvent(key, base, analyticsPayload, transportType)) {
          fired = true;
        }

        if (emitPageAttributionEvents(key, base, value, currency)) {
          fired = true;
        }

        if (fired && once) {
          markFired(key, base, overrideOnceKey);
        }

        return fired;
      }
    } catch (e) {}

    return false;
  }

  function emitAnalyticsCompanionEvent(key, entry, conversionPayload, transportType) {
    var normalizedKey = normalizeEventKey((entry && entry.analyticsEventName) || key);
    if (!analyticsEventPrefix || !normalizedKey) return false;
    if (typeof window.gtag !== 'function') return false;

    var eventName = analyticsEventPrefix + normalizedKey;
    var payload = {
      conversion_key: normalizeEventKey(key),
      page_path: currentPath()
    };

    if (conversionPayload && conversionPayload.value != null) payload.value = conversionPayload.value;
    if (conversionPayload && conversionPayload.currency) payload.currency = conversionPayload.currency;
    if (transportType) payload.transport_type = transportType;

    try {
      window.gtag('event', eventName, payload);
      return true;
    } catch (e) {}

    return false;
  }

  function trackConfiguredConversion(key, overrides) {
    return fireConversion(key, getConversion(key), overrides);
  }

  function shouldEmitPageAttribution(entry, value) {
    if (!entry || entry.enabled === false) return false;
    if (parseBool(entry.includeInPageAttribution, false) !== true) return false;
    if (value == null) return false;
    if (typeof window.gtag !== 'function') return false;
    return true;
  }

  function emitPageAttributionEvents(key, entry, value, currency) {
    if (!shouldEmitPageAttribution(entry, value)) return false;

    var visitedPaths = readVisitedPaths();
    if (!visitedPaths.length) return false;

    var splitValue = value / visitedPaths.length;
    if (!Number.isFinite(splitValue)) return false;

    var fired = false;
    var normalizedKey = normalizeEventKey(key);

    for (var i = 0; i < visitedPaths.length; i += 1) {
      var pagePath = normalizePath(visitedPaths[i]);
      if (!pagePath) continue;

      try {
        window.gtag('event', 'attribution_value', {
          value: splitValue,
          currency: currency || 'USD',
          page_location: pathToPageLocation(pagePath),
          conversion_type: normalizedKey,
          attribution_model: 'equal_split'
        });
        fired = true;
      } catch (e) {}
    }

    return fired;
  }

  function nearestConversionElement(start) {
    var el = start;
    while (el && el.nodeType === 1) {
      if (
        el.hasAttribute('data-ads-conversion') ||
        el.hasAttribute('data-ads-send-to') ||
        el.hasAttribute('data-ads-value') ||
        el.hasAttribute('data-ads-currency') ||
        el.hasAttribute('data-ads-once-key') ||
        el.hasAttribute('data-ads-once')
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function elementOverrides(el) {
    if (!el) return null;
    var key = String(el.getAttribute('data-ads-conversion') || '').trim();
    var base = getConversion(key) || {};
    var overrides = {
      sendTo: String(el.getAttribute('data-ads-send-to') || '').trim(),
      currency: String(el.getAttribute('data-ads-currency') || '').trim(),
      onceKey: String(el.getAttribute('data-ads-once-key') || '').trim(),
      once: parseBool(el.getAttribute('data-ads-once'), undefined)
    };
    var valueAttr = el.getAttribute('data-ads-value');
    if (valueAttr != null && valueAttr !== '') overrides.value = valueAttr;
    return { key: key, entry: base, overrides: overrides };
  }

  function trackElementConversion(el) {
    var info = elementOverrides(el);
    if (!info) return false;
    if (!info.key && !info.overrides.sendTo) return false;
    return fireConversion(info.key || 'custom', info.entry, info.overrides);
  }

  function readVisitedPaths() {
    try {
      var raw = window.sessionStorage.getItem(storagePrefix + 'visited_paths');
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return sessionVisitedPaths.slice();
    }
  }

  function writeVisitedPaths(paths) {
    sessionVisitedPaths = Array.isArray(paths) ? paths.slice(0, 50) : [];
    try {
      window.sessionStorage.setItem(storagePrefix + 'visited_paths', JSON.stringify(sessionVisitedPaths));
    } catch (e) {}
  }

  function rememberCurrentPath() {
    var path = currentPath();
    var paths = readVisitedPaths();
    if (paths.indexOf(path) === -1) {
      paths.push(path);
      writeVisitedPaths(paths);
    }
    return paths.length;
  }

  function maybeTrackPageView(key) {
    var entry = getConversion(key);
    if (!entry || entry.enabled === false) return;
    var targetPath = normalizePath(entry.path);
    if (!targetPath) return;
    if (targetPath !== currentPath()) return;

    var overrides = {};
    var valueQueryParam = String(entry.valueQueryParam || '').trim();
    if (valueQueryParam) {
      var params = currentSearchParams();
      var queryValue = params ? params.get(valueQueryParam) : null;
      var parsedValue = toNumber(queryValue);
      if (parsedValue != null) overrides.value = parsedValue;
    }

    fireConversion(key, entry, overrides);
  }

  function maybeTrackEngagedUserByPages(pageCount) {
    var entry = getConversion('engagedUser');
    if (!entry || entry.enabled === false) return;
    var minPages = parseInt(entry.minPages, 10);
    if (!(minPages >= 1)) minPages = 2;
    if (pageCount >= minPages) markEngagedPageEligible();
  }

  var engagedState = {
    timerDone: false,
    pageEligible: false,
    scrollEligible: false,
    fired: false
  };

  function engagedScrollFallbackEnabled(entry) {
    return parseBool(entry && entry.allowScrollFallback, false) === true;
  }

  function maybeFireEngagedUser() {
    var entry = getConversion('engagedUser');
    if (!entry || entry.enabled === false) return;
    if (engagedState.fired) return;
    if (hasFired('engagedUser', entry)) {
      engagedState.fired = true;
      return;
    }
    var eligible = engagedState.pageEligible || (engagedScrollFallbackEnabled(entry) && engagedState.scrollEligible);
    if (!engagedState.timerDone || !eligible) return;
    if (fireConversion('engagedUser', entry, { onceKey: entry.onceKey || 'engaged_user' })) {
      engagedState.fired = true;
    }
  }

  function markEngagedPageEligible() {
    engagedState.pageEligible = true;
    maybeFireEngagedUser();
  }

  function markEngagedScrollEligible() {
    engagedState.scrollEligible = true;
    maybeFireEngagedUser();
  }

  function setupEngagedTimer() {
    var entry = getConversion('engagedUser');
    if (!entry || entry.enabled === false) return;
    var minSessionSeconds = toNumber(entry.minSessionSeconds);
    if (minSessionSeconds == null) minSessionSeconds = 10;
    minSessionSeconds = Math.max(0, minSessionSeconds);

    window.setTimeout(function () {
      engagedState.timerDone = true;
      maybeFireEngagedUser();
    }, Math.round(minSessionSeconds * 1000));
  }

  function setupEngagedScrollTracking() {
    var entry = getConversion('engagedUser');
    if (!entry || entry.enabled === false) return;
    if (!engagedScrollFallbackEnabled(entry)) return;
    var threshold = toNumber(entry.scrollPercent);
    if (threshold == null) threshold = 60;
    threshold = Math.max(1, Math.min(100, threshold));

    function percentScrolled() {
      var doc = document.documentElement;
      var body = document.body;
      var scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
      var viewport = window.innerHeight || doc.clientHeight || 0;
      var height = Math.max(
        body.scrollHeight || 0,
        doc.scrollHeight || 0,
        body.offsetHeight || 0,
        doc.offsetHeight || 0,
        body.clientHeight || 0,
        doc.clientHeight || 0
      );
      var denom = height - viewport;
      if (denom <= 0) return 100;
      return (scrollTop / denom) * 100;
    }

    function onScroll() {
      if (hasFired('engagedUser', entry) || engagedState.fired) {
        window.removeEventListener('scroll', onScroll, true);
        return;
      }
      if (percentScrolled() >= threshold) {
        markEngagedScrollEligible();
        window.removeEventListener('scroll', onScroll, true);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    onScroll();
  }

  function hrefType(el) {
    if (!el || !el.getAttribute) return '';
    var href = String(el.getAttribute('href') || '').trim().toLowerCase();
    if (href.indexOf('tel:') === 0) return 'tel';
    if (href.indexOf('sms:') === 0) return 'sms';
    return '';
  }

  function linkUrl(el) {
    if (!el || !el.getAttribute) return null;
    var href = String(el.getAttribute('href') || '').trim();
    if (!href) return null;
    try {
      return new URL(href, window.location && window.location.href ? window.location.href : document.baseURI || '/');
    } catch (e) {
      return null;
    }
  }

  function isOutboundUrl(url) {
    if (!url) return false;
    var protocol = String(url.protocol || '').toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return url.origin !== ((window.location && window.location.origin) || '');
  }

  function normalizeMatchList(value) {
    if (Array.isArray(value)) return value;
    if (value == null || value === '') return [];
    return [value];
  }

  function matchesString(mode, candidate, expected) {
    if (!candidate || !expected) return false;
    if (mode === 'hrefEquals') return candidate === expected;
    return candidate.indexOf(expected) !== -1;
  }

  function matchesOutboundRule(link, entry, url) {
    if (!entry || entry.enabled === false || !link || !url || !isOutboundUrl(url)) return false;

    var selector = String(entry.selector || '').trim();
    if (selector) {
      try {
        if (!link.matches || !link.matches(selector)) return false;
      } catch (e) {
        return false;
      }
    }

    var mode = String(entry.matchMode || 'hrefContains').trim() || 'hrefContains';
    var matchValues = normalizeMatchList(entry.matchValues);
    if (entry.matchValue != null && entry.matchValue !== '') matchValues.push(entry.matchValue);
    if (!matchValues.length) return true;

    var absoluteHref = String(url.href || '');
    var rawHref = String(link.getAttribute('href') || '');
    var hostname = String(url.hostname || '').replace(/^www\./, '');

    for (var i = 0; i < matchValues.length; i += 1) {
      var expected = String(matchValues[i] || '').trim();
      if (!expected) continue;
      if (mode === 'hostEquals') {
        if (hostname === expected.replace(/^www\./, '')) return true;
        continue;
      }
      if (matchesString(mode, absoluteHref, expected) || matchesString(mode, rawHref, expected)) return true;
    }

    return false;
  }

  function shouldDelayNavigation(ev, link) {
    if (!ev || ev.defaultPrevented) return false;
    if (ev.button !== 0) return false;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return false;
    if (!link || (link.tagName || '').toLowerCase() !== 'a') return false;

    var target = String(link.getAttribute('target') || '').trim().toLowerCase();
    if (target && target !== '_self') return false;
    if (link.hasAttribute('download')) return false;
    return true;
  }

  function navigateToTrackedUrl(url) {
    try {
      window.location.assign(url.href);
    } catch (e) {
      window.location.href = url.href;
    }
  }

  function trackOutboundLinkClick(link, ev) {
    var entry = getConversion('outboundLinkClick');
    var url = linkUrl(link);
    if (!matchesOutboundRule(link, entry, url)) return false;

    var shouldDelay = shouldDelayNavigation(ev, link);
    if (shouldDelay) ev.preventDefault();

    var fired = fireConversion('outboundLinkClick', entry, { transportType: 'beacon' });
    if (shouldDelay) {
      if (!fired) {
        navigateToTrackedUrl(url);
      } else {
        window.setTimeout(function () {
          navigateToTrackedUrl(url);
        }, 150);
      }
    }

    return fired;
  }

  function closestLink(start) {
    var el = start;
    while (el && el.nodeType === 1) {
      var tag = (el.tagName || '').toLowerCase();
      if (tag === 'a' || tag === 'button') return el;
      el = el.parentElement;
    }
    return null;
  }

  document.addEventListener(
    'click',
    function (ev) {
      var customEl = nearestConversionElement(ev.target);
      if (customEl) trackElementConversion(customEl);

      var link = closestLink(ev.target);
      var type = hrefType(link);
      if (type === 'tel') trackConfiguredConversion('callClick');
      if (type === 'sms') trackConfiguredConversion('textClick');
      if (!type) trackOutboundLinkClick(link, ev);
    },
    true
  );

  var uniquePages = rememberCurrentPath();
  maybeTrackPageView('pricingPageView');
  maybeTrackPageView('contactPageView');
  maybeTrackPageView('thankYouPageView');
  maybeTrackPageView('welcomePageView');
  setupEngagedTimer();
  maybeTrackEngagedUserByPages(uniquePages);
  setupEngagedScrollTracking();

  window.cpTrackAdsConversion = function (key, overrides) {
    return trackConfiguredConversion(key, overrides);
  };

  window.cpTrackAdsConversionFromElement = function (el) {
    return trackElementConversion(el);
  };
})();
