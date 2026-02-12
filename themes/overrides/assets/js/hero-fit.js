/*
  Global hero overlay fitter
  - Applies to any hero overlay created by themes/overrides/layouts/partials/hero.html
  - On small screens only, scales the overlay content down if it would overflow
    the image container.
  - Avoids per-site/page hacks and keeps image aspect/fit unchanged.
*/

(function () {
  const MOBILE_MQ = '(max-width: 767.98px)';
  const MIN_SCALE = 0.72; // safety floor; below this, readability suffers
  const EPS_PX = 2; // small fudge to avoid subpixel oscillation

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function isMobile() {
    try {
      return window.matchMedia && window.matchMedia(MOBILE_MQ).matches;
    } catch (e) {
      return false;
    }
  }

  function numberFromPx(px) {
    const n = parseFloat(px);
    return Number.isFinite(n) ? n : 0;
  }

  function getInnerHeight(el) {
    const cs = window.getComputedStyle(el);
    const pt = numberFromPx(cs.paddingTop);
    const pb = numberFromPx(cs.paddingBottom);
    return Math.max(0, el.clientHeight - pt - pb);
  }

  function resetFit(fitEl, wrapEl) {
    fitEl.style.removeProperty('--cp-hero-fit-scale');
    fitEl.style.transform = '';
    fitEl.removeAttribute('data-hero-fit');
    if (wrapEl) wrapEl.style.overflowY = '';
  }

  function applyFitToWrap(wrapEl) {
    const fitEl = wrapEl.querySelector('[data-hero-overlay="fit"]');
    if (!fitEl) return;

    // Always start from a clean baseline before measuring.
    resetFit(fitEl, wrapEl);

    if (!isMobile()) return;

    const availableH = getInnerHeight(wrapEl);
    if (availableH <= 0) return;

    // Measure content height at scale=1.
    // scrollHeight is robust for content even when it would overflow.
    const contentH = Math.max(fitEl.scrollHeight, fitEl.getBoundingClientRect().height);
    if (!contentH) return;

    // If it already fits, keep it at 1.
    if (contentH <= availableH + EPS_PX) return;

    const raw = (availableH - EPS_PX) / contentH;
    const scale = clamp(raw, MIN_SCALE, 1);

    // If we hit MIN_SCALE and still likely overflow, keep scroll as fallback
    // rather than hiding content.
    const willFit = contentH * scale <= availableH + EPS_PX;

    fitEl.style.setProperty('--cp-hero-fit-scale', String(scale));
    fitEl.style.transform = `scale(${scale})`;
    fitEl.setAttribute('data-hero-fit', willFit ? 'scaled' : 'scaled-min');

    if (willFit) {
      wrapEl.style.overflowY = 'hidden';
    }
  }

  function run() {
    const wraps = document.querySelectorAll('[data-hero-overlay="wrap"]');
    if (!wraps.length) return;

    wraps.forEach((wrapEl) => {
      try {
        applyFitToWrap(wrapEl);
      } catch (e) {
        // Fail closed: never break the page because of a fitter.
      }
    });
  }

  let raf = 0;
  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(run);
  }

  // Initial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { passive: true });
  } else {
    schedule();
  }

  // After fonts load (helps prevent late overflow once webfonts render)
  if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
    document.fonts.ready.then(schedule).catch(function () {});
  }

  // Resize/orientation changes
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });

  // Observe layout changes if available (dynamic nav height, etc.)
  if (window.ResizeObserver) {
    try {
      const ro = new ResizeObserver(schedule);
      document.querySelectorAll('[data-hero-overlay="wrap"]').forEach((el) => ro.observe(el));
    } catch (e) {
      // ignore
    }
  }
})();
