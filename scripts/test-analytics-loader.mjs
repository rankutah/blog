#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function testFile(filePath){
  const html = await fs.readFile(filePath, 'utf8');
  const vc = new VirtualConsole();
  // silence resource errors (external scripts won't actually download)
  vc.on('error', ()=>{}).on('warn', ()=>{});
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'https://test.local/',
    virtualConsole: vc,
    pretendToBeVisual: true,
  });
  const { window } = dom;

  // Allow initial inline scripts to run
  await sleep(25);

  // Trigger one of the configured load events to fire loader immediately
  try {
    window.document.dispatchEvent(new window.Event('scroll'));
  } catch {}

  // Wait a bit for loader to inject tags and push gtag calls into dataLayer
  await sleep(50);

  // Fallback: also wait for delayMs (~4000ms) in case event hook didn't work
  await sleep(4100);

  // Inspect DOM and runtime state
  const scripts = Array.from(window.document.scripts || []).map(s => s.src || '');
  const gtagScript = scripts.find(src => src.includes('googletagmanager.com/gtag/js')) || '';

  const cfgEl = window.document.getElementById('cp-analytics-config');
  let cfg = {};
  try { cfg = cfgEl ? JSON.parse(cfgEl.textContent || '{}') : {}; } catch {}
  const gaId = (cfg.gaId || '').trim();

  const dataLayer = window.dataLayer || [];
  const hasConfigCall = Array.from(dataLayer).some(entry => {
    try { return entry && entry[0] === 'config' && String(entry[1]) === gaId; } catch { return false; }
  });

  return {
    file: filePath,
    gaId,
    gtagScriptPresent: Boolean(gtagScript),
    gtagScriptURL: gtagScript,
    dataLayerLength: dataLayer.length,
    hasConfigCall,
  };
}

async function main(){
  const targets = process.argv.slice(2);
  if (!targets.length){
    console.error('Usage: node scripts/test-analytics-loader.mjs <html-file> [...]');
    process.exit(2);
  }
  const results = [];
  for (const t of targets){
    const abs = path.resolve(t);
    try {
      const r = await testFile(abs);
      results.push(r);
    } catch (e){
      results.push({ file: abs, error: String(e && e.stack || e) });
    }
  }
  const summary = results.map(r => ({
    file: r.file,
    gaId: r.gaId,
    gtagScriptPresent: r.gtagScriptPresent,
    hasConfigCall: r.hasConfigCall,
  }));
  console.log(JSON.stringify({ results, summary }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
