/* Lightweight search that reads the site index.json and filters client-side. */
(function(){
  let INDEX_URL = (typeof window !== 'undefined' && window.SEARCH_INDEX_URL) || '/index.json';
  if (typeof INDEX_URL === 'string') {
    INDEX_URL = INDEX_URL.replace(/^['"]|['"]$/g, '');
  }
  const q = new URLSearchParams(location.search).get('q') || '';

  function htm(str){
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }

  function decodeEntities(s){
    if (s == null) return '';
    const t = document.createElement('textarea');
    t.innerHTML = String(s);
    return t.value;
  }

  function normalizeForMatch(s){
    return String(s ?? '')
      .toLowerCase()
      .replace(/[\u2019\u2018]/g, "'")   // curly → straight apostrophe
      .replace(/[\u201C\u201D]/g, '"')   // curly → straight quote
      .replace(/[\u2013\u2014]/g, '-')   // en/em dash → hyphen
      .replace(/\u00A0/g, ' ');           // nbsp → space
  }

  function highlight(text, term){
    const src = String(text ?? '');
    if (!term) return htm(src);
    const srcNorm = normalizeForMatch(src);
    const tNorm = normalizeForMatch(term).trim();
    if (!tNorm) return htm(src);
    const ranges = [];
    let i = 0;
    while (true) {
      const idx = srcNorm.indexOf(tNorm, i);
      if (idx < 0) break;
      ranges.push([idx, idx + tNorm.length]);
      i = idx + Math.max(1, tNorm.length);
    }
    if (!ranges.length) return htm(src);
    let out = '';
    let last = 0;
    for (const [a,b] of ranges) {
      if (a > last) out += htm(src.slice(last, a));
      out += '<mark>' + htm(src.slice(a, b)) + '</mark>';
      last = b;
    }
    if (last < src.length) out += htm(src.slice(last));
    return out;
  }

  function snippetAround(haystack, term, before=60, total=240){
    if (!haystack) return '';
    const src = String(haystack);
    const srcNorm = normalizeForMatch(src);
    const t = normalizeForMatch(term||'');
    const idx = t ? srcNorm.indexOf(t) : -1;
    if (idx < 0) return src.slice(0, total); // fallback: leading slice
    const start = Math.max(0, idx - before);
    const end = Math.min(src.length, start + total);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < src.length ? '…' : '';
    return prefix + src.slice(start, end) + suffix;
  }

  function render(items, term){
    const list = document.getElementById('search-results');
    const count = document.getElementById('search-count');
    const cardBorder = list.getAttribute('data-card-border') || '';
    const cardBg = list.getAttribute('data-card-bg') || '';
    list.innerHTML = '';
    count.textContent = `${items.length} result${items.length===1?'':'s'}`;
    // Schedule analytics even on zero results
    scheduleAnalytics(term, items.length);
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'text-gray-500 dark:text-gray-400 text-center py-6';
      li.textContent = 'No results found.';
      list.appendChild(li);
      return;
    }
    const frag = document.createDocumentFragment();
    for (const it of items) {
      // Choose best snippet source: summary if it contains the term; otherwise take a window from content around the match.
      const termLc = normalizeForMatch(term||'');
      const sum = it.summary || '';
      const cnt = it.content || '';
      const useSummary = termLc && normalizeForMatch(sum).includes(termLc);
      const sourceText = useSummary ? sum : cnt;
      const base = termLc
        ? snippetAround(sourceText, term, 60, 240)
        : (sum || cnt).slice(0,240);
      const li = document.createElement('li');
      li.className = `rounded-lg shadow-sm overflow-hidden ${cardBorder} ${cardBg}`.trim();
      li.innerHTML = `
        <a href="${it.permalink}" class="no-underline block p-5">
          <h3 class="text-lg md:text-xl font-semibold leading-snug text-gray-900 dark:text-white">${highlight(it.title||'Untitled', term)}</h3>
          <p class="mt-2 text-[0.95rem] text-gray-700 dark:text-gray-300 clamp-2">${highlight(base||'', term)}</p>
        </a>`;
      frag.appendChild(li);
    }
    list.appendChild(frag);
  }

  // --- Minimal debounced analytics instrumentation ---
  let _lastSentSearch = '';
  let _analyticsTimer = null;
  const ANALYTICS_DEBOUNCE_MS = 450;

  function scheduleAnalytics(term, count){
    if (!term) return;
    const raw = String(term).trim();
    if (raw.length < 3) return; // ignore very short terms
    const normalized = normalizeForMatch(raw).trim();
    if (!normalized) return;
    // Avoid duplicate consecutive sends for identical normalized term
    if (normalized === _lastSentSearch) return;
    if (_analyticsTimer) clearTimeout(_analyticsTimer);
    _analyticsTimer = setTimeout(()=>{
      _lastSentSearch = normalized;
      const payload = {
        event: 'view_search_results',
        search_term: raw,
        normalized_term: normalized,
        result_count: count,
        zero_results: count === 0
      };
      // gtag style
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'view_search_results', {
          search_term: payload.search_term,
          normalized_term: payload.normalized_term,
          result_count: payload.result_count,
          zero_results: payload.zero_results
        });
      }
      // GTM / dataLayer style
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push(payload);
      }
      // CustomEvent hook for other listeners
      window.dispatchEvent(new CustomEvent('search:results:view', { detail: payload }));
    }, ANALYTICS_DEBOUNCE_MS);
  }

  function filter(data, term){
    if (!term) return [];
    const t = normalizeForMatch(term).trim();
    if (!t) return [];
    return data.filter(d => {
      const hay = normalizeForMatch(((d.title||'') + ' ' + (d.summary||'') + ' ' + (d.content||'')));
      return hay.includes(t);
    }).slice(0, 100);
  }

  async function main(){
    const input = document.getElementById('search-input');
    const form = document.getElementById('search-form');
    let data = [];
    try {
      const res = await fetch(INDEX_URL, { credentials: 'omit' });
      data = await res.json();
      // Decode any HTML entities that slipped through server-side
      data = data.map(d => ({
        ...d,
        title: decodeEntities(d.title),
        summary: decodeEntities(d.summary),
        content: decodeEntities(d.content),
      }));
    } catch (e) {
      // fail soft; show message
      document.getElementById('search-results').innerHTML = '<li class="text-red-600 dark:text-red-400">Failed to load index.json</li>';
      return;
    }

    // initial state from ?q=
    if (q) {
      input.value = q;
      render(filter(data, q), q);
    }

    function onInput(){
      const term = input.value;
      render(filter(data, term), term);
    }

    input.addEventListener('input', onInput);
    form.addEventListener('submit', (e)=>{ e.preventDefault(); onInput(); history.replaceState(null, '', `?q=${encodeURIComponent(input.value)}`); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main, { once:true });
  else main();
})();
