#!/usr/bin/env node
/* Permanent image optimizer: resizes large images, creates AVIF copies, and replaces originals with optimized versions. */

import fs from 'fs/promises';
import path from 'path';
import url from 'url';
let sharp;
try {
  // Dynamic import so we can show a helpful message if it's missing
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('\n[optimize-images] Missing dependency: sharp');
  console.error('Install dependencies first:');
  console.error('  npm install');
  console.error('\nIf installation fails on macOS, ensure Xcode Command Line Tools are installed:');
  console.error('  xcode-select --install');
  console.error('\nThen retry your command (e.g., npm run rank-utah).');
  process.exit(1);
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const argMap = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => {
  const [k,v='true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));

const MAX_WIDTH = parseInt(argMap['max-width'] || '2000', 10);
const TARGET_BYTES = parseInt(argMap['target-bytes'] || '150000', 10);
const AVIF_QUALITY = parseInt(argMap['avif-quality'] || '45', 10);
const JPEG_QUALITY_START = parseInt(argMap['jpeg-quality'] || '82', 10);
const DELETE_ORIGINALS = argMap['delete-originals'] === 'true' || argMap['delete-originals'] === '1';
const DRY_RUN = argMap['dry-run'] === 'true' || argMap['dry-run'] === '1';
const REWRITE_REFS = (argMap['rewrite-refs'] || 'false') === 'true';
const REWRITE_CONFIG = (argMap['rewrite-config'] || 'false') === 'true';
const INGEST_CONTENT_IMAGES = (argMap['ingest-content-images'] || 'true') === 'true';

const INPUT_DIRS = args.filter(a => !a.startsWith('--'));

const DEFAULT_MEDIA_DIRS = async () => {
  const sitesDir = path.resolve(__dirname, '..', 'sites');
  try {
    const sites = await fs.readdir(sitesDir, { withFileTypes: true });
    const mediaDirs = [];
    for (const entry of sites) {
      if (entry.isDirectory()) {
        const m = path.join(sitesDir, entry.name, 'media');
        try { await fs.access(m); mediaDirs.push(m); } catch {}
      }
    }
    return mediaDirs;
  } catch {
    return [];
  }
};

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const GEN_AVIF_FOR = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.bmp', '.tiff', '.tif']);

async function ensureDir(p) { try { await fs.mkdir(p, { recursive: true }); } catch {} }

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.toLowerCase() === '_originals') continue;
      await walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

async function fileExists(p) { try { await fs.access(p); return true; } catch { return false; } }

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function rewriteReferencesInSite(siteRoot, rewriteList) {
  if (!REWRITE_REFS || !rewriteList.size) return;
  const candidates = [];
  async function maybePush(dir) {
    try { const st = await fs.stat(dir); if (st.isDirectory()) candidates.push(dir); } catch {}
  }
  await maybePush(path.join(siteRoot, 'content'));
  await maybePush(path.join(siteRoot, 'posts'));
  // Walk candidate dirs and update text-based files
  async function walkFiles(dir, out = []) {
    let ents = [];
    try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of ents) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'media' || e.name === '_originals' || e.name === 'public' || e.name === 'resources' || e.name === 'static') continue;
        await walkFiles(p, out);
      } else {
        const ext = path.extname(p).toLowerCase();
        // We'll process .md and .html/.htm always; .toml/.yaml/.yml/.json only if REWRITE_CONFIG is true
        if (ext === '.md' || ext === '.html' || ext === '.htm' || (REWRITE_CONFIG && (ext === '.toml' || ext === '.yaml' || ext === '.yml' || ext === '.json'))) out.push(p);
      }
    }
    return out;
  }

  const files = [];
  for (const d of candidates) {
    const f = await walkFiles(d);
    files.push(...f);
  }

  // Build regexes upfront for performance
  const rules = Array.from(rewriteList).map(({ nameExt, base }) => {
    const escaped = escapeRegex(nameExt);
    // Match /media/name.ext, ../media/name.ext, ../../media/name.ext, or media/name.ext
    const re = new RegExp(`((?:\\.\\./)*|/)?media/${escaped}`, 'gi');
    const replacement = `$1media/${base}.avif`;
    return { re, replacement };
  });

  for (const f of files) {
    let txt = '';
    try { txt = await fs.readFile(f, 'utf8'); } catch { continue; }

    const ext = path.extname(f).toLowerCase();
    let changed = false;
    let newTxt = txt;

    if (ext === '.md') {
      // Protect front matter (YAML '---' or TOML '+++') at the top of the file
      let bodyStart = 0;
      if (txt.startsWith('---')) {
        const end = txt.indexOf('\n---', 3);
        if (end !== -1) bodyStart = end + 4; // include closing marker and newline
      } else if (txt.startsWith('+++')) {
        const end = txt.indexOf('\n+++', 3);
        if (end !== -1) bodyStart = end + 4;
      }
      if (bodyStart > 0) {
        const head = txt.slice(0, bodyStart);
        const body = txt.slice(bodyStart);
        let newBody = body;
        for (const { re, replacement } of rules) {
          const before = newBody;
          newBody = newBody.replace(re, replacement);
          if (newBody !== before) changed = true;
        }
        newTxt = head + newBody;
      } else {
        for (const { re, replacement } of rules) {
          const before = newTxt;
          newTxt = newTxt.replace(re, replacement);
          if (newTxt !== before) changed = true;
        }
      }
    } else {
      for (const { re, replacement } of rules) {
        const before = newTxt;
        newTxt = newTxt.replace(re, replacement);
        if (newTxt !== before) changed = true;
      }
    }

    if (changed) {
      if (!DRY_RUN) await fs.writeFile(f, newTxt, 'utf8');
      console.log(`✎ Updated refs in ${path.relative(process.cwd(), f)}`);
    }
  }
}

