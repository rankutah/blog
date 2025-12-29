import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

function assertForbiddenRankUtahPagesAbsent(SITE) {
  if (SITE !== 'rank-utah') return

  const forbiddenSlugs = ['boca-raton-fl', 'buena-vista-va', 'grand-junction-co']
  const forbiddenPaths = forbiddenSlugs.flatMap((slug) => [
    join('sites', SITE, 'content', 'locations', `${slug}.md`),
    join('sites', SITE, 'content', 'locations', slug, 'index.md'),
    join('sites', SITE, 'content', 'locations', slug, '_index.md'),
  ])

  // Old service URL is redirect-only; do not reintroduce content at this path.
  forbiddenPaths.push(
    join('sites', SITE, 'content', 'services', 'local-seo.md'),
    join('sites', SITE, 'content', 'services', 'local-seo', 'index.md'),
    join('sites', SITE, 'content', 'services', 'local-seo', '_index.md'),
  )

  const present = forbiddenPaths.filter((p) => existsSync(p))
  if (present.length > 0) {
    const hint = 'These pages are intentionally deleted and must remain redirect-only.'
    throw new Error(`[guard] Forbidden Rank Utah content file(s) found:\n- ${present.join('\n- ')}\n${hint}`)
  }
}

function run(cmd, args = [], env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
      shell: true,
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))
    })
  })
}

async function main() {
  const SITE = process.env.SITE
  if (!SITE) {
    console.error('SITE env var is required, e.g. SITE=rank-utah')
    process.exit(1)
  }

  const siteRoot = join('sites', SITE)
  const mediaDir = join(siteRoot, 'media')
  const sourceArg = siteRoot
  const sharedConfig = '../../themes/overrides/config.shared.toml'
  const configArg = `${sharedConfig},config.toml`

  const cfPages = !!process.env.CF_PAGES

  // Media preparation (skip heavy ops on CF Pages)
  if (cfPages) {
    if (existsSync(mediaDir)) {
      await run('node', ['scripts/has-derivatives.mjs', SITE])
    }
  } else {
    if (existsSync(mediaDir)) {
      await run('node', ['scripts/changed-media.mjs', mediaDir]).catch(async () => {
        await run('npm', ['run', `optimize:${SITE}`, '--silent'])
        await run('npm', ['run', `deriv:${SITE}`, '--silent'])
      })
    }
  }

  // Vendor fonts (non-fatal)
  await run('node', ['scripts/vendor-google-fonts.mjs', '--silent'], { SITE }).catch(() => {})

  // Generate legacy favicon.ico from logo/source (non-fatal)
  if (existsSync('scripts/generate-favicon-ico.mjs')) {
    await run('node', ['scripts/generate-favicon-ico.mjs'], { SITE }).catch(() => {})
  }

  // Pre-build SEO lints (content-level)
  if (existsSync('scripts/seo-lint.mjs')) {
    await run('node', ['scripts/seo-lint.mjs', `--site=${SITE}`], { SITE })
  }

  // Ensure search page exists with shared description
  if (existsSync('scripts/ensure-search-page.mjs')) {
    await run('node', ['scripts/ensure-search-page.mjs'], { SITE }).catch(()=>{})
  }

  // Guardrails: prevent reintroducing intentionally-deleted pages
  assertForbiddenRankUtahPagesAbsent(SITE)

  // Build with Hugo
  await run('hugo', [
    '--source', sourceArg,
    '--config', `"${configArg}"`,
    '--gc', '--minify', '--cleanDestinationDir',
    '--logLevel', 'info', '--ignoreCache',
  ], { SITE, HUGO_SITE: SITE, HUGO_POSTCSS_CONFIG_DIR: process.cwd() })

  // Post-build link checks (built HTML-level)
  if (existsSync('scripts/check-links.mjs')) {
    await run('node', ['scripts/check-links.mjs', `--site=${SITE}`], { SITE })
  }
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
