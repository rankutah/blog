#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const SITE = process.env.SITE || process.argv.find(a=>a.startsWith('--site='))?.split('=')[1] || ''
if (!SITE) {
  console.error('[ensure-search-page] Usage: SITE=<site> node scripts/ensure-search-page.mjs')
  process.exit(2)
}

const root = process.cwd()
const contentDir = path.join(root, 'sites', SITE, 'content')
const searchFile = path.join(contentDir, 'search.md')

const fm = `---
title: "Search"
description: "Search the site for pages, services, and blog posts. Find what you need fast."
layout: "flowbite"
url: "/search"
---

{{< search >}}
`

try {
  if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true })
  if (!fs.existsSync(searchFile)) {
    fs.writeFileSync(searchFile, fm, 'utf8')
    console.log(`[ensure-search-page] Created ${path.relative(root, searchFile)}`)
  } else {
    // Ensure it has a description; do not overwrite existing content
    const txt = fs.readFileSync(searchFile, 'utf8')
    if (!/\n?description:\s*"[^"]*"/i.test(txt)) {
      const updated = txt.replace(/^---[\s\S]*?\n---/, (m)=>{
        const insert = 'description: "Search the site for pages, services, and blog posts. Find what you need fast."'
        const withoutEnd = m.slice(0, -3)
        return `${withoutEnd}\n${insert}\n---`
      })
      if (updated !== txt) {
        fs.writeFileSync(searchFile, updated, 'utf8')
        console.log(`[ensure-search-page] Added description to ${path.relative(root, searchFile)}`)
      }
    }
  }
} catch (e) {
  console.error('[ensure-search-page] Failed:', e?.message || e)
  process.exit(1)
}
