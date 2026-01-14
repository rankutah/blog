// zaraz-loader-advanced.js
// Delayed Cloudflare Zaraz injector with /welcome conversion de-dupe.
// Note: For this to be effective, Zaraz must NOT be auto-injected by Cloudflare.

(function () {
  const w = window;
  if (w.__cpZarazLoaderInstalled) return;
  w.__cpZarazLoaderInstalled = true;

  // Dedupe /welcome conversions:
  const WELCOME_PATH = '/welcome';
  let welcomeProduct = '';
  let welcomeAlreadyCounted = false;

  function isWelcomePath(pathname) {
    try {
      const p = pathname || '';
      return p === WELCOME_PATH || p === (WELCOME_PATH + '/') || p.startsWith(WELCOME_PATH + '/');
    } catch {
      return false;
    }
  }

  function getWelcomeProduct() {
    try {
      if (!w.location || !isWelcomePath(w.location.pathname)) return '';
      const sp = new URLSearchParams(w.location.search || '');
      return (sp.get('product') || '').trim();
    } catch {
      return '';
    }
  }

  function markWelcomeCounted(product) {
    try {
      if (!product) return;
      localStorage.setItem('cp_welcome_conv_' + product, '1');
    } catch {}
  }

  function wasWelcomeCounted(product) {
    try {
      if (!product) return false;
      return localStorage.getItem('cp_welcome_conv_' + product) === '1';
    } catch {
      return false;
    }
  }

  function stripWelcomeProductParam() {
    try {
      if (!w.location || !isWelcomePath(w.location.pathname)) return;
      const u = new URL(w.location.href);
      if (!u.searchParams.has('product')) return;
      u.searchParams.delete('product');
      const next =
        u.pathname +
        (u.searchParams.toString() ? '?' + u.searchParams.toString() : '') +
        (u.hash || '');
      w.history.replaceState({}, '', next);
    } catch {}
  }

  welcomeProduct = getWelcomeProduct();
  welcomeAlreadyCounted = wasWelcomeCounted(welcomeProduct);
  if (welcomeAlreadyCounted) {
    // Strip before Zaraz loads so the trigger won't match again.
    stripWelcomeProductParam();
  }

  // Cloudflare-recommended endpoint (same-origin). This is typically less likely to be blocked
  // than the static.cloudflareinsights.com host.
  const ZARAZ_SRC = '/cdn-cgi/zaraz/i.js';
  let loaded = false;

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

    // After we inject (i.e. we've allowed the conversion to be seen once),
    // strip the product param so refresh/back won't double-count.
    // Only do this for first-time views.
    try {
      if (welcomeProduct && !welcomeAlreadyCounted) {
        markWelcomeCounted(welcomeProduct);
        setTimeout(stripWelcomeProductParam, 1500);
      }
    } catch {}
  }

  function injectSoon() {
    try {
      if ('requestIdleCallback' in w) requestIdleCallback(inject, { timeout: 2000 });
      else setTimeout(inject, 1);
    } catch {
      setTimeout(inject, 1);
    }
  }

  // Hard fallback (never wait forever)
  setTimeout(injectSoon, 6000);

  // Prefer: wait for LCP to settle, then inject on idle.
  let quietTimer = null;
  try {
    if ('PerformanceObserver' in w) {
      const po = new PerformanceObserver(() => {
        if (quietTimer) clearTimeout(quietTimer);
        quietTimer = setTimeout(injectSoon, 350);
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
    }
  } catch {}

  // If LCP observer is blocked/restricted, load after window load.
  try {
    w.addEventListener('load', () => setTimeout(injectSoon, 1500), { once: true });
  } catch {}
})();
