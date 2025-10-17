#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

const BASE = 'https://blueridgeabbey.com/';
const siteRoot = path.resolve('sites/blue-ridge-abbey');
const mediaDir = path.join(siteRoot, 'media', 'carousel');
const indexPath = path.join(siteRoot, 'content', '_index.md');

function abs(u){ try { return new URL(u, BASE).toString(); } catch { return null; } }
function cleanName(url){
  try {
    const u = new URL(url);
    // Strip query/hash and keep basename
    const base = path.basename(u.pathname);
    if (base) return base;
  } catch {}
  return `img-${Date.now()}.jpg`;
}
function pickFromSrcset(srcset){
  try {
    const parts = srcset.split(',').map(s=>s.trim()).filter(Boolean);
    if (!parts.length) return '';
    // pick the last (typically largest width)
    const last = parts[parts.length-1];
    const url = last.split(' ')[0];
    return url || '';
  } catch { return ''; }
}

async function download(url, outFile){
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outFile, buf);
}

async function scrape(){
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  // wait for slideshow container
  await page.waitForSelector('.slideshow-component.instance-3.full', { timeout: 20000 });

  // Helper to collect image URLs from the container
  async function collectOnce(){
    const urls = await page.evaluate(() => {
      const root = document.querySelector('.slideshow-component.instance-3.full');
      if (!root) return [];
      const out = new Set();
      const add = (u)=>{ try{ if(u && /\.(avif|webp|jpe?g|png)(\?|$)/i.test(u)) out.add(new URL(u, location.href).toString()); }catch{} };
      // imgs
      root.querySelectorAll('img').forEach(img => {
        const ds = img.getAttribute('data-src') || img.getAttribute('data-lazy') || '';
        const ss = img.getAttribute('srcset') || '';
        const s  = img.getAttribute('src') || '';
        if (ss){
          const last = ss.split(',').map(x=>x.trim()).filter(Boolean).slice(-1)[0] || '';
          const u = (last.split(' ')[0] || '').trim();
          add(u);
        }
        add(ds || s);
      });
      // inline style backgrounds
      root.querySelectorAll('[style]').forEach(el => {
        const cs = getComputedStyle(el).backgroundImage || '';
        const m = cs.match(/url\(("|')?([^"')]+)("|')?\)/i);
        if (m && m[2]) add(m[2]);
        const s = el.getAttribute('style')||'';
        const m2 = s.match(/background-image:\s*url\(("|')?([^"')]+)("|')?\)/i);
        if (m2 && m2[2]) add(m2[2]);
      });
      return Array.from(out);
    });
    return urls;
  }

  let urls = await collectOnce();

  // Try advancing slides a few times to surface lazy slides
  const delay = (ms)=>new Promise(r=>setTimeout(r,ms));
  for (let i=0;i<8;i++){
    // click any likely next/arrow button inside the container
    const clicked = await page.evaluate(() => {
      const root = document.querySelector('.slideshow-component.instance-3.full');
      if (!root) return false;
      const candidates = Array.from(root.querySelectorAll('button, a'));
      const target = candidates.find(el => /next|right|›|»/i.test(el.textContent||'') || /next|right|arrow|chevron|carousel-next/i.test(el.className||'') || el.getAttribute('aria-label')?.toLowerCase() === 'next');
      if (target){ target.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true })); return true; }
      return false;
    });
  await delay(700);
    const more = await collectOnce();
    urls = Array.from(new Set([...urls, ...more]));
    if (!clicked) break;
  }

  await browser.close();
  return urls;
}

async function update(){
  const urls = await scrape();
  if (!urls.length) throw new Error('no images found in slideshow');
  await fs.mkdir(mediaDir, { recursive: true });
  const saved = [];
  for (const u of urls){
    const absUrl = abs(u);
    if (!absUrl) continue;
    let fn = cleanName(absUrl);
    // avoid collisions
    let out = path.join(mediaDir, fn);
    let n=1;
    while (true){
      try { await fs.access(out); fn = `${path.parse(fn).name}-${n}${path.extname(fn)}`; out = path.join(mediaDir, fn); n++; }
      catch { break; }
    }
    try { await download(absUrl, out); saved.push(`/media/carousel/${fn}`); console.log('saved', fn); }
    catch(e){ console.warn('skip', absUrl, e.message); }
  }
  if (!saved.length) throw new Error('no images saved');

  let md = await fs.readFile(indexPath, 'utf8');
  const re = /(\{\{<\s*carousel\s+id=\"bkg-hero\"\s+images=\")[^"]*(\"[^}]*>\}\})/;
  if (re.test(md)){
    md = md.replace(re, (_, a, b) => `${a}${saved.join(',')}${b}`);
    await fs.writeFile(indexPath, md, 'utf8');
    console.log('updated carousel images in _index.md');
  } else {
    console.warn('carousel with id="bkg-hero" not found; images saved only');
  }
}

update().catch(err => { console.error(err.stack || err.message); process.exit(1); });
