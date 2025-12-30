// analytics-loader.js
// Reads config from <script id="cp-analytics-config" type="application/json">…</script>
// and loads analytics providers after an optional delay / interaction.

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

  // LCP-first gating: delay loading third-party until LCP settles.
  // Defaults to ON so CWV is prioritized.
  var LCP_GATE = cfg.lcpGate !== false;
  var LCP_MAX_WAIT_MS = parseInt(cfg.lcpMaxWaitMs, 10);
  if (!(LCP_MAX_WAIT_MS >= 0)) LCP_MAX_WAIT_MS = 6000;
  var LCP_QUIET_WINDOW_MS = parseInt(cfg.lcpQuietWindowMs, 10);
  if (!(LCP_QUIET_WINDOW_MS >= 0)) LCP_QUIET_WINDOW_MS = 350;

  var lcpGateOpened = false;
  var lcpGateCallbacks = [];

  function openLcpGate() {
    if (lcpGateOpened) return;
    lcpGateOpened = true;
    try {
      for (var i = 0; i < lcpGateCallbacks.length; i++) {
        try {
          lcpGateCallbacks[i]();
        } catch (e) {}
      }
    } finally {
      lcpGateCallbacks = [];
    }
  }

  function afterLcp(cb) {
    if (!LCP_GATE) return cb();
    if (lcpGateOpened) return cb();
    lcpGateCallbacks.push(cb);
  }

  (function setupLcpGate() {
    if (!LCP_GATE) {
      lcpGateOpened = true;
      return;
    }

    var quietTimer = null;
    var sawLcp = false;

    function scheduleOpenSoon() {
      if (quietTimer) {
        try {
          clearTimeout(quietTimer);
        } catch (e) {}
      }
      quietTimer = setTimeout(openLcpGate, LCP_QUIET_WINDOW_MS);
    }

    try {
      if ('PerformanceObserver' in window) {
        var po = new PerformanceObserver(function (list) {
          var entries = list.getEntries();
          if (entries && entries.length) {
            sawLcp = true;
            scheduleOpenSoon();
          }
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
      }
    } catch (e) {}

    // If the browser doesn't expose LCP entries, don't block forever: open after load.
    try {
      window.addEventListener(
        'load',
        function () {
          if (!sawLcp) scheduleOpenSoon();
        },
        { once: true }
      );
    } catch (e) {}

    // Hard safety fallback.
    setTimeout(openLcpGate, Math.max(0, LCP_MAX_WAIT_MS | 0));
  })();

  var GA_ID = (cfg.gaId || '').trim();
  var CLARITY_ID = (cfg.clarityId || '').trim();
  var ADS_ID = (cfg.googleAdsId || '').trim();
  var ADS_COMBINED = (cfg.googleAdsCombinedId || '').trim();
  var META_ID = (cfg.metaPixelId || '').trim();

  var DELAY_MS = parseInt(cfg.delayMs, 10) || 4000;
  var LOAD_EVENTS = Array.isArray(cfg.loadEvents) ? cfg.loadEvents : [];
  var ONLY_ON_INTERACTION = !!cfg.onlyOnInteraction;

  var CLARITY_DELAY_MS = cfg.clarityDelayMs == null ? null : parseInt(cfg.clarityDelayMs, 10) || 0;
  var CLARITY_ONLY_ON_INTERACTION =
    cfg.clarityOnlyOnInteraction == null ? null : !!cfg.clarityOnlyOnInteraction;

  var ADS_PHONE_REPLACE = !!cfg.enableAdsPhoneReplace;
  var SITE_PHONE = (cfg.sitePhoneNumber || '').trim();

  function ensureGtagLoaded(id) {
    if (!id) return;

    try {
      if (
        [].some &&
        Array.prototype.some.call(document.scripts || [], function (s) {
          return (s.src || '').indexOf('googletagmanager.com/gtag/js') !== -1;
        })
      ) {
        return;
      }
    } catch (e) {}

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  function initGA4() {
    if (!GA_ID) return;
    ensureGtagLoaded(GA_ID);
    try {
      window.gtag('js', new Date());
      if (cfg.debugMode) window.gtag('config', GA_ID, { debug_mode: true });
      else window.gtag('config', GA_ID);
    } catch (e) {}
  }

  function initGoogleAds() {
    if (!ADS_ID) return;

    ensureGtagLoaded(ADS_ID);

    try {
      window.gtag('config', ADS_ID);

      if (ADS_PHONE_REPLACE && SITE_PHONE) {
        var idForReplace = ADS_COMBINED || ADS_ID;
        window.gtag('config', idForReplace, { phone_conversion_number: SITE_PHONE });
      }
    } catch (e) {}
  }

  function initClarity() {
    if (!CLARITY_ID) return;
    (function (c, l, a, r, i, t, y) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  function initMeta() {
    if (!META_ID) return;

    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    try {
      window.fbq('init', META_ID);
      window.fbq('track', 'PageView');
    } catch (e) {}
  }

  function loadAll() {
    if (window.__trackingLoaded) return;
    window.__trackingLoaded = true;

    initGA4();
    initGoogleAds();

    var clarityDelay = CLARITY_DELAY_MS == null ? DELAY_MS : CLARITY_DELAY_MS;
    var clarityOnlyInteract =
      CLARITY_ONLY_ON_INTERACTION == null ? ONLY_ON_INTERACTION : CLARITY_ONLY_ON_INTERACTION;

    if (!clarityOnlyInteract) {
      try {
        setTimeout(requestClarity, Math.max(0, clarityDelay | 0));
      } catch (e) {
        setTimeout(requestClarity, 4000);
      }
    }

    try {
      LOAD_EVENTS.forEach(function (evt) {
        if (typeof evt === 'string' && evt) {
          document.addEventListener(evt, requestClarity, { once: true, passive: true });
        }
      });
    } catch (e) {}

    initMeta();
  }

  var loadRequested = false;
  function requestLoadAll() {
    if (window.__trackingLoaded) return;
    if (loadRequested) return;
    loadRequested = true;
    afterLcp(function () {
      loadRequested = false;
      loadAll();
    });
  }

  var clarityRequested = false;
  function requestClarity() {
    if (!CLARITY_ID) return;
    if (clarityRequested) return;
    clarityRequested = true;
    afterLcp(function () {
      clarityRequested = false;
      initClarity();
    });
  }

  if (!ONLY_ON_INTERACTION) {
    try {
      setTimeout(requestLoadAll, Math.max(0, DELAY_MS | 0));
    } catch (e) {
      setTimeout(requestLoadAll, 4000);
    }
  }

  try {
    LOAD_EVENTS.forEach(function (evt) {
      if (typeof evt === 'string' && evt) {
        document.addEventListener(evt, requestLoadAll, { once: true, passive: true });
      }
    });
  } catch (e) {}
})();
