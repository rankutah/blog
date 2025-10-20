#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

const siteRoot = path.resolve('sites/blue-ridge-abbey');
const mediaDir = path.join(siteRoot, 'media', 'carousel');
const indexPath = path.join(siteRoot, 'content', '_index.md');

function sanitizeName(url) {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname);
    if (base) return base;
  } catch {}
  // fallback
  return `img-${Date.now()}.jpg`;
}

async function download(url, outFile) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, buf);
}

async function run() {
  let md = await fs.readFile(indexPath, 'utf8');
  const re = /(\{\{<\s*carousel\s+id="bkg-hero"\s+images=")(.*?)"/;
  const m = md.match(re);
  if (!m) {
    console.error('carousel with id="bkg-hero" not found');
    process.exit(1);
  }
  const list = m[2];
  const urls = list.split(',').map(s => s.trim()).filter(Boolean);
  const localPaths = [];
  for (const u of urls) {
    try {
      const name = sanitizeName(u);
      let filename = name;
      let out = path.join(mediaDir, filename);
      let n = 1;
      // avoid collisions
      for (;;) {
        try { await fs.access(out); filename = `${path.parse(name).name}-${n}${path.extname(name)}`; out = path.join(mediaDir, filename); n++; }
        catch { break; }
      }
      await download(u, out);
      localPaths.push(`/media/carousel/${filename}`);
      console.log('saved', filename);
    } catch (e) {
      console.warn('skip', u, e.message);
    }
  }
  if (!localPaths.length) {
    console.error('no images downloaded');
    process.exit(2);
  }
  const newMd = md.replace(re, (_all, a) => `${a}${localPaths.join(',')}`);
  await fs.writeFile(indexPath, newMd, 'utf8');
  console.log('updated carousel images in _index.md');
}

run().catch(err => { console.error(err.stack || err.message); process.exit(1); });
