// zaraz-loader-advanced.js
// Delayed Cloudflare Zaraz injector.
// Note: For this to be effective, Zaraz must NOT be auto-injected by Cloudflare.

(function () {
  const w = window;
  if (w.__cpZarazLoaderInstalled) return;
  w.__cpZarazLoaderInstalled = true;

  // Lighthouse/CWV: avoid any chance of Zaraz running during the critical load window.
  // We still inject (for real analytics), but never earlier than this nav-time threshold.
  const MIN_NAV_DELAY_MS = 10000;

  // Default endpoint (same-origin). Note: some Cloudflare Zaraz setups require a zone-specific
  // script URL (e.g. static.cloudflareinsights.com/zaraz/s.js?z=...) and will 404/400 without it.
  let ZARAZ_SRC = '/cdn-cgi/zaraz/i.js';
  try {
    const cfgEl = document.getElementById('cp-analytics-config');
    const cfg = cfgEl ? JSON.parse(cfgEl.textContent || '{}') : {};
    if (cfg && typeof cfg.zarazSrc === 'string' && cfg.zarazSrc.trim().length) {
      ZARAZ_SRC = cfg.zarazSrc.trim();
    }
  } catch {}
  let loaded = false;

  function navWaitMs() {
    try {
      if (w.performance && typeof w.performance.now === 'function') {
        return Math.max(0, MIN_NAV_DELAY_MS - w.performance.now());
      }
    } catch {}
    return MIN_NAV_DELAY_MS;
  }

  function inject() {
    if (loaded) return;
    loaded = true;

    // Local/dev: Cloudflare endpoints don't exist, so don't 404-spam.
    try {
      const host = w.location && w.location.hostname ? w.location.hostname : '';
      const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host.endsWith('.localhost');
      if (isLocal) return;
    } catch {}

    try {
      if (document.querySelector('script[src*="cloudflareinsights.com/zaraz/"]')) return;
    } catch {}
    try {
      if (document.querySelector('script[src^="/cdn-cgi/zaraz/"]')) return;
    } catch {}
    try {
      if (document.getElementById('cp-zaraz-script')) return;
    } catch {}

    const s = document.createElement('script');
    s.id = 'cp-zaraz-script';
    s.src = ZARAZ_SRC;
    s.referrerPolicy = 'origin';
    s.async = true;
    document.head.appendChild(s);
  }

  function injectSoon() {
    try {
      if ('requestIdleCallback' in w) requestIdleCallback(inject, { timeout: 2000 });
      else setTimeout(inject, 1);
    } catch {
      setTimeout(inject, 1);
    }
  }

  function scheduleInjectSoon(delayMs, opts) {
    const ignoreNavDelay = !!(opts && opts.ignoreNavDelay);
    const wait = Math.max(0, delayMs | 0, ignoreNavDelay ? 0 : navWaitMs());
    setTimeout(injectSoon, wait);
  }

  function scheduleOnInteraction() {
    let armed = false;
    function arm() {
      if (armed) return;
      armed = true;
      // For real users: load as soon as they show intent, but still avoid stealing
      // main-thread time during the LCP window.
      scheduleInjectSoon(0, { ignoreNavDelay: true });
    }

    try {
      ['scroll', 'mousemove', 'touchstart', 'click', 'keydown'].forEach(function (evt) {
        w.addEventListener(evt, arm, { once: true, passive: true });
      });
    } catch {}
  }

  // Hard fallback (never wait forever)
  scheduleInjectSoon(6000);

  // Prefer: if the user interacts, load promptly (still LCP-gated via injectSoon/open gate).
  scheduleOnInteraction();

  // Prefer: wait for LCP to settle, then inject on idle.
  let quietTimer = null;
  try {
    if ('PerformanceObserver' in w) {
      const po = new PerformanceObserver(() => {
        if (quietTimer) clearTimeout(quietTimer);
        quietTimer = setTimeout(injectSoon, Math.max(350, navWaitMs()));
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    }
  } catch {}

  // If LCP observer is blocked/restricted, load after window load.
  try {
    w.addEventListener('load', () => scheduleInjectSoon(1500), { once: true });
  } catch {}
})();
