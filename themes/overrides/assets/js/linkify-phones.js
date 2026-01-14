/*
  Linkify plain-text US phone numbers into tel: links across content.
  - Client-side only; avoids server-side HTML regex risk.
  - Skips inside anchors, buttons, code/pre, scripts/styles, inputs.
  - Normalizes to E.164 (+1XXXXXXXXXX) for consistent tel: hrefs.
  - Plays well with existing GA click-tracker (which handles tel: clicks).
*/
(function(){
  try {
    var LIMIT = 200; // max replacements per page (safety)
    var count = 0;
    // Matches common US formats: (435) 867-5309, 435-867-5309, 435.867.5309, 435 867 5309, +1 435 867 5309
    var RE = /(?:\+?1[-.\s]*)?(?:\(\d{3}\)|\d{3})[-.\s]*\d{3}[-.\s]*\d{4}\b/g;

    function shouldSkip(node){
      var p = node && node.parentNode;
      while (p && p.nodeType === 1){
        var tag = (p.tagName||'').toLowerCase();
        if (tag === 'a' || tag === 'button' || tag === 'script' || tag === 'style' || tag === 'code' || tag === 'pre' || tag === 'svg' || tag === 'textarea' || tag === 'input') return true;
        p = p.parentNode;
      }
      return false;
    }

    function normalizeToE164(raw){
      var s = String(raw||'');
      var digits = s.replace(/[^0-9+]/g,'');
      if (!digits) return null;
      if (digits[0] === '+'){
        // Keep + and digits only
        digits = '+' + digits.slice(1).replace(/\D/g,'');
        // Accept +1XXXXXXXXXX or other E.164 forms
        return digits.length >= 5 ? digits : null;
      }
      // Remove any non-digits
      var d = digits.replace(/\D/g,'');
      if (d.length === 10) return '+1' + d;
      if (d.length === 11 && d[0] === '1') return '+' + d;
      return null; // don't attempt to guess shorter locals
    }

    function linkifyTextNode(node){
      var text = node.nodeValue;
      if (!text) return false;
      var m, last = 0;
      var frag = document.createDocumentFragment();
      var changed = false;
      RE.lastIndex = 0;
      while ((m = RE.exec(text)) && count < LIMIT){
        var full = m[0];
        var tel = normalizeToE164(full);
        if (!tel) continue;
        // Append text before the match
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        // Create anchor
        var a = document.createElement('a');
        a.href = 'tel:' + tel;
        a.textContent = full;
        a.setAttribute('rel','nofollow');
        a.setAttribute('data-analytics-label','Call');
        a.className = 'link-brand';
        frag.appendChild(a);
        last = m.index + full.length;
        count++;
        changed = true;
      }
      if (!changed) return false;
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
      return true;
    }

    function process(root){
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function(n){
          if (!n || !n.nodeValue) return NodeFilter.FILTER_REJECT;
          if (shouldSkip(n)) return NodeFilter.FILTER_REJECT;
          if (!RE.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [];
      var cur;
      while ((cur = walker.nextNode())) nodes.push(cur);
      nodes.forEach(linkifyTextNode);
    }

    function run(){
      var root = document.querySelector('main#content') || document.body;
      process(root);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once:true });
    else run();
  } catch(e){ /* swallow */ }
})();
