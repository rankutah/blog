#!/usr/bin/env node
import { spawnSync, spawn } from 'node:child_process';
import { argv, env } from 'node:process';

function parseArgs(args) {
  const out = {};
  for (const a of args) {
    if (!a.startsWith('--')) continue;
    const [k, v] = a.replace(/^--/, '').split('=');
    out[k] = v === undefined ? true : v;
  }
  return out;
}

function hasRenderToDisk() {
  try {
    const res = spawnSync('hugo', ['server', '--help'], { encoding: 'utf8' });
    const text = `${res.stdout || ''}\n${res.stderr || ''}`;
    return /--renderToDisk/.test(text);
  } catch (e) {
    return false;
  }
}

function run() {
  const args = parseArgs(argv.slice(2));
  const site = args.site || env.SITE || '';
  const source = args.source || '';
  const cfg = args.config || '';
  const dryRun = !!args['dry-run'];

  if (!source || !cfg) {
    console.error('run-hugo-server: missing required --source and --config');
    process.exit(2);
  }

  const supportsRender = hasRenderToDisk();

  const cmd = 'hugo';
  const hugoArgs = [
    'server',
    '--disableFastRender',
    '--source', source,
    '--config', cfg,
    '--gc',
    '--minify',
    '--cleanDestinationDir',
    '--forceSyncStatic',
    '--logLevel', 'debug',
    '--ignoreCache',
  ];

  if (supportsRender) {
    hugoArgs.splice(1, 0, '--renderToDisk');
  }

  const finalEnv = { ...env, HUGO_ENV: 'production' };
  if (site) finalEnv.SITE = site;

  if (dryRun) {
    console.log(`[dry-run] ${cmd} ${hugoArgs.map(x => (x.includes(' ') ? '"' + x + '"' : x)).join(' ')}`);
    console.log(`[dry-run] HUGO_ENV=${finalEnv.HUGO_ENV}${site ? ` SITE=${site}` : ''}`);
    console.log(`[dry-run] renderToDisk supported: ${supportsRender}`);
    process.exit(0);
  }

  if (!supportsRender) {
    console.warn('run-hugo-server: --renderToDisk not supported by your Hugo. Falling back to in-memory server.');
  }

  const child = spawn(cmd, hugoArgs, {
    stdio: 'inherit',
    env: finalEnv,
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

run();
