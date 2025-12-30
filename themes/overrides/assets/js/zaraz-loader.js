(function () {
  // Loads Cloudflare Zaraz after LCP so it doesn't steal main-thread time during the LCP window.
  // NOTE: For this to be effective, Zaraz must NOT be auto-injected by Cloudflare.
  // If Cloudflare is injecting <script src="https://static.cloudflareinsights.com/zaraz/s.js"> early,
  // you need to disable/pause that in the Cloudflare dashboard for the test.

  var ZARAZ_SRC = 'https://static.cloudflareinsights.com/zaraz/s.js';
  var loaded = false;

  function inject() {
    if (loaded) return;
    loaded = true;
    try {
      if (document.querySelector('script[src*="cloudflareinsights.com/zaraz/"]')) return;
    } catch (e) {}

    var s = document.createElement('script');
    s.src = ZARAZ_SRC;
    s.async = true;
    // Avoid blocking; dynamic scripts are async by default.
    document.head.appendChild(s);
  }

  function scheduleInjectSoon() {
    try {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(inject, { timeout: 2000 });
      } else {
        setTimeout(inject, 1);
      }
    } catch (e) {
      setTimeout(inject, 1);
    }
  }

  // Hard safety fallback: never wait forever.
  setTimeout(scheduleInjectSoon, 6000);

  // If we can observe LCP, wait until the browser reports it, then inject on idle.
  // LCP can update multiple times; we wait for a short quiet window.
  var lastLcpTime = 0;
  var quietTimer = null;

  function onLcp(entry) {
    lastLcpTime = entry.startTime || 0;
    if (quietTimer) clearTimeout(quietTimer);
    quietTimer = setTimeout(scheduleInjectSoon, 350);
  }

  try {
    if ('PerformanceObserver' in window) {
      var po = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          onLcp(entries[i]);
        }
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    } else {
      // No LCP observer support; load after window load.
      window.addEventListener('load', function () {
        setTimeout(scheduleInjectSoon, 0);
      });
    }
  } catch (e) {
    window.addEventListener('load', function () {
      setTimeout(scheduleInjectSoon, 0);
    });
  }

  // If the page finishes loading and we still haven't seen LCP, don't block analytics forever.
  // On some browsers LCP entries may be restricted.
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (!loaded && lastLcpTime === 0) scheduleInjectSoon();
    }, 1500);
  });
})();
