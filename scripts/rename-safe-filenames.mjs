#!/usr/bin/env node
/**
 * Rename media files in a site to safe, ASCII-ish, hyphenated names and update references in content.
 * - Targets sites/rank-utah by default
 * - Replaces Unicode whitespace (e.g., NBSP U+00A0, NNBSP U+202F) and other separators with '-'
 * - Keeps extension; collapses duplicate hyphens; trims
 */
import fs from 'fs/promises';
import path from 'path';

const SITE_SLUG = process.argv[2] || 'rank-utah';
const repoRoot = process.cwd();
const siteRoot = path.resolve(repoRoot, 'sites', SITE_SLUG);
const mediaRoot = path.join(siteRoot, 'media');
const contentRoot = path.join(siteRoot, 'content');

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

async function* walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.toLowerCase() === '_originals') continue;
      yield* walk(p);
    } else {
      yield p;
    }
  }
}

function needsSanitize(name) {
  // If it contains non-ASCII, or unicode whitespace beyond regular space, or repeated separators
  return /[\u00A0\u202F\u2000-\u200B\u2028\u2029]/u.test(name) || /[^A-Za-z0-9._\- ]/.test(name);
}

function sanitizeBase(base) {
  let s = base.normalize('NFKC');
  // Convert various unicode whitespace to regular space
  s = s.replace(/[\u00A0\u202F\u2000-\u200B\u2028\u2029]/g, ' ');
  // Replace anything not alnum, dot, underscore, space, hyphen with hyphen
  s = s.replace(/[^A-Za-z0-9._\- ]+/g, '-');
  // Replace spaces and dots in the stem (keep dot only for extension later)
  s = s.replace(/[ ]+/g, '-');
  // Collapse multiple hyphens
  s = s.replace(/-+/g, '-');
  // Trim leading/trailing hyphens/underscores/dots
  s = s.replace(/^[._-]+|[._-]+$/g, '');
  return s;
}

async function renameMediaFiles() {
  const renames = []; // { fromAbs, toAbs, fromPub, toPub }
  const synthetic = []; // additional mapping for .jpg/.jpeg peers based on basename changes
  for await (const p of walk(mediaRoot)) {
    const ext = path.extname(p).toLowerCase();
    if (!IMG_EXT.has(ext)) continue;
    const dir = path.dirname(p);
    const name = path.basename(p);
    if (!needsSanitize(name)) continue;
    const stem = path.basename(p, ext);
    const safe = sanitizeBase(stem) + ext.toLowerCase();
    if (safe === name) continue;
    const toAbs = path.join(dir, safe);
    try {
      await fs.access(toAbs);
      console.warn(`Skip rename (target exists): ${name} -> ${safe}`);
      continue;
    } catch {}
    await fs.rename(p, toAbs);
    const fromRel = path.relative(mediaRoot, p).split(path.sep).join('/');
    const toRel = path.relative(mediaRoot, toAbs).split(path.sep).join('/');
    renames.push({
      fromAbs: p,
      toAbs,
      fromPub: `/media/${fromRel}`,
      toPub: `/media/${toRel}`,
    });
    console.log(`Renamed: ${name} -> ${safe}`);

    // Add synthetic peers for common refs: map old .jpg/.jpeg to new .jpg/.jpeg
    const fromStem = fromRel.replace(/\.[^.]+$/,'');
    const toStem   = toRel.replace(/\.[^.]+$/,'');
    for (const ext of ['.jpg','.jpeg']){
      synthetic.push({ fromPub: `/media/${fromStem}${ext}`, toPub: `/media/${toStem}${ext}` });
    }
  }
  return { renames, synthetic };
}

async function updateContentReferences(renames, synthetic) {
  const mappings = [...renames.map(r=>({fromPub:r.fromPub,toPub:r.toPub})), ...synthetic];
  if (!mappings.length) return 0;
  let filesChanged = 0;
  for await (const p of walk(contentRoot)) {
    if (!p.toLowerCase().endsWith('.md')) continue;
    let text;
    try { text = await fs.readFile(p, 'utf8'); } catch { continue; }
    let updated = text;
    for (const r of mappings) {
      // Replace plain and angle-bracketed variants
      const patterns = [r.fromPub, `<${r.fromPub}>`];
      for (const patt of patterns) {
        updated = updated.split(patt).join(patt.replace(r.fromPub, r.toPub));
      }
    }
    if (updated !== text) {
      await fs.writeFile(p, updated, 'utf8');
      filesChanged++;
      console.log(`Updated references in: ${path.relative(siteRoot, p)}`);
    }
  }
  return filesChanged;
}

async function main() {
  try {
  const { renames, synthetic } = await renameMediaFiles();
  const changed = await updateContentReferences(renames, synthetic);
  console.log(`Done. Renamed ${renames.length} files; updated ${changed} content files.`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
