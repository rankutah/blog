#!/usr/bin/env node
/*
  changed-media.mjs
  Returns 0 if ALL provided media directories have no changes in the last commit.
  Returns 1 if any provided directory has changes, or if we cannot determine (e.g., shallow clone).

  Usage:
    node scripts/changed-media.mjs sites/blue-ridge-abbey/media [sites/other/media ...]

  Safe semantics for CI/local:
  - Local: if HEAD~1 exists and no media changes, exit 0 (so callers can skip heavy steps).
  - CI (shallow clones with no HEAD~1): exit 1 (force running heavy steps to be safe).
*/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error('[changed-media] No directories provided.');
  process.exit(1);
}

function inGitRepo() {
  try {
    const out = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out === 'true';
  } catch { return false; }
}

function hasPrevCommit() {
  try {
    const cnt = execFileSync('git', ['rev-list', '--count', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return parseInt(cnt, 10) >= 2;
  } catch { return false; }
}

function dirExists(p) {
  try { return fs.existsSync(p) && fs.statSync(p).isDirectory(); } catch { return false; }
}

function changedInDir(dir) {
  // Return true if any file under dir changed in last commit
  try {
    const out = execFileSync('git', ['diff', '--name-only', 'HEAD~1', 'HEAD', '--', dir], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const lines = out.split('\n').map(s => s.trim()).filter(Boolean);
    return lines.length > 0;
  } catch {
    // If diff fails for any reason, be conservative: treat as changed
    return true;
  }
}

function hasUncommittedChanges(dir) {
  // Return true if working tree has modified, added, or untracked files under dir
  try {
    const out = execFileSync('git', ['status', '--porcelain', '--', dir], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const lines = out.split('\n').map(s => s.trim()).filter(Boolean);
    return lines.length > 0;
  } catch {
    // Be conservative if status fails
    return true;
  }
}

(function main() {
  if (!inGitRepo() || !hasPrevCommit()) {
    console.log('[changed-media] Unknown history (shallow or not a git repo). Treating as changed.');
    process.exit(1);
  }
  let anyChanged = false;
  for (const d of dirs) {
    const abs = path.resolve(d);
    if (!dirExists(abs)) continue; // missing dir cannot have changes
    if (changedInDir(abs) || hasUncommittedChanges(abs)) { anyChanged = true; break; }
  }
  if (anyChanged) {
    console.log('[changed-media] Media changed (last commit or uncommitted).');
    process.exit(1);
  } else {
    console.log('[changed-media] No media changes detected.');
    process.exit(0);
  }
})();
