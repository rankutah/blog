// fab.js
// Keeps the floating message FAB visible and pinned across viewport changes.

(function () {
  var fab = document.querySelector('.cp-fab');
  if (!fab) return;

  var topLink = document.getElementById('top-link');
  var STACK_GAP = 12;

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

  function reparentToBody(el) {
    try {
      if (el && el.parentNode && el.parentNode.tagName && el.parentNode.tagName.toLowerCase() !== 'body') {
        document.body.appendChild(el);
        return true;
      }
    } catch (_e) {}
    return false;
  }

  try {
    if (reparentToBody(fab)) log('reparented-to-body');
    reparentToBody(topLink);
  } catch (_e) {}

  function normalizeTopLink() {
    if (!topLink) return;
    try {
      topLink.removeAttribute('hidden');
      topLink.removeAttribute('aria-hidden');
      if (topLink.classList.contains('hidden')) topLink.classList.remove('hidden');

      topLink.style.display = 'inline-flex';
      topLink.style.position = 'fixed';
      topLink.style.transform = 'translateZ(0)';
      topLink.style.backfaceVisibility = 'hidden';
      topLink.style.willChange = 'opacity, transform';
    } catch (_e) {}
  }

  function pinTopLinkLeftOfFab() {
    if (!topLink) return;
    try {
      var fabRect = fab.getBoundingClientRect();
      var tlRect = topLink.getBoundingClientRect();

      // Place the scroll-to-top button to the LEFT of the FAB.
      // Align bottoms so it looks intentional next to a pill-shaped FAB.
      var left = fabRect.left - STACK_GAP - tlRect.width;
      var top = fabRect.bottom - tlRect.height;

      topLink.style.left = Math.max(0, Math.round(left)) + 'px';
      topLink.style.top = Math.max(0, Math.round(top)) + 'px';
      topLink.style.right = 'auto';
      topLink.style.bottom = 'auto';
    } catch (_e) {}
  }

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
  normalizeTopLink();
  pinTopLinkLeftOfFab();

  function onAnyUpdate() {
    normalize();
    normalizeTopLink();
    pinTopLinkLeftOfFab();
  }

  window.addEventListener('scroll', onAnyUpdate, { passive: true });
  document.addEventListener('visibilitychange', onAnyUpdate);
  window.addEventListener('resize', onAnyUpdate, { passive: true });

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

        // Keep the scroll-to-top button stacked above the FAB.
        try {
          normalizeTopLink();
          pinTopLinkLeftOfFab();
        } catch (_e2) {}
      }

      pinToViewport();
      vv.addEventListener('scroll', pinToViewport, { passive: true });
      vv.addEventListener('resize', pinToViewport, { passive: true });
    }
  } catch (_e) {}

  try {
    var mo1 = new MutationObserver(function (muts) {
      log('fab-attributes-mutated', muts && muts.length);
      onAnyUpdate();
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
          onAnyUpdate();
        }
      } catch (_e2) {}
    });
    mo2.observe(document.body, { childList: true, subtree: true });
  } catch (_e) {}
})();
