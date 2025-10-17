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
const warm = Boolean(getArg('warm', false));
const token = process.env.CF_API_TOKEN || '';
const zoneId = process.env.CF_ZONE_ID || '';

if (!urlsArg) {
  console.error('[cf-purge] Missing --urls (comma-separated list)');
  process.exit(2);
}
if (!token || !zoneId) {
  console.error('[cf-purge] Please set CF_API_TOKEN and CF_ZONE_ID environment variables.');
  process.exit(2);
}

const urls = urlsArg.split(',').map(s => s.trim()).filter(Boolean);
if (!urls.length) {
  console.error('[cf-purge] No valid URLs provided.');
  process.exit(2);
}

async function purge(urlList) {
  const endpoint = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ files: urlList })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    console.error('[cf-purge] Failed:', res.status, json.errors || json);
    process.exit(1);
  }
  console.log(`[cf-purge] Purged ${urlList.length} URL(s).`);
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
  await purge(urls);
  if (warm) {
    await warmUrls(urls);
  }
})();
