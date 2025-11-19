#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

async function run() {
  const baseDir = path.resolve(process.cwd(), 'sites/novagutter/posts');
  let entries;
  try { entries = await fs.readdir(baseDir); } catch (e) {
    console.error('Posts directory not found:', baseDir, e.message); process.exit(1);
  }
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const filePath = path.join(baseDir, entry);
    let text = await fs.readFile(filePath, 'utf8');
    const original = text;

    // Remove any is_published lines (front matter or stray within content)
    text = text.split('\n').filter(line => !/^is_published:\s*/.test(line.trim())).join('\n');

    // Ensure opening front matter delimiter present if closing delimiter exists
    if (!text.startsWith('---') ) {
      const closingIdx = text.indexOf('\n---');
      if (closingIdx !== -1) {
        text = '---\n' + text;
      }
    }

    if (text !== original) {
      await fs.writeFile(filePath, text, 'utf8');
      console.log('Cleaned', entry);
    }
  }
  console.log('Cleanup complete.');
}

run();
