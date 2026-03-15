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

  function normalizeLookupKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  function hasOwn(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function getObjectValue(obj, key, fallback) {
    var normalizedKey;
    var keys;
    var i;
    if (!obj || typeof obj !== 'object') return fallback;
    if (hasOwn(obj, key)) return obj[key];

    normalizedKey = normalizeLookupKey(key);
    keys = Object.keys(obj);
    for (i = 0; i < keys.length; i += 1) {
      if (normalizeLookupKey(keys[i]) === normalizedKey) {
        return obj[keys[i]];
      }
    }

    return fallback;
  }

  function getConversion(key) {
    if (!key || typeof conversions !== 'object') return null;
    var entry = getObjectValue(conversions, key, null);
    if (!entry || typeof entry !== 'object') return null;
    return entry;
  }

  function canonicalConversionType(value) {
    var normalized = normalizeLookupKey(value);
    if (normalized === 'pageview') return 'pageView';
    if (normalized === 'linkclick') return 'linkClick';
    if (normalized === 'engagement') return 'engagement';
    return '';
  }

  function inferLegacyConversionType(key) {
    var normalized = normalizeLookupKey(key);
    if (
      normalized === 'pricingpageview' ||
      normalized === 'contactpageview' ||
      normalized === 'thankyoupageview' ||
      normalized === 'welcomepageview'
    ) {
      return 'pageView';
    }
    if (normalized === 'callclick' || normalized === 'textclick' || normalized === 'outboundlinkclick') {
      return 'linkClick';
    }
    if (normalized === 'engageduser') return 'engagement';
    return '';
  }

  function getConversionType(key, entry) {
    return canonicalConversionType(getObjectValue(entry, 'type', '')) || inferLegacyConversionType(key);
  }

  function getConversionEntries() {
    var keys;
    var list = [];
    var i;
    var key;
    var entry;
    if (!conversions || typeof conversions !== 'object') return list;
    keys = Object.keys(conversions);
    for (i = 0; i < keys.length; i += 1) {
      key = keys[i];
      entry = conversions[key];
      if (!entry || typeof entry !== 'object') continue;
      list.push({ key: key, entry: entry, type: getConversionType(key, entry) });
    }
    return list;
  }

  function getConversionEntriesByType(type) {
    return getConversionEntries().filter(function (item) {
      return item.type === type;
    });
  }

  function onceStorageKey(key, entry, overrideKey) {
    var raw = overrideKey || getObjectValue(entry, 'onceKey', '') || key || getObjectValue(entry, 'sendTo', '') || 'conversion';
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
    var sendTo = String(extra.sendTo || getObjectValue(base, 'sendTo', '') || '').trim();
    var transportType = String(extra.transportType || getObjectValue(base, 'transportType', '') || '').trim();

    var once = parseBool(extra.once, parseBool(getObjectValue(base, 'once', undefined), true));
    var overrideOnceKey = String(extra.onceKey || '').trim();
    if (once && hasFired(key, base, overrideOnceKey)) return false;

    var value = toNumber(extra.value != null ? extra.value : getObjectValue(base, 'value', null));
    var currency = String(extra.currency || getObjectValue(base, 'currency', '') || '').trim();
    if (!currency && value != null) currency = 'USD';
    var eventName = String(extra.eventName || getObjectValue(base, 'eventName', 'conversion') || 'conversion').trim() || 'conversion';
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
    var normalizedKey = normalizeEventKey(getObjectValue(entry, 'analyticsEventName', '') || key);
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
    if (!entry || getObjectValue(entry, 'enabled', true) === false) return false;
    if (parseBool(getObjectValue(entry, 'includeInPageAttribution', false), false) !== true) return false;
    if (value == null) return false;
    if (typeof window.gtag !== 'function') return false;
    return true;
  }

  function emitPageAttributionEvents(key, entry, value, currency) {
    if (!shouldEmitPageAttribution(entry, value)) return false;

    var visitedPaths = readVisitedPaths();
    var includeLastPage = parseBool(
      getObjectValue(entry, 'includeLastPageInAttribution', getObjectValue(entry, 'includeLastPage', true)),
      true
    );
    var currentPage = currentPath();
    if (!includeLastPage) {
      visitedPaths = visitedPaths.filter(function (path) {
        return normalizePath(path) !== currentPage;
      });
    }

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

  function rawHref(el) {
    if (!el || !el.getAttribute) return '';
    return String(el.getAttribute('href') || '').trim();
  }

  function linkProtocol(el, url) {
    var href = rawHref(el).toLowerCase();
    if (href.indexOf('tel:') === 0) return 'tel';
    if (href.indexOf('sms:') === 0) return 'sms';
    if (href.indexOf('mailto:') === 0) return 'mailto';
    if (!url) return '';
    return String(url.protocol || '').toLowerCase().replace(/:$/, '');
  }

  function inferLegacyProtocol(key) {
    var normalized = normalizeLookupKey(key);
    if (normalized === 'callclick') return 'tel';
    if (normalized === 'textclick') return 'sms';
    return '';
  }

  function inferLegacyOutboundOnly(key) {
    return normalizeLookupKey(key) === 'outboundlinkclick';
  }

  function matchesPagePathPrefix(path, prefix) {
    var normalizedPrefix = normalizePath(prefix);
    if (!normalizedPrefix) return false;
    if (normalizedPrefix === '/') return true;
    return path === normalizedPrefix || path.indexOf(normalizedPrefix + '/') === 0;
  }

  function matchesPageViewRule(entry) {
    var path = currentPath();
    var targetPath = normalizePath(getObjectValue(entry, 'path', ''));
    var pathPrefix = getObjectValue(entry, 'pathPrefix', '');

    if (targetPath && targetPath === path) return true;
    if (pathPrefix && matchesPagePathPrefix(path, pathPrefix)) return true;
    return false;
  }

  function pageViewOverrides(entry) {
    var overrides = {};
    var valueQueryParam = String(getObjectValue(entry, 'valueQueryParam', '') || '').trim();
    var params;
    var queryValue;
    var parsedValue;
    if (!valueQueryParam) return overrides;

    params = currentSearchParams();
    queryValue = params ? params.get(valueQueryParam) : null;
    parsedValue = toNumber(queryValue);
    if (parsedValue != null) overrides.value = parsedValue;
    return overrides;
  }

  function matchesString(mode, candidate, expected) {
    if (!candidate || !expected) return false;
    if (mode === 'hrefEquals') return candidate === expected;
    return candidate.indexOf(expected) !== -1;
  }

  function matchesLinkRule(key, entry, link, url) {
    var selector;
    var protocol;
    var actualProtocol;
    var outboundOnly;
    var mode;
    var hostEquals;
    var matchValues;
    var singleMatchValue;
    var absoluteHref;
    var raw;
    var hostname;
    var i;
    var expected;

    if (!entry || getObjectValue(entry, 'enabled', true) === false || !link) return false;

    selector = String(getObjectValue(entry, 'selector', '') || '').trim();
    if (selector) {
      try {
        if (!link.matches || !link.matches(selector)) return false;
      } catch (e) {
        return false;
      }
    }

    protocol = String(getObjectValue(entry, 'protocol', inferLegacyProtocol(key)) || '').trim().toLowerCase().replace(/:$/, '');
    actualProtocol = linkProtocol(link, url);
    if (protocol && protocol !== actualProtocol) return false;

    outboundOnly = parseBool(getObjectValue(entry, 'outboundOnly', inferLegacyOutboundOnly(key)), inferLegacyOutboundOnly(key));
    if (outboundOnly && !isOutboundUrl(url)) return false;

    mode = String(getObjectValue(entry, 'matchMode', 'hrefContains') || 'hrefContains').trim() || 'hrefContains';
    matchValues = normalizeMatchList(getObjectValue(entry, 'matchValues', null));
    singleMatchValue = getObjectValue(entry, 'matchValue', null);
    hostEquals = String(getObjectValue(entry, 'hostEquals', '') || '').trim();
    if (singleMatchValue != null && singleMatchValue !== '') matchValues.push(singleMatchValue);
    if (hostEquals) {
      matchValues.push(hostEquals);
      if (!getObjectValue(entry, 'matchMode', '')) mode = 'hostEquals';
    }

    if (!matchValues.length) {
      return !!selector || !!protocol || outboundOnly;
    }

    absoluteHref = String((url && url.href) || '');
    raw = rawHref(link);
    hostname = String((url && url.hostname) || '').replace(/^www\./, '');

    for (i = 0; i < matchValues.length; i += 1) {
      expected = String(matchValues[i] || '').trim();
      if (!expected) continue;
      if (mode === 'hostEquals') {
        if (hostname === expected.replace(/^www\./, '')) return true;
        continue;
      }
      if (matchesString(mode, absoluteHref, expected) || matchesString(mode, raw, expected)) return true;
    }

    return false;
  }

  function getMatchingLinkConversionEntries(link, url) {
    return getConversionEntriesByType('linkClick').filter(function (item) {
      return matchesLinkRule(item.key, item.entry, link, url);
    });
  }

  function maybeTrackPageViewConversions() {
    var entries = getConversionEntriesByType('pageView');
    var i;
    var item;
    for (i = 0; i < entries.length; i += 1) {
      item = entries[i];
      if (!item.entry || getObjectValue(item.entry, 'enabled', true) === false) continue;
      if (!matchesPageViewRule(item.entry)) continue;
      fireConversion(item.key, item.entry, pageViewOverrides(item.entry));
    }
  }

  var engagementStates = {};

  function getEngagementState(key) {
    if (!engagementStates[key]) {
      engagementStates[key] = {
        timerDone: false,
        pageEligible: false,
        scrollEligible: false,
        fired: false
      };
    }
    return engagementStates[key];
  }

  function engagementScrollFallbackEnabled(entry) {
    return parseBool(getObjectValue(entry, 'allowScrollFallback', false), false) === true;
  }

  function maybeFireEngagementConversion(key, entry) {
    var state = getEngagementState(key);
    var eligible;
    if (!entry || getObjectValue(entry, 'enabled', true) === false) return;
    if (state.fired) return;
    if (hasFired(key, entry)) {
      state.fired = true;
      return;
    }
    eligible = state.pageEligible || (engagementScrollFallbackEnabled(entry) && state.scrollEligible);
    if (!state.timerDone || !eligible) return;
    if (fireConversion(key, entry, { onceKey: getObjectValue(entry, 'onceKey', '') || normalizeEventKey(key) || key })) {
      state.fired = true;
    }
  }

  function markEngagementPageEligible(key, entry) {
    getEngagementState(key).pageEligible = true;
    maybeFireEngagementConversion(key, entry);
  }

  function markEngagementScrollEligible(key, entry) {
    getEngagementState(key).scrollEligible = true;
    maybeFireEngagementConversion(key, entry);
  }

  function maybeTrackEngagementByPages(pageCount) {
    var entries = getConversionEntriesByType('engagement');
    var i;
    var item;
    var minPages;
    for (i = 0; i < entries.length; i += 1) {
      item = entries[i];
      if (!item.entry || getObjectValue(item.entry, 'enabled', true) === false) continue;
      minPages = parseInt(getObjectValue(item.entry, 'minPages', null), 10);
      if (!(minPages >= 1)) minPages = 2;
      if (pageCount >= minPages) markEngagementPageEligible(item.key, item.entry);
    }
  }

  function setupEngagementTimers() {
    var entries = getConversionEntriesByType('engagement');
    var i;
    var item;
    var minSessionSeconds;
    for (i = 0; i < entries.length; i += 1) {
      item = entries[i];
      if (!item.entry || getObjectValue(item.entry, 'enabled', true) === false) continue;
      minSessionSeconds = toNumber(getObjectValue(item.entry, 'minSessionSeconds', null));
      if (minSessionSeconds == null) minSessionSeconds = 10;
      minSessionSeconds = Math.max(0, minSessionSeconds);
      (function (key, entry, waitMs) {
        window.setTimeout(function () {
          getEngagementState(key).timerDone = true;
          maybeFireEngagementConversion(key, entry);
        }, waitMs);
      })(item.key, item.entry, Math.round(minSessionSeconds * 1000));
    }
  }

  function setupEngagementScrollTracking() {
    var entries = getConversionEntriesByType('engagement');
    var i;
    var item;
    var threshold;
    for (i = 0; i < entries.length; i += 1) {
      item = entries[i];
      if (!item.entry || getObjectValue(item.entry, 'enabled', true) === false) continue;
      if (!engagementScrollFallbackEnabled(item.entry)) continue;
      threshold = toNumber(getObjectValue(item.entry, 'scrollPercent', null));
      if (threshold == null) threshold = 60;
      threshold = Math.max(1, Math.min(100, threshold));
      (function (key, entry, ruleThreshold) {
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
          var state = getEngagementState(key);
          if (hasFired(key, entry) || state.fired) {
            window.removeEventListener('scroll', onScroll, true);
            return;
          }
          if (percentScrolled() >= ruleThreshold) {
            markEngagementScrollEligible(key, entry);
            window.removeEventListener('scroll', onScroll, true);
          }
        }

        window.addEventListener('scroll', onScroll, { passive: true, capture: true });
        onScroll();
      })(item.key, item.entry, threshold);
    }
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

  function trackLinkClickConversions(link, ev) {
    var url = linkUrl(link);
    var matches = getMatchingLinkConversionEntries(link, url);
    var protocol;
    var shouldDelay;
    var transportType;
    var fired = false;
    var i;

    if (!matches.length) return false;

    protocol = linkProtocol(link, url);
    shouldDelay = (protocol === 'http' || protocol === 'https') && shouldDelayNavigation(ev, link);
    if (shouldDelay) ev.preventDefault();

    transportType = shouldDelay || protocol === 'tel' || protocol === 'sms' ? 'beacon' : '';
    for (i = 0; i < matches.length; i += 1) {
      if (fireConversion(matches[i].key, matches[i].entry, transportType ? { transportType: transportType } : null)) {
        fired = true;
      }
    }

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
      if (link) trackLinkClickConversions(link, ev);
    },
    true
  );

  var uniquePages = rememberCurrentPath();
  maybeTrackPageViewConversions();
  setupEngagementTimers();
  maybeTrackEngagementByPages(uniquePages);
  setupEngagementScrollTracking();

  window.cpTrackAdsConversion = function (key, overrides) {
    return trackConfiguredConversion(key, overrides);
  };

  window.cpTrackAdsConversionFromElement = function (el) {
    return trackElementConversion(el);
  };
})();
