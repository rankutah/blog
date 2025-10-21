#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import fetch from 'node-fetch';

const siteRoot = path.resolve('sites/blue-ridge-abbey');
const roomsPath = path.join(siteRoot, 'content', 'rooms.md');
const mediaDir = path.join(siteRoot, 'media', 'rooms');

function isHttp(u){ return /^https?:\/\//i.test(u); }
function sanitizeName(urlStr){
  try {
    const u = new URL(urlStr);
    const base = path.basename(u.pathname);
    if (base) return base;
  } catch {}
  return `img-${Date.now()}.jpg`;
}
async function download(url, outFile){
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, buf);
}

function parseCarousels(md){
  // Capture all carousel shortcodes with an images="..." attribute (content up to closing quote)
  const re = /\{\{<\s*carousel\b([^>]*?)images="([^"]*?)"([^>]*)>\}\}/g;
  const matches = [];
  let m;
  while ((m = re.exec(md))){
    matches.push({ index: m.index, full:m[0], pre:m[1], images:m[2], post:m[3] });
  }
  return matches;
}

async function run(){
  let md = await fs.readFile(roomsPath, 'utf8');
  const carousels = parseCarousels(md);
  if (!carousels.length){
    console.error('No carousels with images="..." found in rooms.md');
    process.exit(1);
  }

  const globalUrlToLocal = new Map();
  const updates = [];

  for (const c of carousels){
    const list = c.images.split(',').map(s=>s.trim()).filter(Boolean);
    const localList = [];
    for (const u of list){
      if (!isHttp(u)) { localList.push(u); continue; }
      if (globalUrlToLocal.has(u)) { localList.push(globalUrlToLocal.get(u)); continue; }
      const name = sanitizeName(u);
      const base = path.parse(name).name;
      const ext = path.parse(name).ext || '.jpg';
      let filename = `${base}${ext}`;
      let out = path.join(mediaDir, filename);
      let n = 1;
      // Avoid collisions
      for(;;){
        try { await fs.access(out); filename = `${base}-${n}${ext}`; out = path.join(mediaDir, filename); n++; }
        catch { break; }
      }
      try {
        await download(u, out);
        const publicPath = `/media/rooms/${filename}`;
        globalUrlToLocal.set(u, publicPath);
        localList.push(publicPath);
        console.log('saved', filename);
      } catch (e){
        console.warn('skip', u, e.message);
      }
    }
    if (localList.length){
      const newTag = `{{< carousel${c.pre}images="${localList.join(',')}"${c.post}>}}`;
      updates.push({ from: c.full, to: newTag });
    }
  }

  if (!updates.length){
    console.error('No images downloaded or replaced.');
    process.exit(2);
  }

  let newMd = md;
  for (const u of updates){
    newMd = newMd.replace(u.from, u.to);
  }

  await fs.writeFile(roomsPath, newMd, 'utf8');
  console.log('Updated rooms.md with localized media paths');
}

run().catch(err => { console.error(err.stack || err.message); process.exit(1); });
