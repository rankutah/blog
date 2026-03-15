(function () {
  function readConfig() {
    try {
      var el = document.getElementById('cp-analytics-config');
      if (!el) return {};
      return JSON.parse(el.textContent || '{}');
    } catch (e) {
      return {};
    }
  }

  var cfg = readConfig();
  var attributionCfg = cfg.attribution && typeof cfg.attribution === 'object' ? cfg.attribution : {};
  if (attributionCfg.enabled !== true) return;

  var params = Array.isArray(attributionCfg.captureParams)
    ? attributionCfg.captureParams
    : ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var fieldPrefix = String(attributionCfg.fieldPrefix || 'attribution_');
  var includeLandingPage = attributionCfg.includeLandingPage !== false;
  var includeReferrer = attributionCfg.includeReferrer !== false;
  var persistDays = parseInt(attributionCfg.persistDays, 10);
  if (!(persistDays >= 1)) persistDays = 90;

  var hostname = ((window.location && window.location.hostname) || 'site').toLowerCase();
  var storageKey = 'cp_attr:' + hostname;

  function canStore() {
    try {
      var testKey = storageKey + ':test';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  if (!canStore()) return;

  function now() {
    return Date.now();
  }

  function ttlMs() {
    return persistDays * 24 * 60 * 60 * 1000;
  }

  function currentPageUrl() {
    try {
      return String((window.location && window.location.href) || '').split('#')[0];
    } catch (e) {
      return '';
    }
  }

  function currentReferrer() {
    try {
      return String(document.referrer || '');
    } catch (e) {
      return '';
    }
  }

  function loadRecord() {
    try {
      var raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (parsed.expiresAt && parsed.expiresAt < now()) {
        window.localStorage.removeItem(storageKey);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function saveRecord(record) {
    if (!record || typeof record !== 'object') return;
    record.expiresAt = now() + ttlMs();
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(record));
    } catch (e) {}
  }

  function readIncomingValues() {
    var values = {};
    var found = false;

    try {
      var search = new URLSearchParams((window.location && window.location.search) || '');
      for (var i = 0; i < params.length; i += 1) {
        var key = String(params[i] || '').trim();
        if (!key) continue;
        var value = String(search.get(key) || '').trim();
        if (!value) continue;
        values[key] = value;
        found = true;
      }
    } catch (e) {
      return { found: false, values: {} };
    }

    return { found: found, values: values };
  }

  function persistIncomingValues() {
    var incoming = readIncomingValues();
    if (!incoming.found) return loadRecord();

    var record = loadRecord() || {};
    if (!record.values || typeof record.values !== 'object') record.values = {};

    for (var key in incoming.values) {
      if (Object.prototype.hasOwnProperty.call(incoming.values, key)) {
        record.values[key] = incoming.values[key];
      }
    }

    var pageUrl = currentPageUrl();
    var referrer = currentReferrer();
    if (!record.firstLandingPage) record.firstLandingPage = pageUrl;
    if (!record.firstReferrer && referrer) record.firstReferrer = referrer;
    record.lastLandingPage = pageUrl;
    if (referrer) record.lastReferrer = referrer;
    record.updatedAt = now();

    saveRecord(record);
    return record;
  }

  function findField(form, name) {
    var fields = form.querySelectorAll('input[type="hidden"][name]');
    for (var i = 0; i < fields.length; i += 1) {
      if (fields[i].name === name) return fields[i];
    }
    return null;
  }

  function ensureHiddenField(form, name, value) {
    if (!form || !name || value == null || value === '') return;
    var field = findField(form, name);
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = name;
      field.setAttribute('data-cp-attribution-field', 'true');
      form.appendChild(field);
    }
    field.value = String(value);
  }

  function populateForm(form) {
    if (!form || form.getAttribute('data-cp-attribution-form') !== 'true') return;
    var record = loadRecord();
    if (!record || !record.values) return;

    for (var i = 0; i < params.length; i += 1) {
      var key = String(params[i] || '').trim();
      if (!key) continue;
      var value = record.values[key];
      if (value == null || value === '') continue;
      ensureHiddenField(form, fieldPrefix + key, value);
    }

    if (includeLandingPage && record.firstLandingPage) {
      ensureHiddenField(form, fieldPrefix + 'landing_page', record.firstLandingPage);
    }
    if (includeReferrer && record.firstReferrer) {
      ensureHiddenField(form, fieldPrefix + 'referrer', record.firstReferrer);
    }
    if (record.updatedAt) {
      try {
        ensureHiddenField(form, fieldPrefix + 'captured_at', new Date(record.updatedAt).toISOString());
      } catch (e) {}
    }
  }

  function populateExistingForms() {
    var forms = document.querySelectorAll('form[data-cp-attribution-form="true"]');
    for (var i = 0; i < forms.length; i += 1) {
      populateForm(forms[i]);
    }
  }

  persistIncomingValues();
  populateExistingForms();

  document.addEventListener(
    'submit',
    function (ev) {
      var form = ev && ev.target;
      if (!form || !form.tagName || String(form.tagName).toLowerCase() !== 'form') return;
      populateForm(form);
    },
    true
  );

  window.cpGetAttributionData = function () {
    return loadRecord();
  };
})();