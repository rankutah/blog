#!/usr/bin/env node
// Purge specific URLs from Cloudflare cache (HTML-only recommended) and optionally warm them.
// Usage examples:
//   CF_API_TOKEN=... CF_ZONE_ID=... node scripts/cf-purge.js --urls=https://clearpresence.io/
//   CF_API_TOKEN=... CF_ZONE_ID=... node scripts/cf-purge.js --urls=https://clearpresence.io/,https://clearpresence.io/services/ --warm

const args = process.argv.slice(2);
const getArg = (name, def = undefined) => {
  const key = `--${name}`;
  const i = args.findIndex(a => a === key || a.startsWith(`${key}=`));
  if (i === -1) return def;
  const raw = args[i];
  if (raw.includes('=')) return raw.split('=').slice(1).join('=');
  const next = args[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

const urlsArg = getArg('urls', '');
const sitemapUrl = getArg('sitemap', '');
const warm = Boolean(getArg('warm', false));
const token = process.env.CF_API_TOKEN || '';
const zoneId = process.env.CF_ZONE_ID || '';

if (!urlsArg && !sitemapUrl) {
  console.error('[cf-purge] Provide --urls (comma-separated) or --sitemap=https://...');
  process.exit(2);
}
if (!token || !zoneId) {
  console.error('[cf-purge] Please set CF_API_TOKEN and CF_ZONE_ID environment variables.');
  process.exit(2);
}

async function fromSitemap(url){
  const res = await fetch(url, { headers: { 'User-Agent': 'cf-purge/1.1' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap ${url}: ${res.status}`);
  }
  const xml = await res.text();
  // Simple XML parse: extract <loc>...</loc>
  const matches = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1]);
  return matches;
}

function filterHtml(u){
  try {
    const url = new URL(u);
    const p = url.pathname;
    return p === '/' || p.endsWith('.html');
  } catch { return false; }
}

async function resolveTargets(){
  if (sitemapUrl) {
    const all = await fromSitemap(sitemapUrl);
    const onlyHtml = all.filter(filterHtml);
    if (!onlyHtml.length) throw new Error('No HTML URLs found in sitemap.');
    return onlyHtml;
  }
  const direct = urlsArg.split(',').map(s => s.trim()).filter(Boolean);
  if (!direct.length) throw new Error('No valid URLs provided.');
  return direct;
}

async function purge(urlList) {
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
  // Cloudflare limits: 30 URLs per purge request.
  const batchSize = 30;
  for (let i = 0; i < urlList.length; i += batchSize) {
    const batch = urlList.slice(i, i + batchSize);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ files: batch })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      console.error('[cf-purge] Failed:', res.status, json.errors || json);
      process.exit(1);
    }
    console.log(`[cf-purge] Purged batch ${i / batchSize + 1}: ${batch.length} URL(s).`);
  }
}

async function warmUrls(urlList) {
  for (const u of urlList) {
    try {
      const r = await fetch(u, {
        method: 'HEAD',
        headers: { 'User-Agent': 'cf-purge-warm/1.0' },
        cache: 'no-store'
      });
      console.log(`[cf-purge] Warmed ${u} -> ${r.status}`);
    } catch (e) {
      console.warn(`[cf-purge] Warm failed for ${u}:`, e?.message || e);
    }
  }
}

(async () => {
  const targets = await resolveTargets();
  await purge(targets);
  if (warm) {
    await warmUrls(targets);
  }
})();
