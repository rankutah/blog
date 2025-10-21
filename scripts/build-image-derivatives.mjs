#!/usr/bin/env node
// Pre-generate responsive image derivatives (AVIF/WebP/JPEG) per site and emit a Hugo-readable manifest.

import fs from 'fs/promises';
import path from 'path';
import url from 'url';
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('\n[build-image-derivatives] Missing dependency: sharp');
  console.error('Install dependencies first:');
  console.error('  npm install');
  console.error('\nIf installation fails on macOS, ensure Xcode Command Line Tools are installed:');
  console.error('  xcode-select --install');
  process.exit(1);
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const argMap = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => {
  const [k,v='true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const INPUT_DIRS = args.filter(a => !a.startsWith('--'));

// Generate sufficiently large variants for crisp rendering on HiDPI screens.
// Default max is 3200px; override with --max-width to tune.
const MAX_WIDTH = parseInt(argMap['max-width'] || '3200', 10);
const WIDTHS = (argMap['widths'] || '320,480,640,768,960,1200,1600,2000,2400,3200').split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean);
const AVIF_Q = parseInt(argMap['avif-quality'] || '45', 10);
const WEBP_Q = parseInt(argMap['webp-quality'] || '82', 10);
const JPEG_Q = parseInt(argMap['jpeg-quality'] || '82', 10);
const DRY_RUN = ['true','1','yes'].includes(String(argMap['dry-run'] || 'false'));

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

async function listSitesMediaDirs() {
  const sitesDir = path.resolve(__dirname, '..', 'sites');
  let dirs = [];
  try {
    const entries = await fs.readdir(sitesDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const mediaDir = path.join(sitesDir, e.name, 'media');
      try { const st = await fs.stat(mediaDir); if (st.isDirectory()) dirs.push(mediaDir); } catch {}
    }
  } catch {}
  return dirs;
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
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

async function ensureDir(p) { try { await fs.mkdir(p, { recursive: true }); } catch {} }
async function fileExists(p) { try { await fs.access(p); return true; } catch { return false; } }

function publicPathFromMedia(fileAbs, mediaDirAbs) {
  // Convert absolute file path to public path under /media/... (preserve subfolders)
  const rel = path.relative(mediaDirAbs, fileAbs).split(path.sep).join('/');
  return `/media/${rel}`;
}

function targetRootForSite(siteRoot) {
  // Where to place derivative files for a given site
  return path.join(siteRoot, 'static', 'media-deriv');
}

function targetUrlFor(fileAbs, mediaDirAbs, siteRoot, baseNoExt, width, extOut) {
  const rel = path.relative(mediaDirAbs, path.dirname(fileAbs)).split(path.sep).join('/');
  const fileName = `${path.basename(baseNoExt)}__w${width}.${extOut}`;
  const url = `/media-deriv/${rel ? rel + '/' : ''}${fileName}`;
  const outDir = path.join(targetRootForSite(siteRoot), rel);
  const outPath = path.join(outDir, fileName);
  return { url, outDir, outPath };
}

async function buildPlaceholder(fileAbs) {
  try {
    const buf = await sharp(fileAbs).rotate().resize({ width: 32, withoutEnlargement: true }).jpeg({ quality: 40 }).toBuffer();
    const b64 = buf.toString('base64');
    return `data:image/jpeg;base64,${b64}`;
  } catch { return ''; }
}

async function processOneImage(fileAbs, mediaDirAbs) {
  const siteRoot = path.dirname(mediaDirAbs); // .../sites/<site>
  const ext = path.extname(fileAbs).toLowerCase();
  if (!IMG_EXT.has(ext)) return null;

  // Prefer the best source file: if both .jpg and .avif exist, use the highest resolution one (we'll pick JPG/PNG/WebP as source)
  // Find base without extension
  const dir = path.dirname(fileAbs);
  const nameBase = path.basename(fileAbs, ext);
  // Also look for higher-resolution originals in media/_originals
  const originalsDir = path.join(dir, '_originals');
  const prefOrder = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
  const candidates = [];
  // Prefer originals first, then current dir
  for (const e of prefOrder) { candidates.push(path.join(originalsDir, `${nameBase}${e}`)); }
  for (const e of prefOrder) { candidates.push(path.join(dir, `${nameBase}${e}`)); }
  let src = null;
  for (const c of candidates) { if (await fileExists(c)) { src = c; break; } }
  if (!src) src = fileAbs;

  // Read metadata to choose widths
  let meta;
  try { meta = await sharp(src).metadata(); } catch { return null; }
  const srcWidth = Math.min(meta.width || 0, MAX_WIDTH);
  if (!srcWidth || srcWidth < 50) return null;
  let useWidths = Array.from(new Set(WIDTHS.filter(w => w <= srcWidth))).sort((a,b)=>a-b);
  // Always include the native (capped) width to preserve a highest-quality candidate
  if (!useWidths.includes(srcWidth)) useWidths.push(srcWidth);
  useWidths = useWidths.sort((a,b)=>a-b);

  const publicKeyJpg = publicPathFromMedia(path.join(dir, `${nameBase}.jpg`), mediaDirAbs);
  const publicKeyAvif = publicPathFromMedia(path.join(dir, `${nameBase}.avif`), mediaDirAbs);
  const manifestEntries = new Map(); // key -> entry

  // Common metadata
  const placeholder = await buildPlaceholder(src);
  const baseNoExt = path.join(dir, nameBase);
  const aspect = (meta.width && meta.height) ? (meta.width / meta.height) : null;
  const common = {
    width: meta.width || null,
    height: meta.height || null,
    aspect: aspect || null,
    placeholder,
    variants: { avif: [], webp: [], jpeg: [] }
  };

  async function ensureOutput(width, fmt) {
    const { url, outDir, outPath } = targetUrlFor(fileAbs, mediaDirAbs, siteRoot, baseNoExt, width, fmt);
    await ensureDir(outDir);
    if (!(await fileExists(outPath))) {
      if (!DRY_RUN) {
        const pipe = sharp(src).rotate().resize({ width, withoutEnlargement: true });
        if (fmt === 'avif') await pipe.avif({ quality: AVIF_Q, effort: 4 }).toFile(outPath);
        else if (fmt === 'webp') await pipe.webp({ quality: WEBP_Q }).toFile(outPath);
        else if (fmt === 'jpg' || fmt === 'jpeg') await pipe.jpeg({ quality: JPEG_Q, mozjpeg: true, progressive: true }).toFile(outPath);
      }
      console.log(`+ ${fmt.toUpperCase()} ${url}`);
    }
    return { w: width, url };
  }

  // Generate all variants
  for (const w of useWidths) {
    common.variants.avif.push(await ensureOutput(w, 'avif'));
    common.variants.webp.push(await ensureOutput(w, 'webp'));
    common.variants.jpeg.push(await ensureOutput(w, 'jpg'));
  }

  // Assign to both keys so either .jpg or .avif lookups resolve
  manifestEntries.set(publicKeyJpg, common);
  manifestEntries.set(publicKeyAvif, common);

  return manifestEntries;
}

async function writeManifest(siteRoot, entries) {
  const dataDir = path.join(siteRoot, 'data');
  const outPath = path.join(dataDir, 'images.manifest.json');
  const obj = Object.fromEntries(entries);
  await ensureDir(dataDir);
  await fs.writeFile(outPath, JSON.stringify(obj, null, 2), 'utf8');
  console.log(`✔ Wrote manifest: ${path.relative(process.cwd(), outPath)} (${Object.keys(obj).length} keys)`);
}

async function main() {
  const mediaDirs = INPUT_DIRS.length ? INPUT_DIRS.map(p => path.resolve(p)) : await listSitesMediaDirs();
  if (!mediaDirs.length) {
    console.error('No media directories found.');
    process.exit(1);
  }
  for (const mediaDirAbs of mediaDirs) {
    let st; try { st = await fs.stat(mediaDirAbs); } catch {};
    if (!st || !st.isDirectory()) { console.warn(`Skip (not a directory): ${mediaDirAbs}`); continue; }
    console.log(`Scanning ${mediaDirAbs} …`);

    const siteRoot = path.dirname(mediaDirAbs);
    const manifest = new Map();

    for await (const fileAbs of walk(mediaDirAbs)) {
      const ext = path.extname(fileAbs).toLowerCase();
      if (!IMG_EXT.has(ext)) continue;
      if (fileAbs.includes(`${path.sep}_originals${path.sep}`)) continue;
      try {
        const entries = await processOneImage(fileAbs, mediaDirAbs);
        if (!entries) continue;
        for (const [k, v] of entries.entries()) {
          manifest.set(k, v);
        }
      } catch (e) {
        console.warn(`! Failed: ${fileAbs} -> ${e.message}`);
      }
    }

    await writeManifest(siteRoot, manifest);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
