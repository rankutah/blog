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
  } catch (err) {
    console.error(err.message || err)
    process.exit(1)
  }
}

main()
