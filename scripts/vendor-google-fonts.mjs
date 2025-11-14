#!/usr/bin/env node
/*
Vendor Google Fonts CSS2 for a site into static assets.
- Reads `SITE` env var (e.g., blue-ridge-abbey)
- Looks up `sites/<SITE>/config.toml` for `[params.fonts].load`
- Downloads the CSS from https://fonts.googleapis.com/css2?<load>
- Parses .woff2 URLs, downloads them under `sites/<SITE>/static/fonts/google/`
- Writes rewritten CSS with local URLs to `sites/<SITE>/static/fonts/google/fonts.css`

Idempotent: if files exist, skips re-downloading.
*/
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE = process.env.SITE;
if (!SITE) {
  console.error('[vendor-google-fonts] Set SITE env var. Example: SITE=blue-ridge-abbey node scripts/vendor-google-fonts.mjs');
  process.exit(1);
}

const siteRoot = path.resolve(__dirname, '..', 'sites', SITE);
const configPath = path.join(siteRoot, 'config.toml');
const outDir = path.join(siteRoot, 'static', 'fonts', 'google');
const outCss = path.join(outDir, 'fonts.css');

function extractLoadParam(tomlText) {
  // naive extraction: find [params.fonts] block and load = "..."
  const blockIdx = tomlText.indexOf('\n[params.fonts]');
  if (blockIdx === -1) return '';
  const rest = tomlText.slice(blockIdx + 1);
  // Read until next [section]
  const nextSec = rest.search(/\n\[/);
  const body = nextSec === -1 ? rest : rest.slice(0, nextSec);
  const m = body.match(/\n\s*load\s*=\s*"([^"]+)"/);
  return m ? m[1] : '';
}

async function ensureDir(p) { try { await fs.mkdir(p, { recursive: true }); } catch {} }

async function download(url, filePath) {
  if (fssync.existsSync(filePath)) return; // skip existing
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, buf);
}

(async function main(){
  let cfg = '';
  try { cfg = await fs.readFile(configPath, 'utf8'); } catch {
    console.error(`[vendor-google-fonts] Missing config: ${configPath}`);
    process.exit(1);
  }
  const load = extractLoadParam(cfg);
  if (!load) {
    console.log('[vendor-google-fonts] No fonts.load found. Nothing to do.');
    return;
  }
  const cssUrl = `https://fonts.googleapis.com/css2?${load}`;
  const cssRes = await fetch(cssUrl);
  if (!cssRes.ok) throw new Error(`Unable to fetch Google Fonts CSS: ${cssRes.status}`);
  const cssText = await cssRes.text();

  // Collect all woff2 URLs
  const woff2Urls = Array.from(cssText.matchAll(/url\((https?:\/\/[^)]+\.woff2)\)/g)).map(m => m[1]);
  const replacements = [];
  for (const url of woff2Urls) {
    const name = path.basename(new URL(url).pathname);
    const localPath = path.join(outDir, name);
    const localUrl = `/fonts/google/${name}`;
    await download(url, localPath);
    replacements.push({ url, localUrl });
    console.log(`+ font ${name}`);
  }
  let localCss = cssText;
  for (const r of replacements) {
    localCss = localCss.replaceAll(r.url, r.localUrl);
  }
  await ensureDir(outDir);
  await fs.writeFile(outCss, localCss, 'utf8');
  console.log(`✔ Wrote ${path.relative(process.cwd(), outCss)}`);
  console.log('Next: set params.fonts.vendorCss = "/fonts/google/fonts.css" in your site config.');
})();
