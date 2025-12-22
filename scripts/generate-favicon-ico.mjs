import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

function isIcoFile(filePath) {
  try {
    const header = readFileSync(filePath)
    return header.length >= 4 && header[0] === 0x00 && header[1] === 0x00 && header[2] === 0x01 && header[3] === 0x00
  } catch {
    return false
  }
}

function pickExistingFaviconSource(dirPath) {
  // If the user provides a favicon in any common format, use it as the source.
  // Order matters: prefer exact favicon.ico first, then other favicon.*
  const candidates = [
    join(dirPath, 'favicon.ico'),
    join(dirPath, 'favicon.png'),
    join(dirPath, 'favicon.jpg'),
    join(dirPath, 'favicon.jpeg'),
    join(dirPath, 'favicon.svg'),
    join(dirPath, 'favicon.webp'),
    join(dirPath, 'favicon.avif'),
    join(dirPath, 'favicon'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }

  // Generic: if there is any file literally named favicon.<anything>, use it.
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })
    const match = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .find((name) => /^favicon\./i.test(name))
    if (match) return join(dirPath, match)
  } catch {}

  return null
}

async function pickSource(SITE) {
  const candidates = [
    // Site-specific preferred source
    join('sites', SITE, 'media', 'favicon-source.png'),
    join('sites', SITE, 'media', 'favicon-source.jpg'),
    join('sites', SITE, 'media', 'favicon-source.jpeg'),
    join('sites', SITE, 'media', 'logo.png'),
    join('sites', SITE, 'media', 'logo.jpg'),
    join('sites', SITE, 'media', 'logo.jpeg'),
    join('sites', SITE, 'static', 'favicon-source.png'),
    join('sites', SITE, 'static', 'favicon-source.jpg'),
    join('sites', SITE, 'static', 'favicon-source.jpeg'),
    join('sites', SITE, 'static', 'logo.png'),
    join('sites', SITE, 'static', 'logo.jpg'),
    join('sites', SITE, 'static', 'logo.jpeg'),
    join('assets', 'media', 'favicon-source.png'),
    join('assets', 'media', 'favicon-source.jpg'),
    join('assets', 'media', 'favicon-source.jpeg'),
    join('assets', 'media', 'logo.png'),
    join('assets', 'media', 'logo.jpg'),
    join('assets', 'media', 'logo.jpeg'),
    // SVGs (will be rasterized)
    join('sites', SITE, 'media', 'logo.svg'),
    join('sites', SITE, 'static', 'logo.svg'),
    join('assets', 'media', 'logo.svg'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

async function generateIcoFromSource(srcPath, outPath) {
  // Generate resized PNG buffers: 16, 32, 48
  const sizes = [16, 32, 48]
  const pngBuffers = []
  for (const s of sizes) {
    const buf = await sharp(srcPath)
      .resize(s, s, { fit: 'cover' })
      .png()
      .toBuffer()
    pngBuffers.push(buf)
  }
  const icoBuffer = await pngToIco(pngBuffers)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, icoBuffer)
}

async function main() {
  const SITE = process.env.SITE
  if (!SITE) {
    console.error('SITE env var is required, e.g. SITE=rank-utah')
    process.exit(1)
  }

  const out = join('sites', SITE, 'static', 'favicon.ico')
  const staticDir = join('sites', SITE, 'static')
  const mediaDir = join('sites', SITE, 'media')
  const force = process.env.FORCE_FAVICON_ICO === '1' || process.env.FORCE_FAVICON_ICO === 'true'

  const staticFavicon = pickExistingFaviconSource(staticDir)
  const mediaFavicon = pickExistingFaviconSource(mediaDir)

  // 1) If a user provided *any* favicon in static/ (favicon.ico, favicon.png, favicon.svg, etc.):
  //    - Prefer it over logo-based generation.
  //    - If favicon.ico exists and is valid: keep it (unless FORCE).
  //    - If favicon.ico exists but isn't actually an ICO (e.g. renamed jpg): convert in-place.
  //    - If favicon.* exists but not favicon.ico: convert into static/favicon.ico.
  if (staticFavicon && !force) {
    if (staticFavicon === out) {
      if (isIcoFile(out)) return
      try {
        await generateIcoFromSource(out, out)
        console.log(`[favicons] Fixed invalid ${out}`)
      } catch (err) {
        console.warn(`[favicons] Failed to fix invalid ${out}: ${err?.message || err}`)
      }
      return
    }
    try {
      await generateIcoFromSource(staticFavicon, out)
      console.log(`[favicons] Generated ${out} from ${staticFavicon}`)
    } catch (err) {
      console.warn(`[favicons] Failed to generate ${out} from ${staticFavicon}: ${err?.message || err}`)
    }
    return
  }

  // 2) If a user provided any favicon in media/, use it to produce static/favicon.ico (only when static/favicon.ico isn't a valid user-provided ico).
  if (mediaFavicon && (!existsSync(out) || force)) {
    try {
      if (mediaFavicon.toLowerCase().endsWith('.ico') && isIcoFile(mediaFavicon)) {
        mkdirSync(dirname(out), { recursive: true })
        copyFileSync(mediaFavicon, out)
        console.log(`[favicons] Copied ${mediaFavicon} -> ${out}`)
      } else {
        await generateIcoFromSource(mediaFavicon, out)
        console.log(`[favicons] Generated ${out} from ${mediaFavicon}`)
      }
    } catch (err) {
      console.warn(`[favicons] Failed to use ${mediaFavicon}: ${err?.message || err}`)
    }
    return
  }

  // 3) Otherwise: pick a source (logo / favicon-source) and generate (may overwrite only if FORCE, or if out doesn't exist).
  const src = await pickSource(SITE)
  if (!src) {
    // No suitable source found; skip silently
    return
  }
  if (existsSync(out) && !force) {
    // Respect user-provided favicon.ico
    return
  }
  try {
    await generateIcoFromSource(src, out)
    console.log(`[favicons] Generated ${out} from ${src}`)
  } catch (err) {
    console.warn(`[favicons] Failed to generate favicon.ico for ${SITE}: ${err?.message || err}`)
  }
}

main()
