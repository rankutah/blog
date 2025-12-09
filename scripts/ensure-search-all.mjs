#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const sitesDir = path.join(root, 'sites')
const sites = fs.readdirSync(sitesDir).filter(name => {
  const p = path.join(sitesDir, name)
  return fs.statSync(p).isDirectory()
})

sites.forEach(SITE => {
  const res = spawnSync('node', ['scripts/ensure-search-page.mjs', `--site=${SITE}`], { stdio: 'inherit', env: { ...process.env, SITE } })
  if (res.status !== 0) {
    console.error(`[ensure-search-all] Failed for ${SITE}`)
  }
})
