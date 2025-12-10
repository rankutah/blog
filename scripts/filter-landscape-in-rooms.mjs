#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const roomsPath = path.join(root, 'sites/blue-ridge-abbey/content/rooms.md');
const md = readFileSync(roomsPath, 'utf8');

function getDims(absPath) {
  try {
    const out = execSync(`sips -g pixelWidth -g pixelHeight "${absPath}" 2>/dev/null`).toString();
    const wMatch = out.match(/pixelWidth: (\d+)/);
    const hMatch = out.match(/pixelHeight: (\d+)/);
    if (!wMatch || !hMatch) return null;
    return { w: parseInt(wMatch[1], 10), h: parseInt(hMatch[1], 10) };
  } catch {
    return null;
  }
}

function filterImages(listStr) {
  const rels = listStr.split(',').map(s => s.trim());
  const kept = [];
  const removed = [];
  for (const rel of rels) {
    const relClean = rel.startsWith('/') ? rel.slice(1) : rel;
    const abs = path.join(root, 'sites/blue-ridge-abbey', relClean);
    const dims = getDims(abs);
    if (!dims) {
      // keep if unknown
      kept.push(rel);
      continue;
    }
    if (dims.w > dims.h) {
      removed.push({ rel, dims });
    } else {
      kept.push(rel);
    }
  }
  return { kept, removed };
}

const updated = md.replace(/{{<\s*carousel\s+id="([^"]+)"\s+images="([^"]+)"([^>]*)>}}/g, (m, id, images, rest) => {
  const { kept, removed } = filterImages(images);
  if (removed.length) {
    console.log(`Room ${id}: removing landscape images:`);
    for (const r of removed) {
      console.log(` - ${r.rel} (${r.dims.w}x${r.dims.h})`);
    }
  }
  const newImages = kept.join(',');
  return `{{< carousel id="${id}" images="${newImages}"${rest}>}}`;
});

if (updated !== md) {
  writeFileSync(roomsPath, updated);
  console.log('Updated rooms.md with portrait-only slideshows.');
} else {
  console.log('No changes made.');
}
