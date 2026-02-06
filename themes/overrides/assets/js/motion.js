/* Motion helpers (opt-in per site).
   - Scroll reveal via IntersectionObserver
   - Stagger support for grids via [data-motion-group="stagger"]
   - Respects prefers-reduced-motion
*/

(function () {
  const root = document.documentElement;

  // Only run when the site enables motion (template-gated, but keep this defensive).
  const enabledAttr = root.getAttribute('data-motion-enabled');
  const enabled = enabledAttr === 'true' || enabledAttr === '1' || enabledAttr === 'on';
  if (!enabled) return;

  // Run entrance/reveal animations only the first time a visitor loads a page.
  // Subsequent visits should skip the hero entrance, but still allow scroll reveals.
  const seenKey = 'cp:motion:seen';
  let alreadySeen = false;
  try {
    alreadySeen = localStorage.getItem(seenKey) === '1';
  } catch (e) {
    alreadySeen = false;
  }

  // Debug helper: allow forcing a “first view” from the URL.
  // Example: `?motion=reset`
  try {
    const params = new URLSearchParams(window.location && window.location.search ? window.location.search : '');
    const motionParam = (params.get('motion') || '').toLowerCase();
    if (motionParam === 'reset' || motionParam === '1' || motionParam === 'true') {
      try { localStorage.removeItem(seenKey); } catch (e) {}
      alreadySeen = false;
    }
  } catch (e) {
    // ignore
  }

  const skipHero = alreadySeen;

  let reduce = false;
  try {
    reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    reduce = false;
  }
  if (reduce) {
    root.setAttribute('data-motion', 'reduced');
    // Ensure we don't keep the pre-paint pending gate on.
    root.removeAttribute('data-motion-pending');
    root.setAttribute('data-motion-ready', 'true');
    return;
  }

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const revealWithDelay = (el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.classList.contains('is-visible')) return;
    if (el.dataset.motionRevealing === '1') return;
    el.dataset.motionRevealing = '1';

    const ms = parseInt(el.dataset.motionDelay || '0', 10);
    if (ms > 0) {
      setTimeout(() => {
        el.classList.add('is-visible');
        delete el.dataset.motionRevealing;
      }, ms);
    } else {
      el.classList.add('is-visible');
      delete el.dataset.motionRevealing;
    }
  };

  // Auto-mark common content elements for reveal to increase overall motion.
  // Skip anything already inside an animated region to avoid nested/janky transforms.
  const autoSelectors = [
    'main#content article .prose h2',
    'main#content article .prose h3',
    // Some pages put the `prose` class directly on the <article>.
    'main#content article.prose h2',
    'main#content article.prose h3',
    'main#content article.prose p',
    'main#content article.prose ul',
    'main#content article.prose ol',
    'main#content article.prose blockquote',
    'main#content article .prose p',
    'main#content article .prose ul',
    'main#content article .prose ol',
    'main#content article .prose blockquote',
    'main#content article .ui-btn',
  ];
  const autoEls = Array.from(document.querySelectorAll(autoSelectors.join(',')));
  for (const el of autoEls) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest('.section.hero')) continue;
    if (el.closest('[data-motion]')) continue;
    el.setAttribute('data-motion', 'reveal');
  }

  // Hero image container entrance (adds motion even when hero content is short).
  const heroImgWraps = Array.from(document.querySelectorAll('.section.hero .relative > .not-prose'));
  for (const el of heroImgWraps) {
    if (!(el instanceof HTMLElement)) continue;
    // Only mark when it's the direct image wrapper (avoid other nested not-prose blocks).
    if (el.querySelector('img, picture, video')) {
      el.setAttribute('data-motion', 'hero-img');
    }
  }

  // Apply stagger delays to children in motion groups.
  const staggerGroups = Array.from(document.querySelectorAll('[data-motion-group="stagger"]'));
  for (const group of staggerGroups) {
    const children = Array.from(group.children).filter((n) => n && n.nodeType === 1);

    // Heuristic: estimate column count so stagger feels fluid across a row and doesn't
    // get increasingly delayed for later rows.
    let columns = 3;
    try {
      const first = children.find((c) => c instanceof HTMLElement);
      if (first instanceof HTMLElement) {
        const childW = first.getBoundingClientRect().width || 0;
        const groupW = group.getBoundingClientRect().width || 0;
        if (childW > 0 && groupW > 0) {
          columns = clamp(Math.round(groupW / childW), 1, 6);
        }
      }
    } catch (e) {
      // ignore
    }

    // Tune for readability: side-by-side cards should start close together.
    // Keep a tiny per-row bump so the grid still feels like it's cascading.
    const perCol = 165;
    const perRow = 70;
    const base = 0;
    const maxDelay = 900;

    children.forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      if (!child.hasAttribute('data-motion')) child.setAttribute('data-motion', 'reveal');
      const col = columns > 0 ? index % columns : 0;
      const row = columns > 0 ? Math.floor(index / columns) : 0;
      const ms = clamp(base + col * perCol + row * perRow, 0, maxDelay);
      child.dataset.motionDelay = String(ms);
    });
  }

  if (!alreadySeen) {
    try {
      localStorage.setItem(seenKey, '1');
    } catch (e) {
      // ignore
    }
  }

  const revealEls = Array.from(document.querySelectorAll('[data-motion="reveal"]'))
    .filter((el) => el instanceof HTMLElement);

  const heroEls = Array.from(document.querySelectorAll('[data-motion="hero"]'))
    .filter((el) => el instanceof HTMLElement);

  const heroImgEls = Array.from(document.querySelectorAll('[data-motion="hero-img"]'))
    .filter((el) => el instanceof HTMLElement);

  if (skipHero) {
    root.setAttribute('data-motion-skip-hero', 'true');
    for (const el of heroEls) el.classList.add('is-visible');
    for (const el of heroImgEls) el.classList.add('is-visible');
  }

  // Mark elements already in view so we don't hide them when motion becomes "ready".
  const inViewNow = (el) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    // Consider "in view" if it intersects the top ~92% of viewport.
    return r.bottom > 0 && r.top < vh * 0.92;
  };

  // Enable CSS-driven initial hidden states only after the above sync pass.
  // Clear the pre-paint pending gate first to prevent any flash.
  root.removeAttribute('data-motion-pending');
  root.setAttribute('data-motion-ready', 'true');

  // Make already-in-view content animate in (including H2s near the top).
  // Do this after `data-motion-ready` so transitions run.
  // Double rAF so at least one paint occurs before we flip elements to visible.
  // Otherwise the browser may apply "hidden" and "visible" in the same frame,
  // resulting in no perceptible transition.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const el of revealEls) {
        if (inViewNow(el)) revealWithDelay(el);
      }
    });
  });

  // Hero entrance: trigger after paint for smooth transition.
  if (heroEls.length) {
    requestAnimationFrame(() => {
      for (const el of heroEls) el.classList.add('is-visible');
    });
  }

  // Hero image entrance.
  if (heroImgEls.length) {
    requestAnimationFrame(() => {
      for (const el of heroImgEls) el.classList.add('is-visible');
    });
  }

  // Scroll reveal.
  if (!('IntersectionObserver' in window) || revealEls.length === 0) {
    // Fallback: just show everything.
    for (const el of revealEls) el.classList.add('is-visible');
    return;
  }

  // Scroll reveal trigger tuning:
  // If we trigger too early (e.g., with a positive bottom rootMargin), elements can
  // finish animating *before* the user scrolls to them, which makes animations feel
  // “too fast” or invisible. Use a slightly *shrunk* root box so reveals start when
  // content is nearer to the viewport.
  const revealObserverOptions = {
    threshold: 0.1,
    // Slightly earlier than before, while still avoiding "finishes offscreen".
    rootMargin: '0px 0px -6% 0px',
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const target = entry.target;
        if (target instanceof HTMLElement) revealWithDelay(target);
        io.unobserve(target);
      }
    },
    {
      root: null,
      ...revealObserverOptions,
    },
  );

  for (const el of revealEls) {
    if (el.classList.contains('is-visible')) continue;
    io.observe(el);
  }
})();
