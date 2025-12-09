#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Simple ANSI color helpers
const color = {
  yellow: (s)=> `\x1b[33m${s}\x1b[0m`,
  red: (s)=> `\x1b[31m${s}\x1b[0m`,
  green: (s)=> `\x1b[32m${s}\x1b[0m`,
  dim: (s)=> `\x1b[2m${s}\x1b[0m`,
};

const SITE = process.env.SITE || process.argv.find(a=>a.startsWith('--site='))?.split('=')[1] || '';
// Autofix is OFF by default; we only report issues.
const AUTOFIX = false;

if (!SITE) {
  console.error('[seo-lint] Usage: node scripts/seo-lint.mjs --site=<site> [--autofix=1]');
  process.exit(2);
}

const root = process.cwd();
const contentDir = path.join(root, 'sites', SITE, 'content');
const IGNORE_FILES = new Set(['footer.md']);
const IGNORE_INTERNAL_LINKS = new Set(['blog.md', 'privacy.md', 'terms.md']);
const IGNORE_ORPHAN_CHECK = new Set(['index.md', '_index.md', 'footer.md', 'thank-you.md', 'search.md', 'privacy.md', 'terms.md']);

function* walk(dir){
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes:true }) : [];
  for (const e of entries){
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && p.endsWith('.md')) yield p;
  }
}

function parseFrontMatter(text){
  // Support YAML front matter fenced by --- ... ---
  if (text.startsWith('---')){
    const end = text.indexOf('\n---', 3);
    if (end > 0){
      const fm = text.slice(3, end).trim();
      const body = text.slice(end + 4);
      const obj = {};
      fm.split(/\r?\n/).forEach(line=>{
        const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (m){
          let v = m[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
          obj[m[1]] = v;
        }
      });
      return { fm:obj, fmRaw:fm, body, fenced:true };
    }
  }
  // Minimal YAML-like header without fences (rare): scan first 20 lines
  const lines = text.split(/\r?\n/);
  const fmObj = {};
  let consumed = 0;
  for (let i=0; i<Math.min(lines.length, 20); i++){
    const line = lines[i];
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) break;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    fmObj[m[1]] = v;
    consumed = i+1;
  }
  if (consumed > 0){
    const body = lines.slice(consumed).join('\n');
    return { fm: fmObj, fmRaw: null, body, fenced:false };
  }
  return { fm:{}, fmRaw:null, body:text, fenced:false };
}

function createDescriptionFromBody(body){
  // Remove code blocks and inline code
  let text = body
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' '); // inline code
  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Strip Hugo shortcodes
  text = text.replace(/\{\{<[^>]+>\}\}/g, ' ')
             .replace(/\{\{[^}]+\}\}/g, ' ');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // Allow only alphanumerics and common punctuation
  const sanitized = text.replace(/[^A-Za-z0-9 .,;:!?"'()\-]/g, ' ').replace(/\s+/g,' ').trim();
  const plain = sanitized;
  if (!plain) return '';
  const max = 155;
  return plain.length > max ? plain.slice(0, max-1).trim() + '…' : plain;
}

function extractHeadings(body){
  const lines = body.split(/\r?\n/);
  const h1 = [];
  const h2h3 = [];
  lines.forEach((l, i)=>{
    const m = l.match(/^(#{1,3})\s+(.*)$/);
    if (m){
      const level = m[1].length;
      const text = m[2].trim();
      if (level === 1) h1.push({ line:i+1, text });
      else h2h3.push({ level, line:i+1, text });
    }
  });
  return { h1, h2h3 };
}

function extractOutboundLinks(body){
  const links = [];
  const md = body.match(/\[[^\]]+\]\(([^)]+)\)/g) || [];
  md.forEach(tok=>{
    const m = tok.match(/\(([^)]+)\)/);
    if (m) links.push(m[1]);
  });
  const html = body.match(/<a\s+[^>]*href="([^"]+)"[^>]*>/gi) || [];
  html.forEach(tok=>{
    const m = tok.match(/href="([^"]+)"/i);
    if (m) links.push(m[1]);
  });
  // Hugo shortcode buttons: {{< button url="/path" ... >}}
  const scButtons = body.match(/\{\{<\s*button[^>]*>\}\}/gi) || [];
  scButtons.forEach(tok=>{
    const m = tok.match(/url\s*=\s*"([^"]+)"/i);
    if (m) links.push(m[1]);
  });
  // Hugo shortcode links: {{< link url="/path" ... >}} (if present)
  const scLinks = body.match(/\{\{<\s*link[^>]*>\}\}/gi) || [];
  scLinks.forEach(tok=>{
    const m = tok.match(/url\s*=\s*"([^"]+)"/i);
    if (m) links.push(m[1]);
  });
  return links;
}

