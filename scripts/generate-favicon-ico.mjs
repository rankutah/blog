import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

async function pickSource(SITE) {
  const candidates = [
    // Site-specific preferred source
    join('sites', SITE, 'media', 'favicon-source.png'),
    join('sites', SITE, 'media', 'logo.png'),
    join('sites', SITE, 'static', 'favicon-source.png'),
    join('sites', SITE, 'static', 'logo.png'),
    join('assets', 'media', 'favicon-source.png'),
    join('assets', 'media', 'logo.png'),
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
  const src = await pickSource(SITE)
  if (!src) {
    // No suitable source found; skip silently
    return
  }
  const out = join('sites', SITE, 'static', 'favicon.ico')
  try {
    await generateIcoFromSource(src, out)
    console.log(`[favicons] Generated ${out} from ${src}`)
  } catch (err) {
    console.warn(`[favicons] Failed to generate favicon.ico for ${SITE}: ${err?.message || err}`)
  }
}

main()
