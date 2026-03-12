// footer-ui.js
// Small first-party UI helpers that were previously inlined in the footer.

(function () {
  // Persist horizontal menu scroll
  try {
    var menu = document.getElementById('menu');
    if (menu) {
      try {
        menu.scrollLeft = localStorage.getItem('menu-scroll-position') || 0;
      } catch (_e) {}
      menu.onscroll = function () {
        try {
          localStorage.setItem('menu-scroll-position', menu.scrollLeft);
        } catch (_e) {}
      };
    }
  } catch (_e) {}

  // Smooth scroll for in-page anchors, with mobile-menu close
  try {
    var anchors = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < anchors.length; i++) {
      anchors[i].addEventListener(
        'click',
        function (e) {
          try {
            var href = this.getAttribute('href') || '';
            var raw = href.replace(/^#/, '');
            var id = decodeURIComponent(raw);
            var target = document.getElementById(id);
            if (!id || !target) return;

            e.preventDefault();

            function setHeaderVar() {
              try {
                var nav = document.querySelector('nav');
                if (!nav) return;
                var h = Math.ceil(nav.getBoundingClientRect().height);
                document.documentElement.style.setProperty('--site-header-h', h + 'px');
              } catch (_e2) {}
            }

            var btn = document.querySelector('[data-collapse-toggle="navbar-sticky"]');
            var sticky = document.getElementById('navbar-sticky');
            var isMobile = false;
            try {
              isMobile = window.matchMedia('(max-width: 767.98px)').matches;
            } catch (_e3) {}
            var menuOpen = !!(sticky && !sticky.classList.contains('hidden'));

            function performScroll() {
              setHeaderVar();
              var smoothOk = true;
              try {
                smoothOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              } catch (_e4) {}
              try {
                target.scrollIntoView(smoothOk ? { behavior: 'smooth', block: 'start' } : { block: 'start' });
              } catch (_e5) {
                try {
                  target.scrollIntoView();
                } catch (_e6) {}
              }

              try {
                if (id === 'top') history.replaceState(null, null, ' ');
                else history.pushState(null, null, '#' + id);
              } catch (_e7) {}
            }

            if (menuOpen && isMobile) {
              sticky.classList.add('hidden');
              if (btn) btn.setAttribute('aria-expanded', 'false');
              try {
                var menus = document.querySelectorAll('[id^="menu-"]');
                for (var j = 0; j < menus.length; j++) menus[j].classList.add('hidden');
              } catch (_e8) {}
              try {
                var toggles = document.querySelectorAll('[data-dropdown-toggle]');
                for (var k = 0; k < toggles.length; k++) toggles[k].setAttribute('aria-expanded', 'false');
              } catch (_e9) {}

              try {
                requestAnimationFrame(function () {
                  requestAnimationFrame(performScroll);
                });
              } catch (_e10) {
                performScroll();
              }
            } else {
              performScroll();
            }
          } catch (_err) {}
        },
        { passive: false }
      );
    }
  } catch (_e) {}

  // Scroll-to-top visibility
  try {
    var topLink = document.getElementById('top-link');
    if (topLink) {
      var SHOW_AFTER_Y = 400;
      var onScroll = function () {
        try {
          var y = document.body.scrollTop || document.documentElement.scrollTop || 0;
          if (y > SHOW_AFTER_Y) {
            topLink.style.visibility = 'visible';
            topLink.style.opacity = '1';
            topLink.style.pointerEvents = 'auto';
          } else {
            topLink.style.visibility = 'hidden';
            topLink.style.opacity = '0';
            topLink.style.pointerEvents = 'none';
          }
        } catch (_e2) {}
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  } catch (_e) {}

  // Theme toggle (auto -> dark -> light -> auto)
  try {
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      var siteKey = null;
      try {
        siteKey = window.__cpThemeSiteKey || null;
      } catch (_e2) {
        siteKey = null;
      }
      var storageKey = siteKey ? 'pref-theme:' + siteKey : 'pref-theme';

      themeBtn.addEventListener('click', function () {
        try {
          var html = document.documentElement;
          var stored = null;
          try {
            stored = localStorage.getItem(storageKey);
          } catch (_e3) {
            stored = null;
          }

          var current = stored === 'dark' || stored === 'light' ? stored : 'auto';
          var next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';

          try {
            if (next === 'auto') localStorage.removeItem(storageKey);
            else localStorage.setItem(storageKey, next);
          } catch (_e4) {}

          if (next === 'auto') html.setAttribute('data-force-theme', '');
          else html.setAttribute('data-force-theme', next);

          var makeDark = false;
          try {
            makeDark =
              next === 'auto'
                ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
                : next === 'dark';
          } catch (_e5) {
            makeDark = next === 'dark';
          }

          if (makeDark) {
            html.classList.add('dark');
            if (document.body) document.body.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
            if (document.body) document.body.setAttribute('data-theme', 'dark');
          } else {
            html.classList.remove('dark');
            if (document.body) document.body.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
            if (document.body) document.body.setAttribute('data-theme', 'light');
          }
        } catch (_err) {}
      });
    }
  } catch (_e) {}
})();
