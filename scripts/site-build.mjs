import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
