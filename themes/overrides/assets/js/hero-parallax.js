/* Hero parallax (image scrolls slightly slower than overlay content).
   - Opt-in via <html data-hero-parallax="true">
   - Respects prefers-reduced-motion
   - Uses rAF + passive listeners for smooth scrolling
*/

(function () {
  const root = document.documentElement;

  const enabledAttr = root.getAttribute('data-hero-parallax');
  const enabled = enabledAttr === 'true' || enabledAttr === '1' || enabledAttr === 'on';
  if (!enabled) return;

  let reduce = false;
  try {
    reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    reduce = false;
  }
  if (reduce) return;

  const ratio = (() => {
    const raw = root.getAttribute('data-hero-parallax-ratio');
    const n = raw ? Number.parseFloat(raw) : NaN;
    return Number.isFinite(n) ? n : 0.22;
  })();

  const maxPx = (() => {
    const raw = root.getAttribute('data-hero-parallax-max');
    const n = raw ? Number.parseFloat(raw) : NaN;
    return Number.isFinite(n) ? n : 80;
  })();

  const wraps = Array.from(document.querySelectorAll('.section.hero .cp-hero-media')).filter(
    (el) => el instanceof HTMLElement,
  );
  if (wraps.length === 0) return;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  let ticking = false;

  const update = () => {
    ticking = false;

    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    for (const wrap of wraps) {
      if (!(wrap instanceof HTMLElement)) continue;

      const rect = wrap.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < vh;

      if (!inView) {
        wrap.style.setProperty('--cp-hero-parallax-y', '0px');
        continue;
      }

      // Clamp translation to the available overflow of the media itself.
      // This prevents "blank gaps" on contain-fit heroes (or any hero where the
      // image/picture doesn't have enough extra pixels after scaling).
      let available = maxPx;
      try {
        const target = wrap.firstElementChild;
        if (target instanceof HTMLElement) {
          const mediaRect = target.getBoundingClientRect();
          const overflow = Math.max(0, mediaRect.height - rect.height);
          // With transform-origin centered, you can translate at most half the overflow
          // before exposing empty space.
          const half = overflow / 2;
          // Give ourselves a 1px safety buffer for subpixel rounding.
          available = Math.min(maxPx, Math.max(0, half - 1));
        }
      } catch (_e) {
        available = maxPx;
      }

      if (available <= 0) {
        wrap.style.setProperty('--cp-hero-parallax-y', '0px');
        continue;
      }

      const y = clamp(-rect.top * ratio, -available, available);
      wrap.style.setProperty('--cp-hero-parallax-y', `${y.toFixed(2)}px`);
    }
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });

  // Initial position (after layout).
  requestAnimationFrame(update);
})();