function extractImages(body){
  const mdImgs = [];
  const htmlImgs = [];
  const mdPattern = /!\[(.*?)\]\(([^)]+)\)/g;
  let m;
  while ((m = mdPattern.exec(body))){
    mdImgs.push({ alt: m[1]||'', src: m[2]||'', index: m.index, length: m[0].length });
  }
  const htmlPattern = /<img\s+[^>]*>/gi;
  let h;
  while ((h = htmlPattern.exec(body))){
    const tag = h[0];
    const altMatch = tag.match(/alt="([^"]*)"/i);
    const srcMatch = tag.match(/src="([^"]*)"/i);
    htmlImgs.push({ tag, alt: altMatch ? altMatch[1] : '', src: srcMatch ? srcMatch[1] : '', index: h.index, length: tag.length });
  }
  return { mdImgs, htmlImgs };
}

function filenameStem(src){
  try {
    const base = src.split('?')[0].split('#')[0];
    const name = base.split('/').pop() || '';
    return name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]+/g, ' ').trim();
  } catch { return ''; }
}

function generateAlt({ fm, src }){
  const stem = filenameStem(src);
  const title = (fm.title||'').trim();
  const service = (fm.service||'').trim();
  const city = (fm.city||'').trim();
  const parts = [];
  if (service) parts.push(service);
  if (city) parts.push(city);
  if (!parts.length && title) parts.push(title);
  const base = parts.join(' in ') || stem || 'Image';
  return base.length > 0 ? base : 'Image';
}

