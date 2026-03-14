#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import fetch from 'node-fetch';
import TurndownService from 'turndown';
import { JSDOM, VirtualConsole } from 'jsdom';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SITE_SLUG = process.env.SITE_SLUG || 'breaking-barriers';
const SITE_ROOT = path.join(ROOT, 'sites', SITE_SLUG);
const CONTENT_DIR = path.join(SITE_ROOT, 'content');
const MEDIA_DIR = path.join(SITE_ROOT, 'media');
const MEDIA_IMPORT_DIR = path.join(MEDIA_DIR, 'import');

const BASE_URL = (process.env.BASE_URL || 'https://www.breakingbarrierstherapy.com/').replace(/\/+$/, '/')
const ORIGIN = new URL(BASE_URL).origin;

const MAX_PAGES = Number(process.env.MAX_PAGES || '60');
const DRY_RUN = (process.env.DRY_RUN || '').toLowerCase() === 'true';

function log(...args) {
  console.log(...args);
}

async function ensureDirs() {
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  await fs.mkdir(MEDIA_IMPORT_DIR, { recursive: true });
}

function makeDom(html, url) {
  const vc = new VirtualConsole();
  // Squarespace can emit CSS that JSDOM's CSS parser doesn't fully accept.
  // We don't need CSS for import, so drop those parse errors.
  vc.on('jsdomError', () => {});
  return new JSDOM(html, {
    url,
    virtualConsole: vc,
    runScripts: 'outside-only',
  });
}

function normalizePath(input) {
  if (!input) return '';
  try {
    const u = new URL(input, BASE_URL);
    if (u.origin !== ORIGIN) return '';
    // Ignore most asset URLs
    if (/(\.(css|js|png|jpe?g|webp|avif|gif|svg|ico|pdf|xml|txt))$/i.test(u.pathname)) return '';
    if (u.pathname.startsWith('/api')) return '';

    let p = u.pathname;
    // Some Squarespace pages use /home for the homepage
    if (p === '/home') p = '/';
    // Normalize trailing slash
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return p;
  } catch {
    return '';
  }
}

function pageSlugFromPath(p) {
  if (p === '/' || p === '') return '_index';
  return p.replace(/^\//, '').replace(/\//g, '-');
}

function urlForFrontMatter(p) {
  if (p === '/' || p === '') return '/';
  return p;
}

function fm({ title, description = '', url }) {
  const safeTitle = (title || '').replace(/"/g, '\\"').trim() || 'Untitled';
  const safeUrl = (url || '/').replace(/"/g, '\\"');
  const safeDesc = (description || '').replace(/"/g, '\\"').trim();
  return `---\ntitle: "${safeTitle}"\ndescription: "${safeDesc}"\nlayout: flowbite\nurl: "${safeUrl}"\n---\n\n`;
}

function sanitizeFilename(name) {
  const base = name
    .replace(/[?#].*$/, '')
    .split('/')
    .filter(Boolean)
    .slice(-1)[0] || 'asset';
  // limit weird chars
  return base.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function hash8(input) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 8);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'blog-importer/1.0 (+https://github.com/rankutah/blog)',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return await res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'blog-importer/1.0 (+https://github.com/rankutah/blog)',
      accept: '*/*',
    },
  });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const arr = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || '';
  return { buf: Buffer.from(arr), contentType };
}

async function tryFetchSitemapUrls() {
  // Prefer robots.txt sitemap entries.
  try {
    const robots = await fetchText(new URL('/robots.txt', BASE_URL).href);
    const matches = robots.match(/^sitemap:\s*(.+)$/gim) || [];
    const urls = matches.map(line => line.split(/\s+/).slice(1).join(' ').trim()).filter(Boolean);
    if (urls.length) return urls;
  } catch {
    // ignore
  }
  return [new URL('/sitemap.xml', BASE_URL).href];
}

function parseSitemapLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
  return locs;
}

async function getSeedPaths() {
  const sitemapUrls = await tryFetchSitemapUrls();
  const seed = new Set(['/','/contact']);
  for (const sm of sitemapUrls) {
    try {
      const xml = await fetchText(sm);
      for (const loc of parseSitemapLocs(xml)) {
        const p = normalizePath(loc);
        if (p) seed.add(p);
      }
    } catch (e) {
      log('Sitemap fetch failed:', sm, e.message);
    }
  }
  return Array.from(seed);
}

function collectInternalLinks(doc, pageUrl) {
  const out = new Set();
  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    if (!href) continue;
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) continue;
    const abs = new URL(href, pageUrl).href;
    const p = normalizePath(abs);
    if (p) out.add(p);
  }
  return out;
}

function makeTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
  });

  // Preserve line breaks in a predictable way.
  td.addRule('br', {
    filter: 'br',
    replacement: () => '  \n',
  });

  // Avoid converting buttons/inputs as weird text.
  td.remove(['script', 'style', 'noscript', 'svg']);

  return td;
}

function cleanImportedMarkdown(md) {
  if (!md) return '';

  let out = md.replace(/\u00a0/g, ' ').replace(/\r/g, '');
  out = out.replace(/\[\*\*([^\]]+)\*\*\]\(([^)]+)\)/g, '[$1]($2)');
  out = out.replace(/\*\*/g, '');
  out = out.replace(/[ \t]+\n/g, '\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  out = out.replace(/(^#+\s*)(.+)$/gm, (_, hashes, text) => `${hashes}${text.replace(/\s+/g, ' ').trim()}`);
  return out.trim();
}

function classifyImportedImage(src = '', alt = '') {
  const value = `${src} ${alt}`.toLowerCase();
  if (/(logo|casp|asha|bacb|member_logo|member-logo|certified|hipaa|usha)/.test(value)) {
    return 'logo';
  }
  if (/(untitled--281000-x-1000-px|untitled-design|screenshot_2025-07-03_214212|icon)/.test(value)) {
    return 'badge';
  }
  return 'photo';
}