async function ingestContentImages(siteRoot, mediaDir) {
  if (!INGEST_CONTENT_IMAGES) return;
  const contentDir = path.join(siteRoot, 'content');
  let mdFiles = [];
  let imageFiles = [];

  async function walk(dir) {
    let ents = [];
    try { ents = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'media' || e.name === '_originals' || e.name === 'public' || e.name === 'resources' || e.name === 'static') continue;
        await walk(p);
      } else {
        const ext = path.extname(p).toLowerCase();
        if (ext === '.md' || ext === '.html' || ext === '.htm') mdFiles.push(p);
        if (IMG_EXT.has(ext) || GEN_AVIF_FOR.has(ext)) imageFiles.push(p);
      }
    }
  }
  await walk(contentDir);

  // Helper: unique filename in mediaDir
  async function uniqueTarget(name) {
    const base = path.basename(name, path.extname(name));
    const ext = path.extname(name);
    let candidate = path.join(mediaDir, `${base}${ext}`);
    let i = 1;
    while (await fileExists(candidate)) {
      candidate = path.join(mediaDir, `${base}-${i}${ext}`);
      i++;
      if (i > 999) throw new Error('too many name collisions');
    }
    return candidate;
  }

  // Build map dirPath -> list of md/html files for local rewrites
  const dirToDocs = new Map();
  for (const f of mdFiles) {
    const d = path.dirname(f);
    if (!dirToDocs.has(d)) dirToDocs.set(d, []);
    dirToDocs.get(d).push(f);
  }

  // Move images and update references within same directory docs
  for (const img of imageFiles) {
    // Skip if already under mediaDir
    if (img.includes(`${path.sep}media${path.sep}`)) continue;
    const dir = path.dirname(img);
    const name = path.basename(img);
    await ensureDir(mediaDir);
    let target = await uniqueTarget(name);
    if (!DRY_RUN) {
      try {
        await fs.rename(img, target);
      } catch (e) {
        // If cross-device rename fails, fall back to copy+unlink
        try {
          await fs.copyFile(img, target);
          await fs.unlink(img);
        } catch {}
      }
    }
    const newPublicPath = `/media/${path.basename(target)}`;

    // Update local docs in same directory
    const docs = dirToDocs.get(dir) || [];
    const escaped = escapeRegex(name);
    const mdLinkRe = new RegExp(`(\]\()(?:\./)?${escaped}(\))`, 'g');
    const htmlSrcReDq = new RegExp(`(src=")(?:\./)?${escaped}(\")`, 'g');
    const htmlSrcReSq = new RegExp(`(src=\')(?:\./)?${escaped}(\')`, 'g');
    for (const doc of docs) {
      let txt = '';
      try { txt = await fs.readFile(doc, 'utf8'); } catch { continue; }
      const ext = path.extname(doc).toLowerCase();
      let bodyStart = 0;
      if (ext === '.md') {
        if (txt.startsWith('---')) { const end = txt.indexOf('\n---', 3); if (end !== -1) bodyStart = end + 4; }
        else if (txt.startsWith('+++')) { const end = txt.indexOf('\n+++', 3); if (end !== -1) bodyStart = end + 4; }
      }
      const head = txt.slice(0, bodyStart);
      const body = txt.slice(bodyStart);
      const replaced = body
        .replace(mdLinkRe, `$1${newPublicPath}$2`)
        .replace(htmlSrcReDq, `$1${newPublicPath}$2`)
        .replace(htmlSrcReSq, `$1${newPublicPath}$2`);
      if (replaced !== body) {
        const newTxt = head + replaced;
        if (!DRY_RUN) await fs.writeFile(doc, newTxt, 'utf8');
        console.log(`↪ Moved ${path.relative(process.cwd(), img)} → ${path.relative(process.cwd(), target)} and updated refs in ${path.relative(process.cwd(), doc)}`);
      }
    }
  }
}