function lintFile(file){
  if (IGNORE_FILES.has(path.basename(file))) {
    return { problems: [], updated: fs.readFileSync(file, 'utf8'), changed: false, changes: [] };
  }
  const text = fs.readFileSync(file, 'utf8');
  const { fm, body, fenced } = parseFrontMatter(text);
  const problems = [];
  let updated = text;
  const changes = [];

  // description check
  if (!fm.description || String(fm.description).trim() === ''){
    const desc = createDescriptionFromBody(body);
    if (desc){
      problems.push({ type:'missing-description', msg:'Missing meta description' });
      if (AUTOFIX){
        if (fenced){
          // insert description into fenced front matter
          const insert = `description: "${desc.replace(/"/g,'\"')}"`;
          updated = text.replace(/^---[\s\S]*?\n---/, (m)=>{
            const withoutEnd = m.slice(0, -3);
            return withoutEnd + `\n${insert}\n---`;
          });
          changes.push('Added description (auto-filled)');
        } else {
          // prepend YAML-like front matter
          updated = `description: \"${desc.replace(/\"/g,'\\\"')}\"\n` + text;
          changes.push('Prepended description (auto-filled)');
        }
      }
    } else {
      problems.push({ type:'missing-description', msg:'Missing meta description (no safe derivation: body empty after sanitization)' });
    }
  }

  // title present
  if (!fm.title || String(fm.title).trim() === ''){
    problems.push({ type:'missing-title', msg:'Missing title in front matter' });
  }

  // duplicate title/description checks will be computed globally later

  // Multiple H1 detection (markdown-level)
  const headings = extractHeadings(body);
  if (headings.h1.length > 1){
    problems.push({ type:'multiple-h1', msg:`Multiple H1 headings (${headings.h1.length})` });
  }
  // Empty H1 detection
  if (headings.h1.some(h=> !h.text || h.text.trim()==='')){
    problems.push({ type:'empty-h1', msg:'Empty H1 heading found' });
  }

  // Outbound internal links presence (simple heuristic)
  // Internal links presence check removed in favor of orphan detection

  // Missing alt text: report only; do not autofix
  const imgs = extractImages(body);
  if (imgs.mdImgs.some(img=> !img.alt || img.alt.trim()==='') || imgs.htmlImgs.some(img=> !img.alt)){
    problems.push({ type:'missing-alt', msg:'One or more images missing alt text' });
  }
  // Missing alt on linked images: Markdown [![alt](img)](href) and HTML <a href="..."><img ...></a>
  const mdLinkedImgPattern = /\[!\[(.*?)\]\(([^)]+)\)\]\(([^)]+)\)/g;
  const htmlLinkedImgPattern = /<a\s+[^>]*href="[^"]+"[^>]*>\s*<img\s+[^>]*>\s*<\/a>/gi;
  if (mdLinkedImgPattern.test(body)){
    mdLinkedImgPattern.lastIndex = 0;
    let m;
    while ((m = mdLinkedImgPattern.exec(body))){
      const alt = (m[1]||'').trim();
      if (!alt) { problems.push({ type:'missing-alt-linked', msg:'Linked image missing descriptive alt text (Markdown)' }); break; }
    }
  }
  if (htmlLinkedImgPattern.test(body)){
    htmlLinkedImgPattern.lastIndex = 0;
    let h;
    while ((h = htmlLinkedImgPattern.exec(body))){
      const tag = h[0];
      const altMatch = tag.match(/<img\s+[^>]*alt="([^"]*)"/i);
      const alt = altMatch ? altMatch[1].trim() : '';
      if (!alt) { problems.push({ type:'missing-alt-linked', msg:'Linked image missing descriptive alt text (HTML)' }); break; }
    }
  }

  // Report
  // No writes when AUTOFIX is false
  if (AUTOFIX && updated !== text){ fs.writeFileSync(file, updated, 'utf8'); }
  return { problems, updated, changed: updated !== text, changes };
}

