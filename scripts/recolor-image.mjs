#!/usr/bin/env node
// Recolor background of a simple logo (white foreground on solid colored circle) to a new hex color.
// Preserves original alpha (circle crop) and re-composites the white foreground on top.
// Usage:
//   node scripts/recolor-image.mjs --in sites/blue-ridge-abbey/media/logo.png \
//       --out sites/blue-ridge-abbey/media/logo-039966.png --color #039966 [--threshold 225]

import sharp from 'sharp';
import path from 'node:path';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--in') out.in = args[++i];
    else if (a === '--out') out.out = args[++i];
    else if (a === '--color') out.color = args[++i];
    else if (a === '--threshold') out.threshold = Number(args[++i]);
  }
  return out;
}

function hexToRgb(hex) {
  const s = hex.replace('#', '').trim();
  if (!/^([0-9a-fA-F]{6})$/.test(s)) throw new Error(`Invalid hex color: ${hex}`);
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}

async function recolor({ inputPath, outputPath, color, threshold = 225 }) {
  const rgb = hexToRgb(color);
  const base = sharp(inputPath).ensureAlpha();
  const meta = await base.metadata();
  const { width, height } = meta;
  if (!width || !height) throw new Error('Unable to read image dimensions');

  // Extract original alpha (circular crop) to preserve outer transparency
  const alpha = await sharp(inputPath).ensureAlpha().extractChannel('alpha').toBuffer();

  // Build new background with requested color + original alpha
  const bgRGB = await sharp({
    create: { width, height, channels: 3, background: { r: rgb.r, g: rgb.g, b: rgb.b } },
  }).toBuffer();
  const bgWithAlpha = await sharp(bgRGB, { raw: { width, height, channels: 3 } })
    .joinChannel(alpha)
    .png()
    .toBuffer();

  // Build foreground (white lantern) mask: threshold near-white areas only, then clip to original alpha
  const lanternMask = await sharp(inputPath)
    .ensureAlpha()
    .removeAlpha()
    .grayscale()
    .median(1) // slight denoise
    .threshold(threshold)
    .toBuffer();
  // Clip mask to original alpha (dest-in keeps mask only where original alpha is present)
  const clippedMask = await sharp(lanternMask)
    .composite([{ input: alpha, blend: 'dest-in' }])
    .toBuffer();

  // Create white foreground using mask as alpha
  const whiteRGB = await sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  }).toBuffer();
  const whiteWithAlpha = await sharp(whiteRGB, { raw: { width, height, channels: 3 } })
    .joinChannel(clippedMask)
    .png()
    .toBuffer();

  // Composite white foreground over the colored background
  const outBuf = await sharp(bgWithAlpha).composite([{ input: whiteWithAlpha }]).png().toBuffer();
  await sharp(outBuf).png().toFile(outputPath);
}

(async () => {
  try {
    const { in: inPath, out: outPath, color, threshold } = parseArgs();
    if (!inPath || !outPath || !color) {
      console.error('Usage: node scripts/recolor-image.mjs --in <input.png> --out <output.png> --color #RRGGBB [--threshold 225]');
      process.exit(2);
    }
    await recolor({ inputPath: inPath, outputPath: outPath, color, threshold });
    console.log(`Wrote ${outPath}`);
  } catch (err) {
    console.error('recolor failed:', err);
    process.exit(1);
  }
})();
