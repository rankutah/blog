import { spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

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

  // Fast media prep for dev (best-effort)
  if (existsSync(mediaDir)) {
    await run('node', ['scripts/changed-media.mjs', mediaDir]).catch(async () => {
      await run('npm', ['run', `optimize:${SITE}`, '--silent'])
      await run('npm', ['run', `deriv:${SITE}`, '--silent'])
    })
  }

  // Vendor fonts (non-fatal)
  await run('node', ['scripts/vendor-google-fonts.mjs', '--silent'], { SITE }).catch(() => {})

  // Generate/fix legacy favicon.ico from user-provided favicon or logo/source (non-fatal)
  if (existsSync('scripts/generate-favicon-ico.mjs')) {
    await run('node', ['scripts/generate-favicon-ico.mjs'], { SITE }).catch(() => {})
  }

  // Pre-dev SEO lints (content-level)
  if (existsSync('scripts/seo-lint.mjs')) {
    await run('node', ['scripts/seo-lint.mjs', `--site=${SITE}`], { SITE })
  }

  // Ensure search page exists with shared description
  if (existsSync('scripts/ensure-search-page.mjs')) {
    await run('node', ['scripts/ensure-search-page.mjs'], { SITE }).catch(()=>{})
  }

  // Optional quick prebuild for link checks so `npm run <site>` surfaces issues locally
  const doLinkCheck = process.env.DEV_LINK_CHECK !== '0'
  if (doLinkCheck && existsSync('scripts/check-links.mjs')) {
    const tmpDest = resolve('.tmp', `dev-build-${SITE}`)
    // Run a fast Hugo build to a temp folder, then check links against built HTML
    await run('hugo', [
      '--source', sourceArg,
      '--config', `"${configArg}"`,
      '--gc', '--minify',
      '--logLevel', 'info', '--ignoreCache',
      '--destination', tmpDest,
    ], { SITE, HUGO_SITE: SITE, HUGO_POSTCSS_CONFIG_DIR: process.cwd() })

    await run('node', ['scripts/check-links.mjs', `--site=${SITE}`, `--dir=${tmpDest}`], { SITE })

    // Clean up temporary build output
    try { rmSync(tmpDest, { recursive: true, force: true }) } catch {}
  }

  // Start dev server
  await run('node', [
    'scripts/run-hugo-server.mjs',
    `--site=${SITE}`,
    `--source=${sourceArg}`,
    `--config="${configArg}"`,
  ], { SITE, HUGO_SITE: SITE, HUGO_POSTCSS_CONFIG_DIR: process.cwd() })
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