function main(){
  if (!fs.existsSync(contentDir)){
    console.error(`[seo-lint] Content directory not found: ${contentDir}`);
    process.exit(0);
  }
  const files = Array.from(walk(contentDir));
  let totalProblems = 0;
  const report = [];
  const titles = new Map();
  const descs = new Map();
  const outgoingLinks = new Map(); // file -> [internal hrefs]
  const urlMap = new Map(); // urlPath -> file
  const fileSummaries = [];
  files.forEach(f=>{
    const { problems, updated, changed, changes } = lintFile(f);
    // Collect titles/descriptions for duplicate detection
    try {
      const text = changed ? updated : fs.readFileSync(f, 'utf8');
      const { fm } = parseFrontMatter(text);
      const t = (fm.title||'').trim();
      const d = (fm.description||'').trim();
      if (t) titles.set(f, t);
      if (d) descs.set(f, d);
      // Collect explicit url mapping for orphan resolution
      const explicitUrl = (fm.url || '').trim();
      if (explicitUrl){
        const clean = explicitUrl.replace(/\?.*$/, '').replace(/#.*/, '').replace(/\.html$/,'');
        urlMap.set(clean, f);
      }
      // Collect aliases
      const aliasesLine = (fm.aliases || '').toString();
      if (aliasesLine){
        aliasesLine.split(',').forEach(a=>{
          const p = a.trim().replace(/^\[|\]$/g,'').replace(/^"|"$/g,'');
          if (p){
            const cleanA = p.replace(/\?.*$/, '').replace(/#.*/, '').replace(/\.html$/,'');
            urlMap.set(cleanA, f);
          }
        });
      }
    } catch {}
    if (problems.length || changed){
      totalProblems += problems.length;
      report.push({ file: f, problems, changes });
    }
    fileSummaries.push({ file:f, title: titles.get(f)||'', description: descs.get(f)||'' });

    // Collect outgoing internal links for orphan detection
    try {
      const text2 = changed ? updated : fs.readFileSync(f, 'utf8');
      const { body: body2 } = parseFrontMatter(text2);
      const links = extractOutboundLinks(body2) || [];
      const internalLinks = links.filter(href=> href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('#'));
      outgoingLinks.set(f, internalLinks);
    } catch { outgoingLinks.set(f, []); }
  });

  // Duplicate titles/descriptions across files (exact match)
  function findDuplicates(map){
    const groups = new Map();
    for (const [file, val] of map.entries()){
      const key = val.toLowerCase();
      const arr = groups.get(key) || [];
      arr.push(file);
      groups.set(key, arr);
    }
    const dups = [];
    for (const [key, arr] of groups.entries()){
      if (arr.length > 1){ dups.push(arr); }
    }
    return dups;
  }
  const titleDups = findDuplicates(new Map(Array.from(titles.entries())));
  const descDups = findDuplicates(new Map(Array.from(descs.entries())));

  const rel = (f)=> path.relative(contentDir, f);
  titleDups.forEach(group=>{
    const names = group.map(rel).join(', ');
    group.forEach(f=>{
      const item = report.find(r=> r.file === f) || (report.push({file:f, problems:[], changes:[]}), report[report.length-1]);
      item.problems.push({ type:'duplicate-title', msg:`Duplicate title across files: ${names}` });
      totalProblems += 1;
    });
  });
  descDups.forEach(group=>{
    const names = group.map(rel).join(', ');
    group.forEach(f=>{
      const item = report.find(r=> r.file === f) || (report.push({file:f, problems:[], changes:[]}), report[report.length-1]);
      item.problems.push({ type:'duplicate-description', msg:`Duplicate description across files: ${names}` });
      totalProblems += 1;
    });
  });
  if (report.length){
    console.log(color.yellow(`[seo-lint] Found ${totalProblems} issues across ${report.length} files:`));

    // Group problems by type with file lists
    const groups = new Map(); // type -> Set(files)
    report.forEach(r=>{
      const relFile = path.relative(contentDir, r.file);
      (r.problems || []).forEach(p=>{
        const type = p.type || p.msg || 'unknown';
        const set = groups.get(type) || new Set();
        set.add(relFile);
        groups.set(type, set);
      });
    });

    const order = [
      'missing-title',
      'missing-description',
      'duplicate-title',
      'duplicate-description',
      'multiple-h1',
      'empty-h1',
      'missing-alt',
      'missing-alt-linked',
      'no-internal-links',
    ];

    const title = (t)=> {
      switch(t){
        case 'missing-title': return 'Missing Title';
        case 'missing-description': return 'Missing Meta Description';
        case 'duplicate-title': return 'Duplicate Titles';
        case 'duplicate-description': return 'Duplicate Descriptions';
        case 'multiple-h1': return 'Multiple H1 Headings';
        case 'empty-h1': return 'Empty H1 Headings';
        case 'missing-alt': return 'Images Missing Alt Text';
        case 'missing-alt-linked': return 'Linked Images Missing Alt Text';
        case 'no-internal-links': return 'No Internal Links';
        default: return t;
      }
    };

    const printGroup = (t, files)=>{
      if (!files || files.size === 0) return;
      const hdr = /duplicate|multiple-h1|missing-title|missing-description/i.test(t) ? color.red : color.yellow;
      const list = Array.from(files).sort();
      console.log(`\n${hdr(`${title(t)} (${list.length})`)}`);
      list.forEach(f=> console.log(hdr(` - ${f}`)));
    };

    // Print in preferred order first
    order.forEach(t=> printGroup(t, groups.get(t)));
    // Then print any remaining types
    Array.from(groups.keys())
      .filter(t=> !order.includes(t))
      .forEach(t=> printGroup(t, groups.get(t)));

    // Optional per-file details (keep for context)
    report.forEach(r=>{
      if (!r.changes || r.changes.length === 0) return;
      console.log(`\n- ${path.relative(contentDir, r.file)}`);
      r.changes.forEach(c=> console.log(color.dim(`  • change: ${c}`)));
    });

    // Sanity: if grouped sections printed fewer items than totalProblems, note remaining count
    const groupedCount = Array.from(groups.values()).reduce((sum, set)=> sum + set.size, 0);
    if (groupedCount < totalProblems) {
      console.log(color.yellow(`\n[seo-lint] Note: ${totalProblems - groupedCount} additional notices were file-specific and may be covered by grouped issues above.`));
    }
  } else {
    console.log(color.green('[seo-lint] No SEO warnings.'));
  }

  // Orphan page detection: pages with zero inbound internal links from other content
  const inboundCount = new Map();
  const toRel = (p)=> path.relative(contentDir, p);
  files.forEach(f=> inboundCount.set(f, 0));
  files.forEach(f=>{
    const links = outgoingLinks.get(f) || [];
    links.forEach(href=>{
      // Normalize relative href
      const clean = href.replace(/\?.*$/, '').replace(/#.*/, '').replace(/\.html$/,'');
      // First try explicit URL/alias mapping
      const mapped = urlMap.get(clean);
      if (mapped){
        inboundCount.set(mapped, (inboundCount.get(mapped) || 0) + 1);
        return;
      }
      // Fallback to path -> file heuristic: '/foo/bar' -> content/foo/bar.md or index.md
      let target;
      if (clean.endsWith('/')) {
        target = path.join(contentDir, clean.slice(1), 'index.md');
      } else {
        target = path.join(contentDir, clean.slice(1) + '.md');
      }
      if (fs.existsSync(target)) {
        inboundCount.set(target, (inboundCount.get(target) || 0) + 1);
      }
    });
  });
  // Consider header/menu links from site config as inbound links too
  try {
    const configPath = path.join(root, 'sites', SITE, 'config.toml');
    if (fs.existsSync(configPath)){
      const cfg = fs.readFileSync(configPath, 'utf8');
      // Capture baseURL to strip absolute URLs pointing to this site
      const baseURLMatch = cfg.match(/\bbaseURL\s*=\s*"([^"]+)"/i);
      const baseURL = baseURLMatch ? baseURLMatch[1].replace(/\/$/, '') : '';
      const menuUrls = [];
      const urlRe = /\burl\s*=\s*"([^"]+)"/g;
      let m;
      while ((m = urlRe.exec(cfg))) { menuUrls.push(m[1]); }
      menuUrls.forEach(href=>{
        // Normalize absolute site URLs to relative paths
        let hrefNorm = href;
        if (baseURL && hrefNorm.startsWith(baseURL)) {
          hrefNorm = hrefNorm.slice(baseURL.length);
          if (!hrefNorm.startsWith('/')) hrefNorm = '/' + hrefNorm;
        }
        const clean = hrefNorm.replace(/\?.*$/, '').replace(/#.*/, '').replace(/\.html$/,'');
        let target;
        if (clean.endsWith('/')) {
          target = path.join(contentDir, clean.slice(1), 'index.md');
        } else {
          target = path.join(contentDir, clean.slice(1) + '.md');
        }
        if (fs.existsSync(target)) {
          inboundCount.set(target, (inboundCount.get(target) || 0) + 1);
        }
      });
    }
  } catch {}

  // urlMap already contains aliases and explicit urls; using it in menu processing above

  const orphans = files.filter(f=> {
    const base = path.basename(f);
    if (IGNORE_ORPHAN_CHECK.has(base)) return false;
    return (inboundCount.get(f) || 0) === 0;
  });
  if (orphans.length) {
    console.log(color.yellow(`\nOrphan Pages (no inbound internal links):`));
    orphans.map(toRel).sort().forEach(rel=> console.log(color.yellow(` - ${rel}`)));
  }

  // Run broken internal link checks (existing checker) so all SEO checks come from one place
  try {
    const res = spawnSync('node', ['scripts/check-links.mjs', `--site=${SITE}`], { stdio: 'inherit' });
    if (res.status !== 0) {
      console.error(color.red('[seo-lint] Link check reported issues. See details above.'));
      // Keep non-zero exit to surface in CI/dev if desired
    } else {
      console.log(color.green('[seo-lint] Link check passed.'));
    }
  } catch (e) {
    console.error(color.red('[seo-lint] Failed to run link checker:'), e?.message || e);
  }
}

main();
