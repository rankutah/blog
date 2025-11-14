#!/usr/bin/env node
/*
Check if a site's responsive derivatives are present in git.
Usage: node scripts/has-derivatives.mjs <siteName>

Returns 0 if sites/<site>/static/media-deriv exists and contains at least one file.
Returns 1 otherwise.
*/
import fs from 'node:fs';
import path from 'node:path';

const site = process.argv[2];
if (!site) {
  console.error('[has-derivatives] Usage: node scripts/has-derivatives.mjs <siteName>');
  process.exit(1);
}
const dir = path.resolve(process.cwd(), 'sites', site, 'static', 'media-deriv');
try {
  const st = fs.statSync(dir);
  if (!st.isDirectory()) throw new Error('not dir');
  const files = fs.readdirSync(dir);
  if (files && files.length > 0) {
    console.log(`[has-derivatives] Found ${files.length} files in ${dir}.`);
    process.exit(0);
  }
} catch {}
console.log(`[has-derivatives] Missing or empty: ${dir}`);
process.exit(1);
