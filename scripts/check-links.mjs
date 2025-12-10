#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('Usage: node scripts/check-links.mjs --site=<siteName> [--dir=<builtHtmlDir>]');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  }
  return opts;
}

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(p);
    } else {
      yield p;
    }
  }
}

function isInternalHref(href) {
  if (!href) return false;
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  if (href.startsWith('#')) return false; // anchor only
  return href.startsWith('/');
}

function normalizeTarget(href) {
  // Strip query/hash
  const clean = href.replace(/[?#].*$/, '');
  // Ensure trailing slash for directories (Hugo outputs pretty URLs with trailing slash folders)
  return clean;
}

function targetExists(publicRoot, href) {
  const clean = normalizeTarget(href);
  // Try exact file path
  const filePath = path.join(publicRoot, clean);
  if (fs.existsSync(filePath)) return true;
  // If href ends with '/', check index.html inside
  if (clean.endsWith('/')) {
    const idx = path.join(publicRoot, clean, 'index.html');
    if (fs.existsSync(idx)) return true;
  } else {
    // If href has no trailing slash, try as directory with index.html
    const idxAlt = path.join(publicRoot, clean, 'index.html');
    if (fs.existsSync(idxAlt)) return true;
  }
  return false;
}

function extractHrefs(html) {
  const hrefs = [];
  // Very simple regex to catch href attributes; good enough for minified HTML
  const re = /href\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    hrefs.push(m[1]);
  }
  return hrefs;
}

function checkSite(site, overrideDir) {
  const publicDir = overrideDir ? path.resolve(overrideDir) : path.resolve(`sites/${site}/public`);
  if (!fs.existsSync(publicDir)) {
    console.error(`[link-check] No public output found for site: ${site} at ${publicDir}`);
    process.exitCode = 2;
    return { ok: false, broken: [] };
  }
  const htmlFiles = [];
  for (const p of walk(publicDir)) {
    if (p.endsWith('.html')) htmlFiles.push(p);
  }
  const broken = [];
  for (const file of htmlFiles) {
    let html;
    try { html = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const hrefs = extractHrefs(html).filter(isInternalHref);
    for (const href of hrefs) {
      if (!targetExists(publicDir, href)) {
        broken.push({ file: path.relative(publicDir, file), href });
      }
    }
  }
  const count = broken.length;
  if (count === 0) {
    console.log(`[link-check] ${site}: OK (no broken internal links)`);
    return { ok: true, broken: [] };
  }
  console.error(`[link-check] ${site}: Found ${count} broken internal link(s)`);
  for (const b of broken) {
    console.error(` - Broken: ${b.href}\n   Referenced from: ${b.file}`);
  }
  // Fail hard so CI and local builds stop; provides clear details for fixes
  process.exit(1);
  return { ok: false, broken };
}

(function main(){
  const opts = parseArgs();
  const site = opts.site || process.env.SITE;
  const dir = opts.dir; // optional override for built HTML root
  if (!site) { usage(); process.exit(1); }
  checkSite(site, dir);
})();
