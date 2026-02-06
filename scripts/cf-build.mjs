#!/usr/bin/env node
/**
 * Cloudflare Pages unified build script for monorepo sites.
 *
 * Goal: Use one build command for all CF Pages projects: `pnpm run cf:build`
 * This script detects the site to build from CF environment variables or from
 * an explicit `SITE` override.
 *
 * Detection order:
 * 1. `SITE` env var (explicit override)
 * 2. `CF_PAGES_PROJECT_NAME` (Cloudflare-provided)
 * 3. Fallback: error with helpful message
 *
 * It then runs the same Hugo build we use locally with shared config stacking.
 */

import { spawn } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const env = process.env

// Known site names mapped to their repo folder names when needed.
const KNOWN_SITES = new Set([
  'rank-utah',
  'novagutter',
  'blue-ridge-abbey',
  'blueridgeTech',
  'cedarcitystrength',
  'quartz-worx',
  'rodmaxfielddds',
  'rooftopterracebv',
  'kandee-myers'
])

function resolveSite() {
  // 1) Explicit override via SITE
  if (env.SITE && KNOWN_SITES.has(env.SITE)) return env.SITE

  // 2) Cloudflare Pages project name
  const cfProject = env.CF_PAGES_PROJECT_NAME
  if (cfProject && KNOWN_SITES.has(cfProject)) return cfProject

  // Common normalization: sometimes project names differ slightly
  const normalized = (cfProject || '').toLowerCase()
  for (const site of KNOWN_SITES) {
    if (site.toLowerCase() === normalized) return site
  }

  throw new Error(
    `Unable to resolve site. Set env SITE to one of: ${[...KNOWN_SITES].join(', ')} ` +
    `or ensure CF_PAGES_PROJECT_NAME matches a site folder.`
  )
}

function build(site) {
  const source = `./sites/${site}`
  const sharedConfig = '../../themes/overrides/config.shared.toml'
  const siteConfig = 'config.toml'

  const args = [
    '--source', source,
    '--config', `${sharedConfig},${siteConfig}`,
    '--gc',
    '--minify',
    '--cleanDestinationDir',
    '--logLevel', 'info',
    '--ignoreCache'
  ]

  return spawn('hugo', args, {
    stdio: 'inherit',
    env: {
      ...env,
      SITE: env.SITE || site,
      HUGO_SITE: site,
      HUGO_POSTCSS_CONFIG_DIR: process.cwd(),
      // Copy CF Pages vars into whitelisted HUGO_* vars for template/debug visibility.
      HUGO_BUILD_SHA: env.CF_PAGES_COMMIT_SHA || env.HUGO_BUILD_SHA || '',
      HUGO_BUILD_BRANCH: env.CF_PAGES_BRANCH || env.HUGO_BUILD_BRANCH || '',
    }
  })
}

async function main() {
  try {
    const site = resolveSite()
    const child = build(site)
    await new Promise((resolve, reject) => {
      child.on('exit', code => {
        if (code === 0) resolve()
        else reject(new Error(`Hugo build exited with code ${code}`))
      })
      child.on('error', reject)
    })

    // Post-build sanity check: the built HTML should carry the site id.
    // If Cloudflare Pages is publishing the wrong directory, this catches it.
    const indexPath = join('sites', site, 'public', 'index.html')
    if (!existsSync(indexPath)) {
      throw new Error(`[cf-build] Missing output file: ${indexPath}. Check Pages publish directory.`)
    }
    const html = readFileSync(indexPath, 'utf8')
    if (!html.includes(`data-site=${site}`) && !html.includes(`data-site=\"${site}\"`) && !html.includes(`data-site='${site}'`)) {
      throw new Error(
        `[cf-build] Built index.html does not appear to be for site "${site}". ` +
        `Expected to find data-site=${site}. Check HUGO_SITE/SITE env and publish directory.`
      )
    }
  } catch (err) {
    console.error(err.message || err)
    process.exit(1)
  }
}

main()
