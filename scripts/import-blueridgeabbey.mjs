#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fetch from 'node-fetch';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'sites', 'blue-ridge-abbey');
const CONTENT = path.join(SITE, 'content');
const MEDIA = path.join(SITE, 'media');

const BASE_URL = 'https://blueridgeabbey.com/';

async function ensureDirs() {
  await fs.mkdir(CONTENT, { recursive: true });
  await fs.mkdir(MEDIA, { recursive: true });
}

function sanitizeFilename(url) {
  return url
    .replace(/[?#].*$/, '')
    .split('/')
    .filter(Boolean)
    .slice(-1)[0] || 'index';
}

async function downloadAsset(absUrl, outName) {
  try {
    const res = await fetch(absUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${absUrl}`);
    const buf = await res.arrayBuffer();
    const filePath = path.join(MEDIA, outName);
    await fs.writeFile(filePath, Buffer.from(buf));
    return `/media/${outName}`; // path used in content
  } catch (e) {
    console.warn('asset download failed:', absUrl, e.message);
    return absUrl; // fallback to remote URL
  }
}

function abs(url, base = BASE_URL) {
  try { return new URL(url, base).href; } catch { return url; }
}

function extractLinksAndImages(doc) {
  const nav = Array.from(doc.querySelectorAll('a'))
    .map(a => ({ href: a.getAttribute('href') || '', text: (a.textContent||'').trim() }))
    .filter(x => x.href && !x.href.startsWith('mailto:') && !x.href.startsWith('tel:'));
  const images = Array.from(doc.querySelectorAll('img'))
    .map(img => ({ src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' }))
    .filter(x => x.src);
  return { nav, images };
}

async function htmlToMarkdown(url, html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  // Remove scripts/styles
  document.querySelectorAll('script,style,noscript').forEach(n => n.remove());

  // Rewrite image src to local media and collect them
  const imgNodes = Array.from(document.querySelectorAll('img'));
  for (const img of imgNodes) {
    const src = img.getAttribute('src');
    if (!src) continue;
    const absUrl = abs(src, url);
    const name = sanitizeFilename(absUrl);
    const ext = path.extname(name) || '.jpg';
    const out = (path.extname(name) ? name : `${name}${ext}`);
    const local = await downloadAsset(absUrl, out);
    img.setAttribute('src', local);
  }

  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  const main = document.body; // fallback to body; we can refine if needed
  const md = turndown.turndown(main.innerHTML);
  return md;
}

function fm(title, url) {
  return `---\ntitle: "${title}"\ndescription: ""\nlayout: "flowbite"\nurl: "${url}"\n---\n\n`;
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const html = await res.text();
  return html;
}

async function importSinglePage(pageUrl, outSlug, title) {
  const html = await fetchPage(pageUrl);
  const md = await htmlToMarkdown(pageUrl, html);
  const outPath = path.join(CONTENT, `${outSlug}.md`);
  await fs.writeFile(outPath, fm(title, `/${outSlug}`) + md + '\n');
  return outPath;
}

async function main() {
  await ensureDirs();
  console.log('Importing from', BASE_URL);

  // Import homepage → index.md
  const homeHtml = await fetchPage(BASE_URL);
  const homeMd = await htmlToMarkdown(BASE_URL, homeHtml);
  await fs.writeFile(path.join(CONTENT, '_index.md'), fm('Home', '/') + homeMd + '\n');

  // Heuristic: create separate pages for key sections mentioned
  // Adjust URLs below to match actual anchors/sections if available
  const pages = [
    { slug: 'contact', title: 'Contact', url: BASE_URL + '#contact' },
    { slug: 'rooms',   title: 'Rooms',   url: BASE_URL + '#rooms' },
    { slug: 'weddings',title: 'Weddings',url: BASE_URL + '#weddings' },
  ];

  for (const p of pages) {
    try {
      await importSinglePage(p.url, p.slug, p.title);
      console.log('Imported', p.slug);
    } catch (e) {
      console.warn('Failed importing', p.slug, e.message);
    }
  }

  console.log('Done. Placeholders created where assets failed to download.');
}

main().catch(err => { console.error(err); process.exit(1); });
