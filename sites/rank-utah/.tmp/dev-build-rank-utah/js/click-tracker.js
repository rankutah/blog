/*
  Global click tracker for GA4 using readable event names: click_<slug>.
  - Applies across all sites using the overrides theme.
  - PII-safe: never includes phone numbers or email addresses in event names or params.
  - Noise controls: debounces rapid double-clicks; ignores junk anchors.
  - Zero-collision naming: slug is normalized and capped so event name <= 40 chars.
  - Safe if GA is absent: calls are guarded; no errors in consoles.
*/
(function(){
  try {
    var CLICK_PREFIX = 'click_';
    var MAX_EVENT_LEN = 40; // GA4 event name limit
    var SLUG_MAX = Math.max(8, MAX_EVENT_LEN - CLICK_PREFIX.length); // leave room for prefix
    var DEBOUNCE_MS = 900;
    var DEBUG = false;

    var lastClickAt = new WeakMap();

    function isElement(el){ return el && el.nodeType === 1; }

    function hasDisabled(el){
      try {
        if (!el) return false;
        if (el.hasAttribute && el.hasAttribute('disabled')) return true;
        var aria = (el.getAttribute && el.getAttribute('aria-disabled')) || '';
        return String(aria).toLowerCase() === 'true';
      } catch(_) { return false; }
    }

    function isLikelyConsent(el){
      // Heuristic: skip elements within containers whose id/class suggests cookie/consent banners
      var cur = el;
      while (isElement(cur)){
        var id = (cur.id||'').toLowerCase();
        var cls = (cur.className||'').toString().toLowerCase();
        if (/(cookie|consent|gdpr|ccpa)/.test(id) || /(cookie|consent|gdpr|ccpa)/.test(cls)) return true;
        cur = cur.parentElement;
      }
      return false;
    }

    function closestClickable(start){
      var el = start;
      while (isElement(el)){
        if (el.dataset && el.dataset.analytics === 'off') return null;
        var tag = el.tagName ? el.tagName.toLowerCase() : '';
        var role = (el.getAttribute && el.getAttribute('role')) || '';
        // Track anchors and buttons (including role-mapped)
        if ((tag === 'a' || tag === 'button') && !hasDisabled(el)) return el;
        if (!hasDisabled(el)){
          var r = role.toLowerCase();
          if (r === 'link' || r === 'button') return el;
        }
        el = el.parentElement;
      }
      return null;
    }

    function normSpace(s){ return (s||'').replace(/\s+/g,' ').trim(); }

    function slugify(raw){
      var s = (raw||'').toLowerCase();
      if (!s) return '';
      s = s.replace(/&/g,' and ');
      s = s.normalize ? s.normalize('NFKD') : s; // strip accents if supported
      s = s.replace(/[^a-z0-9]+/g,'_');
      s = s.replace(/_+/g,'_').replace(/^_+|_+$/g,'');
      if (!s) return '';
      if (s.length > SLUG_MAX) s = s.slice(0, SLUG_MAX);
      return s;
    }

    function looksLikePhone(s){
      if (!s) return false;
      var t = s.replace(/[^0-9+]/g,'');
      // Heuristic: 7+ digits or starts with + and 6+ more digits
      return (/^[+]?\d{6,}$/).test(t);
    }

    function looksLikeEmail(s){
      if (!s) return false;
      return /@/.test(s) && /\./.test(s);
    }

    function getLabel(el){
      if (!isElement(el)) return '';
      // Priority: explicit data label, aria-label, title, visible text
      var d = (el.getAttribute('data-analytics-label')||'').trim();
      if (d) return d;
      var aria = (el.getAttribute('aria-label')||'').trim();
      if (aria) return aria;
      var title = (el.getAttribute('title')||'').trim();
      var text = normSpace(el.textContent||'');
      // Prefer longer of title/text if one is clearly descriptive
      return normSpace(text || title);
    }

    function linkInfo(el){
      var tag = el.tagName.toLowerCase();
      var href = (el.getAttribute('href')||'').trim();
      var type = 'internal';
      var url = null;
      var fileExt = '';
      var outboundDomain = '';
      var provider = '';

      // Buttons may submit or trigger JS; treat as button type (trackable)
      if (tag === 'button' || (el.getAttribute('role')||'').toLowerCase()==='button'){
        return { type:'button', linkUrl:'', fileExt:'', outboundDomain:'', provider:'' };
      }

      if (!href) return { type:'unknown', linkUrl:'', fileExt:'', outboundDomain:'', provider:'' };
      if (href === '#' || href.toLowerCase().startsWith('javascript:')){
        return { type:'junk', linkUrl:'', fileExt:'', outboundDomain:'', provider:'' };
      }
      if (href.toLowerCase().startsWith('tel:')){
        return { type:'tel', linkUrl:'', fileExt:'', outboundDomain:'', provider:'' };
      }
      if (href.toLowerCase().startsWith('mailto:')){
        return { type:'mailto', linkUrl:'', fileExt:'', outboundDomain:'', provider:'' };
      }

      // Non-HTTP(S) map schemes (normalize to directions)
      var lowerHref = href.toLowerCase();
      if (lowerHref.startsWith('geo:')){
        return { type:'directions', linkUrl:'', fileExt:'', outboundDomain:'', provider:'geo' };
      }
      if (lowerHref.startsWith('comgooglemaps:')){
        return { type:'directions', linkUrl:'', fileExt:'', outboundDomain:'', provider:'google' };
      }
      if (lowerHref.startsWith('maps:')){
        // iOS maps scheme
        return { type:'directions', linkUrl:'', fileExt:'', outboundDomain:'', provider:'apple' };
      }
      if (lowerHref.startsWith('waze:')){
        return { type:'directions', linkUrl:'', fileExt:'', outboundDomain:'', provider:'waze' };
      }

      // Absolute or relative URL
      try {
        url = new URL(href, window.location.origin);
        var sameHost = url.hostname === window.location.hostname;
        if (!sameHost) { type = 'outbound'; outboundDomain = url.hostname; }
        // Detect downloads by extension
        var m = (url.pathname||'').match(/\.([a-z0-9]{2,6})$/i);
        if (m) { fileExt = (m[1]||'').toLowerCase(); type = type==='outbound' ? 'outbound' : 'download'; }

        // Detect directions/map providers on HTTP(S) links
        var host = (url.hostname||'').toLowerCase();
        var path = (url.pathname||'').toLowerCase();
        var isGoogleMaps = (/\.google\./.test(host) && path.startsWith('/maps')) || host === 'maps.app.goo.gl' || (host === 'goo.gl' && path.startsWith('/maps'));
        var isAppleMaps = host === 'maps.apple.com';
        var isWaze = host.endsWith('waze.com');
        var isBingMaps = host === 'www.bing.com' && path.startsWith('/maps');
        var isOSM = host === 'www.openstreetmap.org' || host === 'openstreetmap.org';

        if (isGoogleMaps || isAppleMaps || isWaze || isBingMaps || isOSM){
          type = 'directions';
          provider = isGoogleMaps ? 'google' : isAppleMaps ? 'apple' : isWaze ? 'waze' : isBingMaps ? 'bing' : 'osm';
          outboundDomain = host;
        }
      } catch(_){
        // If URL parsing fails, treat as internal string
        url = null;
      }

      var sanitized = '';
      if (url){
        // For directions, avoid leaking address in path; keep origin only
        sanitized = (type === 'directions') ? (url.origin || ('https://' + (url.hostname||''))) : (url.origin + url.pathname);
      }
      return { type:type, linkUrl:sanitized, fileExt:fileExt, outboundDomain:outboundDomain, provider:provider };
    }

    function inferPosition(el){
      var cur = el;
      while (isElement(cur)){
        var tag = cur.tagName.toLowerCase();
        if (tag === 'header') return 'header';
        if (tag === 'footer') return 'footer';
        if (tag === 'nav') return 'nav';
        var id = cur.getAttribute('id');
        if (id && (tag === 'section' || tag === 'article' || tag==='div')) return 'section:' + id;
        cur = cur.parentElement;
      }
      return 'body';
    }

    function buildEventName(el, info){
      var label = getLabel(el);
      var base = '';
      // PII-safe mapping for tel/mailto and labels that look like PII
      if (info.type === 'tel' || looksLikePhone(label)) base = 'call';
      else if (info.type === 'mailto' || looksLikeEmail(label)) base = 'email';
      else if (info.type === 'download' && info.fileExt) base = 'download_' + info.fileExt;
      else base = slugify(label) || 'link';

      var name = CLICK_PREFIX + base;
      if (name.length > MAX_EVENT_LEN){
        name = name.slice(0, MAX_EVENT_LEN);
      }
      return name;
    }

    function now(){ return (window.performance && performance.now) ? performance.now() : Date.now(); }

    function alreadyDebounced(el){
      try{
        var t = lastClickAt.get(el) || 0;
        var n = now();
        if (n - t < DEBOUNCE_MS) return true;
        lastClickAt.set(el, n);
        return false;
      } catch(_) { return false; }
    }

    function safeGtag(){
      if (typeof window.gtag === 'function') return window.gtag;
      // If GA script hasn’t loaded, we still push to dataLayer stub if present
      if (Array.isArray(window.dataLayer)){
        return function(){ window.dataLayer.push(arguments); };
      }
      return null;
    }

    function handleClick(ev){
      try {
        if (ev.__ctHandled) return; // avoid double on bubbling
        ev.__ctHandled = true;

  var target = ev.target;
  var el = closestClickable(target);
        if (!el) return;
  if (isLikelyConsent(el)) return; // skip consent/cookie UI
        if (alreadyDebounced(el)) return;

        var info = linkInfo(el);
        if (info.type === 'junk' || info.type === 'unknown') return;

        var name = info.type === 'directions' ? (CLICK_PREFIX + 'directions') : buildEventName(el, info);
        // Build parameters
        var params = {
          page_path: window.location.pathname || '',
          page_title: document.title || '',
          site_id: window.location.hostname || '',
          link_type: info.type,
          element_role: (el.tagName||'').toLowerCase(),
          position: inferPosition(el)
        };
        if (info.linkUrl) params.link_url = info.linkUrl;
        if (info.outboundDomain) params.outbound_domain = info.outboundDomain;
        if (info.fileExt) params.file_ext = info.fileExt;
        if (info.type === 'directions' && info.provider) params.provider = info.provider;

        // Optional: include raw text for context (unregistered to avoid cardinality issues)
        var label = getLabel(el);
        if (label) params.text = (info.type === 'directions') ? 'Directions' : label.slice(0, 120);

        if (DEBUG && window.console && console.debug){ try{ console.debug('[click-tracker]', name, params); } catch(_){} }
        var g = safeGtag();
        if (!g) return; // silently no-op if GA not present
        // Send the event
        try { g('event', name, params); } catch(_) {}
      } catch(_e) { /* swallow */ }
    }

    // Attach handler once on document
  // Lazy-enable console logging if developer sets a localStorage flag
  try { DEBUG = (window.localStorage && localStorage.getItem('cp-debug-clicks') === '1'); } catch(_){}
  document.addEventListener('click', handleClick, { capture:true, passive:true });

  } catch (e) {
    // Do not throw
  }
})();