async function optimizeOne(file) {
  const ext = path.extname(file).toLowerCase();
  const dir = path.dirname(file);
  const base = path.basename(file, path.extname(file));
  const originalsDir = path.join(dir, '_originals');

  // Skip already processed if an original exists
  const originalPath = path.join(originalsDir, path.basename(file));
  if (await fileExists(originalPath)) return { skipped: 'already-processed' };

  // Skip non-images
  const isProcessable = IMG_EXT.has(ext) || GEN_AVIF_FOR.has(ext);
  if (!isProcessable) return { skipped: 'unsupported-ext' };

  // Always try to generate AVIF sibling if not present
  const avifOut = path.join(dir, `${base}.avif`);

  // Replacement path (same extension as original) only for core formats
  const replaceExt = IMG_EXT.has(ext);
  const replaceTmp = path.join(dir, `.${base}.tmp${ext}`);

  // Read from current file (before we move it), process through sharp
  const input = sharp(file, { failOn: 'none' }).rotate();

  // Discover metadata (alpha/transparency)
  let meta;
  try { meta = await input.metadata(); } catch (e) { return { skipped: 'metadata-failed' }; }

  // Build a base pipeline with resize (no enlargement)
  function basePipe() {
    return sharp(file).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  // 1) Write AVIF if missing
  if (!(await fileExists(avifOut))) {
    if (!DRY_RUN) {
      try {
        await basePipe().avif({ quality: AVIF_QUALITY, effort: 4 }).toFile(avifOut);
        // Touch mtime based on source
        const st = await fs.stat(file); await fs.utimes(avifOut, st.atime, st.mtime);
      } catch (e) {
        // AVIF could fail on some inputs; ignore
      }
    }
    console.log(`+ AVIF  ${path.relative(process.cwd(), avifOut)}`);
  }

  // 2) Replacement (same extension) for JPEG/PNG/WEBP only
  if (replaceExt) {
    // Write optimized to tmp using roughly target size for JPEG
    if (!DRY_RUN) {
      await ensureDir(originalsDir);
    }

    if (ext === '.jpg' || ext === '.jpeg') {
      let q = JPEG_QUALITY_START;
      let wrote = false;
      while (q >= 30 && !wrote) {
        try {
          await basePipe().jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:2:0', progressive: true }).toFile(replaceTmp);
          const { size } = await fs.stat(replaceTmp);
          if (size <= TARGET_BYTES || q <= 30) {
            wrote = true;
          } else {
            await fs.unlink(replaceTmp);
            q -= 8;
          }
        } catch (e) {
          try { await fs.unlink(replaceTmp); } catch {}
          break;
        }
      }
    } else if (ext === '.png') {
      try {
        await basePipe().png({ compressionLevel: 9, palette: !!meta.palette }).toFile(replaceTmp);
      } catch (e) {}
    } else if (ext === '.webp') {
      try {
        await basePipe().webp({ quality: 82 }).toFile(replaceTmp);
      } catch (e) {}
    }

    if (!DRY_RUN && await fileExists(replaceTmp)) {
      // Move original to _originals or delete
      if (DELETE_ORIGINALS) {
        try { await fs.unlink(file); } catch {}
      } else {
        try { await fs.rename(file, originalPath); } catch {}
      }
      await fs.rename(replaceTmp, file);
      console.log(`✔ Replaced ${path.relative(process.cwd(), file)}  (orig → ${DELETE_ORIGINALS ? 'deleted' : '_originals/'})`);
    } else if (await fileExists(replaceTmp)) {
      await fs.unlink(replaceTmp);
    }
  }

  return { ok: true };
}

async function main() {
  const inputs = INPUT_DIRS.length ? INPUT_DIRS : await DEFAULT_MEDIA_DIRS();
  if (!inputs.length) {
    console.error('No media directories found. Pass directories or ensure sites/*/media exists.');
    process.exit(1);
  }

  for (const dir of inputs) {
    const abs = path.resolve(dir);
    try {
      const stat = await fs.stat(abs);
      if (!stat.isDirectory()) { console.warn(`Skip (not directory): ${abs}`); continue; }
    } catch { console.warn(`Skip (missing): ${abs}`); continue; }

  console.log(`Scanning ${abs} …`);
  const siteRoot = path.dirname(abs); // .../sites/<site>
  // First, ingest any images that were dropped next to Markdown files
  await ingestContentImages(siteRoot, abs);
    const files = await walk(abs);
    let count = 0;
    const rewriteList = new Set(); // entries: { nameExt, base }
    for (const f of files) {
      const lower = f.toLowerCase();
      if (lower.includes('/_originals/')) continue;
      const ext = path.extname(lower);
      if (!IMG_EXT.has(ext) && !GEN_AVIF_FOR.has(ext)) continue;
      try {
        await optimizeOne(f);
        count++;
        // If AVIF exists, plan a ref rewrite for this filename within the same site
        const base = path.basename(f, path.extname(f));
        const avifPath = path.join(path.dirname(f), `${base}.avif`);
        if (await fileExists(avifPath)) {
          const nameExt = path.basename(f).toLowerCase();
          rewriteList.add({ nameExt, base });
        }
      } catch (e) {
        console.warn(`! Failed ${f}: ${e.message}`);
      }
    }
    console.log(`Done ${abs} (${count} files checked).`);

    // After finishing a site's media directory, rewrite references within that site.
    if (REWRITE_REFS && rewriteList.size) {
      const siteRoot = path.dirname(abs); // .../sites/<site>
      await rewriteReferencesInSite(siteRoot, rewriteList);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
