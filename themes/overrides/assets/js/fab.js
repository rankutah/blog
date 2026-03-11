// fab.js
// Keeps the floating message FAB visible and pinned across viewport changes.

(function () {
  var fab = document.querySelector('.cp-fab');
  if (!fab) return;

  var DBG = false;
  try {
    DBG = window.localStorage && localStorage.getItem('cp-debug-fab') === '1';
  } catch (_e) {}

  function log() {
    if (DBG) {
      try {
        console.debug('[cp-fab]', Date.now(), [].slice.call(arguments));
      } catch (_e) {}
    }
  }

  try {
    if (
      fab.parentNode &&
      fab.parentNode.tagName &&
      fab.parentNode.tagName.toLowerCase() !== 'body'
    ) {
      document.body.appendChild(fab);
      log('reparented-to-body');
    }
  } catch (_e) {}

  function normalize() {
    try {
      fab.removeAttribute('hidden');
      fab.removeAttribute('aria-hidden');
      if (fab.classList.contains('hidden')) fab.classList.remove('hidden');

      fab.style.visibility = 'visible';
      fab.style.opacity = '1';
      fab.style.display = 'inline-flex';
      fab.style.pointerEvents = 'auto';
      fab.style.position = 'fixed';

      if (DBG) {
        var cs = window.getComputedStyle
          ? getComputedStyle(fab)
          : { display: '', visibility: '', opacity: '', position: '' };
        log('normalize', {
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          position: cs.position,
        });
      }
    } catch (_e) {}
  }

  normalize();
  window.addEventListener('scroll', normalize, { passive: true });
  document.addEventListener('visibilitychange', normalize);
  window.addEventListener('resize', normalize, { passive: true });

  try {
    if (window.visualViewport) {
      var vv = window.visualViewport;
      var spacing = 16;

      function pinToViewport() {
        try {
          var r = fab.getBoundingClientRect();
          var top = vv.height - spacing - r.height + (vv.offsetTop || 0);
          var left = vv.width - spacing - r.width + (vv.offsetLeft || 0);
          fab.style.top = Math.max(0, Math.round(top)) + 'px';
          fab.style.left = Math.max(0, Math.round(left)) + 'px';
          fab.style.bottom = 'auto';
          fab.style.right = 'auto';
        } catch (_e) {}
      }

      pinToViewport();
      vv.addEventListener('scroll', pinToViewport, { passive: true });
      vv.addEventListener('resize', pinToViewport, { passive: true });
    }
  } catch (_e) {}

  try {
    var mo1 = new MutationObserver(function (muts) {
      log('fab-attributes-mutated', muts && muts.length);
      normalize();
    });
    mo1.observe(fab, {
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'],
    });

    var mo2 = new MutationObserver(function (muts) {
      try {
        if (!fab.isConnected || !document.querySelector('.cp-fab')) {
          log('fab-removed-or-missing', muts);
          document.body.appendChild(fab);
          normalize();
        }
      } catch (_e2) {}
    });
    mo2.observe(document.body, { childList: true, subtree: true });
  } catch (_e) {}
})();
