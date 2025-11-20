/* Lightweight search that reads the site index.json and filters client-side. */
(function(){
  let INDEX_URL = (typeof window !== 'undefined' && window.SEARCH_INDEX_URL) || '/index.json';
  if (typeof INDEX_URL === 'string') {
    INDEX_URL = INDEX_URL.replace(/^['"]|['"]$/g, '');
  }
  const q = new URLSearchParams(location.search).get('q') || '';
  // State used for search analytics (emoji suffix strategy)
  const searchState = {
    lastTerm: '',
    lastResultsCount: 0,
    committed: false, // success or abandoned already sent
  };
  const SUCCESS_EMOJI = '✅';
  const ABANDONED_EMOJI = '❌';
  let DEBUG_SEARCH = false;
  try { DEBUG_SEARCH = (window.localStorage && localStorage.getItem('cp-debug-search') === '1'); } catch(_) {}

  function canSend(){
    return typeof window !== 'undefined' && typeof window.gtag === 'function';
  }
  function cleanedTerm(raw){
    // Preserve user casing, just trim leading/trailing whitespace.
    return String(raw || '').replace(/\s+/g, ' ').trim();
  }
  function sendOutcome(type){
    if (searchState.committed) return; // already sent for this session term
    const base = cleanedTerm(searchState.lastTerm);
    if (!base) return; // don't send empty queries
    const suffix = type === 'success' ? SUCCESS_EMOJI : ABANDONED_EMOJI;
    const eventTerm = base + ' ' + suffix;
    if (canSend()) {
      try {
        const payload = { search_term: eventTerm, transport_type: 'beacon' };
        if (DEBUG_SEARCH && window.console && console.debug) {
          console.debug('[search-analytics] sending view_search_results', payload);
        }
        window.gtag('event','view_search_results', payload);
      } catch(e){ if (DEBUG_SEARCH) console.debug('[search-analytics] failed', e); }
    } else if (DEBUG_SEARCH) {
      console.debug('[search-analytics] gtag unavailable; event queued implicitly by stub? term=', eventTerm);
    }
    searchState.committed = true;
  }
  function markSuccess(){ sendOutcome('success'); }
  function markAbandoned(){ sendOutcome('abandoned'); }

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
    // Update analytics state (not committing here; commit is on interaction / lifecycle)
    const prevBase = cleanedTerm(searchState.lastTerm);
    searchState.lastTerm = term || '';
    searchState.lastResultsCount = items.length;
    if (searchState.committed && cleanedTerm(searchState.lastTerm) !== prevBase) {
      searchState.committed = false;
    }
    // Enhanced Measurement: rely on GA4 automatic view_search_results via ?q=, no manual event.
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

  // Removed manual analytics instrumentation; GA4 Enhanced Measurement handles site search via ?q=.

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
    const resultsList = document.getElementById('search-results');
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
      // If user cleared the term after typing and not committed -> abandoned
      if (!term && !searchState.committed && cleanedTerm(searchState.lastTerm)) {
        markAbandoned();
      }
    }

    input.addEventListener('input', onInput);
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      onInput();
      history.replaceState(null, '', `?q=${encodeURIComponent(input.value)}`);
      // Treat Enter submit as success only if we currently have results.
      if (!searchState.committed) {
        if (searchState.lastResultsCount > 0) markSuccess(); else markAbandoned();
      }
    });

    // Delegate clicks on result links for success tracking.
    resultsList.addEventListener('click', (e)=>{
      const a = e.target.closest('a');
      if (!a) return;
      if (searchState.committed) return; // already recorded
      // If there are results (there are, since a exists), mark success.
      markSuccess();
      // Ensure event has a moment to flush before navigation for same-tab left clicks.
      if (e.button === 0 && !a.target) {
        e.preventDefault();
        setTimeout(()=>{ window.location.href = a.href; }, 40);
      }
    });

    // Middle-click / auxiliary click (mouseup) can't be prevented; still mark success.
    resultsList.addEventListener('auxclick', (e)=>{
      const a = e.target.closest('a');
      if (!a) return;
      if (!searchState.committed) markSuccess();
    });

    // Abandon on page hide (user navigates away without success)
    window.addEventListener('pagehide', ()=>{ if (!searchState.committed && cleanedTerm(searchState.lastTerm)) markAbandoned(); });
    // Fallback: visibility change to hidden (some browsers fire without pagehide in SPA contexts)
    document.addEventListener('visibilitychange', ()=>{
      if (document.visibilityState === 'hidden' && !searchState.committed && cleanedTerm(searchState.lastTerm)) {
        markAbandoned();
      }
    });
    // beforeunload: legacy + some edge cases (minimized reliability with beacon transport)
    window.addEventListener('beforeunload', ()=>{ if (!searchState.committed && cleanedTerm(searchState.lastTerm)) markAbandoned(); });
    // Escape key: treat as abandonment if user dismisses search after typing
    input.addEventListener('keydown',(e)=>{
      if (e.key === 'Escape') {
        if (!searchState.committed && cleanedTerm(searchState.lastTerm)) markAbandoned();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main, { once:true });
  else main();
})();