function makeImportedImageShortcode(src, alt = '') {
  const escapedAlt = alt.replace(/"/g, '\\"');
  const kind = classifyImportedImage(src, alt);

  if (kind === 'logo') {
    return `{{< img src="${src}" alt="${escapedAlt}" class="mx-auto w-full max-w-xs h-auto rounded-none shadow-none border-0" sizes="220px" >}}`;
  }

  if (kind === 'badge') {
    return `{{< img src="${src}" alt="${escapedAlt}" class="mx-auto w-full max-w-[10rem] h-auto rounded-none shadow-none border-0" sizes="160px" >}}`;
  }

  return `{{< img src="${src}" alt="${escapedAlt}" class="mx-auto w-full max-w-4xl h-auto rounded-xl shadow border border-gray-200 dark:border-gray-700" sizes="(min-width: 1280px) 960px, (min-width: 768px) 80vw, 100vw" >}}`;
}

function extractSectionBackgroundUrl(section) {
  const stylesStr = section.getAttribute('data-current-styles') || '';
  if (!stylesStr) return '';
  try {
    const obj = JSON.parse(stylesStr);
    const url = obj?.backgroundImage?.assetUrl || obj?.backgroundImage?.url || '';
    return url || '';
  } catch {
    return '';
  }
}

function blockType(el) {
  const t = el.getAttribute('data-sqsp-block');
  if (t) return t;
  if (el.querySelector('.sqs-html-content')) return 'text';
  if (el.querySelector('a.sqs-block-button-element, a[href].sqs-button-element')) return 'button';
  if (el.querySelector('img[src]')) return 'image';
  if (el.querySelector('form')) return 'form';
  return '';
}

async function downloadToMedia(absUrl, preferredBaseName = '') {
  const u = new URL(absUrl);
  const base = preferredBaseName || sanitizeFilename(u.pathname);
  const baseNoExt = base.replace(/\.[a-z0-9]+$/i, '');

  // Deduplicate with hash; keep original extension if present.
  const extFromPath = path.extname(base);
  const h = hash8(absUrl);

  let filename = `${baseNoExt}-${h}${extFromPath || ''}`;
  const fullPath = path.join(MEDIA_IMPORT_DIR, filename);

  try {
    await fs.access(fullPath);
    return `/media/import/${filename}`;
  } catch {
    // not present
  }

  if (DRY_RUN) {
    return `/media/import/${filename}`;
  }

  const { buf, contentType } = await fetchBuffer(absUrl);
  if (!path.extname(filename)) {
    const ct = contentType.toLowerCase();
    if (ct.includes('image/png')) filename += '.png';
    else if (ct.includes('image/jpeg')) filename += '.jpg';
    else if (ct.includes('image/webp')) filename += '.webp';
    else if (ct.includes('image/avif')) filename += '.avif';
    else if (ct.includes('image/svg')) filename += '.svg';
    else filename += '.bin';
  }

  await fs.writeFile(path.join(MEDIA_IMPORT_DIR, filename), buf);
  return `/media/import/${filename}`;
}

function normalizeButtonUrl(href, pageUrl) {
  try {
    const u = new URL(href, pageUrl);
    if (u.origin === ORIGIN) return normalizePath(u.href) || href;
    return u.href;
  } catch {
    return href;
  }
}

async function convertSectionToMarkdown(section, { pageUrl, td, pageState }) {
  const blocks = Array.from(section.querySelectorAll('.sqs-block'));
  const out = [];

  for (const block of blocks) {
    const t = blockType(block);

    if (t === 'text') {
      const html = block.querySelector('.sqs-html-content')?.innerHTML || '';
      const md = cleanImportedMarkdown(td.turndown(html).trim());
      if (md) out.push(md);
      continue;
    }

    if (t === 'button') {
      const a = block.querySelector('a[href]');
      if (!a) continue;
      const href = a.getAttribute('href') || '';
      const text = (a.textContent || '').trim();
      if (!href || !text) continue;
      const url = normalizeButtonUrl(href, pageUrl);
      out.push(`{{< button url="${url}" text="${text.replace(/\"/g, '\\"')}" >}}`);
      continue;
    }

    if (t === 'image') {
      const img = block.querySelector('img[src]');
      if (!img) continue;
      const src = img.getAttribute('src') || '';
      const alt = (img.getAttribute('alt') || '').trim();
      if (!src) continue;
      const abs = new URL(src, pageUrl).href;
      let local = abs;
      try {
        local = await downloadToMedia(abs);
      } catch (e) {
        log('Image download failed:', abs, e.message);
      }
      out.push(makeImportedImageShortcode(local, alt));
      continue;
    }

    if (t === 'form') {
      if (pageState.formEmitted) continue;
      pageState.formEmitted = true;
      // Map any Squarespace form block to our shared contact form.
      out.push('{{< contact-form id="contact1" >}}');
      out.push('{{< button submit="true" form="contact1" text="Send Message" >}}');
      continue;
    }
  }

  return out.join('\n\n').trim();
}

async function convertPageToMarkdown(pageUrl, html, pagePath) {
  const dom = makeDom(html, pageUrl);
  const { document } = dom.window;

  // Strip scripts/styles early to reduce noise.
  document.querySelectorAll('script,style,noscript').forEach(n => n.remove());

  const title =
    document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    document.querySelector('title')?.textContent ||
    pagePath.replace(/^\//, '') ||
    'Breaking Barriers Therapy';

  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    '';
  const descriptionClean = (description || '').replace(/\s+/g, ' ').trim();

  const main = document.querySelector('main#page') || document.body;
  const sectionsRoot = main.querySelector('article#sections') || main;

  const sections = Array.from(
    sectionsRoot.querySelectorAll('section[data-test="page-section"], section')
  ).filter(sec => sec.querySelector('.sqs-block'));

  const td = makeTurndown();
  const pageState = { formEmitted: false };

  const parts = [];
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const bg = extractSectionBackgroundUrl(sec);
    const body = await convertSectionToMarkdown(sec, { pageUrl, td, pageState });
    if (!body) continue;

    if (bg) {
      let localBg = bg;
      try {
        const absBg = new URL(bg, pageUrl).href;
        localBg = await downloadToMedia(absBg, `bg-${i + 1}${path.extname(new URL(absBg).pathname)}`);
      } catch (e) {
        log('Background download failed:', bg, e.message);
      }

      if (i === 0) {
        parts.push(`{{< hero img="${localBg}" bleed="true" overlay="true" overlayShade="bg-black/45" align="center" imgStyle="height: 58vh" >}}\n\n${body}\n\n{{< /hero >}}`);
      } else {
        parts.push(`{{< section img="${localBg}" bleed="false" overlay="true" overlayShade="bg-black/40" >}}\n\n${body}\n\n{{< /section >}}`);
      }
    } else {
      parts.push(body);
    }
  }

  const md = cleanImportedMarkdown(parts.join('\n\n'));
  return { title: title.trim(), description: descriptionClean, md };
}

async function writePage({ pagePath, title, description, md }) {
  const slug = pageSlugFromPath(pagePath);
  const outPath = slug === '_index'
    ? path.join(CONTENT_DIR, '_index.md')
    : path.join(CONTENT_DIR, `${slug}.md`);

  const front = fm({ title, description, url: urlForFrontMatter(pagePath) });
  const content = front + md.trim() + '\n';

  if (DRY_RUN) {
    log('[dry-run] would write', path.relative(ROOT, outPath));
    return;
  }

  await fs.writeFile(outPath, content);
  log('Wrote', path.relative(ROOT, outPath));
}

async function downloadSiteLogo() {
  const url = new URL('/', BASE_URL).href;
  let html = '';
  try {
    html = await fetchText(url);
  } catch (e) {
    log('Logo fetch failed:', e.message);
    return;
  }

  const dom = makeDom(html, url);
  const { document } = dom.window;
  const candidates = Array.from(document.querySelectorAll('header img[src], a[href="/"] img[src], img[alt][src]'));

  function score(img) {
    const src = (img.getAttribute('src') || '').toLowerCase();
    const alt = (img.getAttribute('alt') || '').toLowerCase();
    let s = 0;
    if (src.includes('logo')) s += 5;
    if (alt.includes('breaking')) s += 3;
    if (alt.includes('barriers')) s += 3;
    if (src.includes('squarespace')) s += 1;
    return s;
  }

  const best = candidates.sort((a, b) => score(b) - score(a))[0];
  if (!best) return;

  const src = best.getAttribute('src') || '';
  if (!src) return;

  let abs = '';
  try { abs = new URL(src, url).href; } catch { return; }

  if (DRY_RUN) {
    log('[dry-run] would download logo:', abs);
    return;
  }

  try {
    const { buf, contentType } = await fetchBuffer(abs);
    const ct = (contentType || '').toLowerCase();
    const urlExt = path.extname(new URL(abs).pathname).toLowerCase();

    const isWebp = ct.includes('image/webp') || (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP');
    const isSvg = ct.includes('image/svg') || urlExt === '.svg';

    let outBuf = buf;
    let outExt = urlExt || '.png';

    // Hugo's image pipeline used by favicons expects a real raster it can decode.
    // If the logo is WebP (often served even when the URL ends with .png), convert to PNG.
    if (isWebp) {
      outBuf = await sharp(buf).png().toBuffer();
      outExt = '.png';
    } else if (isSvg) {
      outExt = '.svg';
    } else if (ct.includes('image/png')) {
      outExt = '.png';
    } else if (ct.includes('image/jpeg')) {
      outExt = '.jpg';
    } else if (ct.includes('image/avif')) {
      outExt = '.avif';
    }

    await fs.writeFile(path.join(MEDIA_DIR, `logo${outExt}`), outBuf);
    log('Wrote', path.relative(ROOT, path.join(MEDIA_DIR, `logo${outExt}`)));
  } catch (e) {
    log('Logo download failed:', abs, e.message);
  }
}

async function crawlAllPaths(seedPaths) {
  const queue = [...seedPaths];
  const visited = new Set();

  while (queue.length && visited.size < MAX_PAGES) {
    const p = queue.shift();
    if (!p || visited.has(p)) continue;
    visited.add(p);

    const url = new URL(p, BASE_URL).href;

    let html = '';
    try {
      html = await fetchText(url);
    } catch (e) {
      log('Fetch failed:', p, e.message);
      continue;
    }

    const dom = makeDom(html, url);
    const { document } = dom.window;

    const links = collectInternalLinks(document, url);
    for (const lp of links) {
      if (!visited.has(lp)) queue.push(lp);
    }
  }

  return Array.from(visited).sort();
}

async function main() {
  await ensureDirs();

  await downloadSiteLogo();

  log('Import base:', BASE_URL);
  const seed = await getSeedPaths();
  log('Seed paths:', seed.length);

  const paths = await crawlAllPaths(seed);
  log('Discovered paths:', paths.length);

  // Import in stable order (home first)
  const ordered = ['/', ...paths.filter(p => p !== '/')];

  for (const p of ordered) {
    if (p === '/404') continue;

    const url = new URL(p, BASE_URL).href;
    let html = '';
    try {
      html = await fetchText(url);
    } catch (e) {
      log('Skip (fetch failed):', p, e.message);
      continue;
    }

    const { title, description, md } = await convertPageToMarkdown(url, html, p);
    await writePage({ pagePath: p, title, description, md });
  }

  log('Done. Next: run `pnpm run optimize:breaking-barriers` then `pnpm run deriv:breaking-barriers` before building for responsive images.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
