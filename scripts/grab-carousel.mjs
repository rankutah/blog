#!/usr/bin/env node
// Fetch images from the homepage slideshow component and update the Blue Ridge Abbey carousel.
// Looks for .slideshow-component.instance-3.full, pulls <img src> and background-image URLs.
// Downloads to sites/blue-ridge-abbey/media/carousel and updates _index.md carousel images list.

import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const BASE = 'https://blueridgeabbey.com/';
const siteRoot = path.resolve('sites/blue-ridge-abbey');
const mediaDir = path.join(siteRoot, 'media', 'carousel');
const indexPath = path.join(siteRoot, 'content', '_index.md');

function ensureAbs(u){ try { return new URL(u, BASE).toString(); } catch { return null; } }
function pickFilename(url){ try { const u = new URL(url); const fn = path.basename(u.pathname); return fn || `img-${Date.now()}.jpg`; } catch { return `img-${Date.now()}.jpg`; } }
function uniq(arr){ return Array.from(new Set(arr)); }

async function download(url, outFile){
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
  const buf = await res.arrayBuffer();
  await fs.writeFile(outFile, Buffer.from(buf));
}

async function run(){
  const resp = await fetch(BASE, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`fetch homepage failed: ${resp.status}`);
  const html = await resp.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const root = doc.querySelector('.slideshow-component.instance-3.full');
  if (!root) throw new Error('slideshow component not found');

  const urls = [];
  // <img src>
  root.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src') || '';
    const u = ensureAbs(src);
    if (u) urls.push(u);
  });
  // background-image from style attributes
  root.querySelectorAll('[style]').forEach(el => {
    const s = el.getAttribute('style') || '';
    const m = s.match(/background-image:\s*url\(("|')?([^"')]+)("|')?\)/i);
    if (m && m[2]){
      const u = ensureAbs(m[2]);
      if (u) urls.push(u);
    }
  });

  const list = uniq(urls).filter(u => /\.(avif|webp|jpe?g|png)$/i.test(u));
  if (!list.length) throw new Error('no image URLs found in slideshow');

  await fs.mkdir(mediaDir, { recursive: true });

  const saved = [];
  for (const u of list){
    const fn = pickFilename(u);
    const outFile = path.join(mediaDir, fn);
    try {
      await download(u, outFile);
      saved.push(`/media/carousel/${fn}`);
      console.log('saved', fn);
    } catch (e) {
      console.warn('skip', u, e.message);
    }
  }

  if (!saved.length) throw new Error('no images saved');

  // Update _index.md carousel line
  let md = await fs.readFile(indexPath, 'utf8');
  const re = /(\{\{<\s*carousel\s+id=\"bkg-hero\"\s+images=\")[^"]*(\"[^}]*>\}\})/;
  if (re.test(md)){
    md = md.replace(re, (_, a, b) => `${a}${saved.join(',')}${b}`);
  } else {
    console.warn('carousel with id="bkg-hero" not found; no file update performed');
  }
  await fs.writeFile(indexPath, md, 'utf8');
  console.log('updated carousel images in _index.md');
}

run().catch(err => { console.error(err.stack || err.message); process.exit(1); });
