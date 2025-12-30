(function () {
  const html = document.documentElement;

  const defaultTheme = html.getAttribute('data-default-theme') || 'auto'; // "light" | "dark" | "auto"
  const storageKey = html.getAttribute('data-theme-storage-key') || 'pref-theme';
  const recoveredKey = html.getAttribute('data-theme-recovered-key') || 'pref-theme:recovered';

  function prefersDark() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }

  function getStored() {
    try {
      let stored = localStorage.getItem(storageKey);

      // Localhost safety: if a leaked/accidental stored preference forces light in dev,
      // fall back to OS when defaultTheme=auto and no forceTheme is set.
      try {
        const host = window.location && window.location.hostname ? window.location.hostname : '';
        const isLocal =
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '0.0.0.0' ||
          host.endsWith('.localhost');

        const forced = html.getAttribute('data-force-theme');
        const recovered = localStorage.getItem(recoveredKey);

        if (
          isLocal &&
          recovered !== '1' &&
          !forced &&
          defaultTheme === 'auto' &&
          (stored === 'light' || stored === 'dark')
        ) {
          const osDark = prefersDark();
          if ((osDark && stored === 'light') || (!osDark && stored === 'dark')) {
            localStorage.removeItem(storageKey);
            localStorage.setItem(recoveredKey, '1');
            stored = null;
          }
        }
      } catch {
        // noop
      }

      return stored;
    } catch {
      return null;
    }
  }

  function wantDark() {
    const forced = html.getAttribute('data-force-theme');
    if (forced === 'dark') return true;
    if (forced === 'light') return false;

    const stored = getStored();
    if (stored === 'dark') return true;
    if (stored === 'light') return false;

    if (defaultTheme === 'dark') return true;
    if (defaultTheme === 'light') return false;

    return prefersDark();
  }

  function applyBackgroundClasses(isDark) {
    try {
      const lightCls = html.getAttribute('data-bg-light');
      const darkCls = html.getAttribute('data-bg-dark');

      // Apply to <html>
      if (lightCls) html.classList.remove(lightCls);
      if (darkCls) html.classList.remove(darkCls);
      if (isDark) {
        if (darkCls) html.classList.add(darkCls);
      } else {
        if (lightCls) html.classList.add(lightCls);
      }

      // Apply to <body> once available
      const body = document.body;
      if (body) {
        if (lightCls) body.classList.remove(lightCls);
        if (darkCls) body.classList.remove(darkCls);
        if (isDark) {
          if (darkCls) body.classList.add(darkCls);
        } else {
          if (lightCls) body.classList.add(lightCls);
        }
      }
    } catch {
      // noop
    }
  }

  function setThemeAttrs(isDark) {
    try {
      const v = isDark ? 'dark' : 'light';
      html.setAttribute('data-theme', v);
      if (document.body) document.body.setAttribute('data-theme', v);
    } catch {
      // noop
    }
  }

  function applyTheme() {
    const isDark = wantDark();

    if (isDark) {
      html.classList.add('dark');
      if (document.body) document.body.classList.add('dark');
    } else {
      html.classList.remove('dark');
      if (document.body) document.body.classList.remove('dark');
    }

    setThemeAttrs(isDark);
    applyBackgroundClasses(isDark);
  }

  // Sync body + observers after parse (theme class itself is set pre-paint inline)
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyTheme, { once: true });
    } else {
      applyTheme();
    }
  } catch {
    // noop
  }

  // React to changes of data-force-theme
  try {
    new MutationObserver((muts) => {
      for (let i = 0; i < muts.length; i++) {
        if (muts[i].attributeName === 'data-force-theme') {
          applyTheme();
          break;
        }
      }
    }).observe(html, { attributes: true });
  } catch {
    // noop
  }

  // React to OS changes
  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (mql && mql.addEventListener) mql.addEventListener('change', applyTheme);
    else if (mql && mql.addListener) mql.addListener(applyTheme);
  } catch {
    // noop
  }

  // React to localStorage changes (other tabs)
  try {
    window.addEventListener('storage', (e) => {
      if (e && e.key === storageKey) applyTheme();
    });
  } catch {
    // noop
  }

  // Brand/Theme recolor (nav accents) — non-critical, run after parse
  try {
    const BRAND_HEX = {
      gray: { light: '#4b5563', dark: '#6b7280' },
      neutral: { light: '#525252', dark: '#737373' },
      red: { light: '#dc2626', dark: '#ef4444' },
      orange: { light: '#ea580c', dark: '#f97316' },
      amber: { light: '#d97706', dark: '#f59e0b' },
      yellow: { light: '#ca8a04', dark: '#eab308' },
      lime: { light: '#65a30d', dark: '#84cc16' },
      green: { light: '#16a34a', dark: '#22c55e' },
      emerald: { light: '#059669', dark: '#10b981' },
      teal: { light: '#0d9488', dark: '#14b8a6' },
      cyan: { light: '#0891b2', dark: '#06b6d4' },
      sky: { light: '#0284c7', dark: '#0ea5e9' },
      blue: { light: '#2563eb', dark: '#3b82f6' },
      indigo: { light: '#4f46e5', dark: '#6366f1' },
      violet: { light: '#7c3aed', dark: '#8b5cf6' },
      purple: { light: '#9333ea', dark: '#a855f7' },
      fuchsia: { light: '#c026d3', dark: '#d946ef' },
      pink: { light: '#db2777', dark: '#ec4899' },
      rose: { light: '#e11d48', dark: '#f43f5e' },
    };

    const SITE_BRAND =
      html.getAttribute('data-brand') || (html.className || 'blue').split(' ')[0] || 'blue';

    function currentBrand() {
      return (html.getAttribute('data-brand') || SITE_BRAND || 'blue').trim();
    }

    function recolorNavbar() {
      const isDark = html.classList.contains('dark');
      const pal = BRAND_HEX[currentBrand()] || BRAND_HEX.blue;
      const fg = isDark ? pal.dark : pal.light;

      document
        .querySelectorAll('nav .nav-brand, [data-brand-nav="fg"]')
        .forEach((el) => el && (el.style.color = fg));
      document
        .querySelectorAll('nav .nav-brand-bg, [data-brand-nav="bg"]')
        .forEach((el) => el && (el.style.backgroundColor = fg));
      document
        .querySelectorAll('nav .nav-brand-border, [data-brand-nav="border"]')
        .forEach((el) => el && (el.style.borderColor = fg));
    }

    function recolorAll() {
      recolorNavbar();
    }

    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          try {
            requestAnimationFrame(recolorAll);
          } catch {
            recolorAll();
          }
        },
        { once: true }
      );
    } else {
      recolorAll();
    }

    new MutationObserver((m) => {
      for (const x of m) {
        if (x.attributeName === 'class') {
          recolorAll();
          break;
        }
      }
    }).observe(html, { attributes: true });

    window.addEventListener('cp:brandchange', (e) => {
      if (e && e.detail) html.setAttribute('data-brand', e.detail);
      recolorAll();
    });
  } catch {
    // noop
  }
})();
