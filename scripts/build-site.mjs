#!/usr/bin/env node
// Cross-site build dispatcher: runs optimize, derivatives, then Hugo build for SITE

import { spawn } from 'child_process';

function run(cmd, args, opts={}){
  return new Promise((resolve, reject)=>{
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    p.on('close', code=> code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)));
    p.on('error', reject);
  });
}

async function main(){
  const SITE = process.env.SITE || '';
  if (!SITE) {
    console.error('[build-site] Missing SITE env variable. Example: SITE=blueridgeTech npm run build');
    process.exit(2);
  }
  const mediaDir = `sites/${SITE}/media`;
  const formats = (process.env.FORMATS || '').trim(); // optional override e.g. avif,jpeg

  console.log(`[build-site] Site: ${SITE}`);
  console.log('[build-site] 1/3 optimize originals…');
  await run('node', ['scripts/optimize-images.mjs', '--max-width=2000', '--target-bytes=150000', mediaDir]);

  console.log('[build-site] 2/3 generate derivatives…');
  const derivArgs = ['scripts/build-image-derivatives.mjs'];
  if (formats) derivArgs.push(`--formats=${formats}`);
  derivArgs.push(mediaDir);
  await run('node', derivArgs);

  console.log('[build-site] 3/3 hugo build…');
  const publishDir = (process.env.PUBLISH_DIR || '').trim();
  const hugoArgs = [
    '--source', `./sites/${SITE}`,
    '--config', '\"../../themes/overrides/config.shared.toml,config.toml\"',
    '--gc', '--minify', '--cleanDestinationDir', '--logLevel', 'debug', '--ignoreCache'
  ];
  if (publishDir) { hugoArgs.push('-d', publishDir); }
  await run('hugo', hugoArgs, { shell: true });

  console.log('[build-site] Done');
}

main().catch(e=>{ console.error(e?.stack||e?.message||String(e)); process.exit(1); });
