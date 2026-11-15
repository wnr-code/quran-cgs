import { defineConfig } from 'vite'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative, sep } from 'node:path'
import { execSync } from 'node:child_process'

/** Menghasilkan dist/sw.js dari templat sw.js dengan daftar precache & versi berbasis isi berkas. */
function serviceWorkerPlugin() {
  let outDir = 'dist'
  const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]))
  const wanted = (p) =>
    p === 'index.html' ||
    p === 'offline.html' ||
    p === 'privacy.html' ||
    p === 'manifest.webmanifest' ||
    p === 'theme-init.js' ||
    /^assets\/.+\.(js|css)$/.test(p) ||
    /^fonts\/.+\.woff2$/.test(p) ||
    /^icons\/(icon-192-v2\.png|icon-512-v2\.png|favicon-48-v2\.png|apple-touch-icon-v2\.png|badge-96-v2\.png)$/.test(p)
  return {
    name: 'quranku-service-worker',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir
    },
    closeBundle() {
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split(sep).join('/'))
        .filter(wanted)
        .sort()
      const hash = createHash('sha256')
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)))
      const tpl = readFileSync('sw.js', 'utf8')
      hash.update(tpl)
      const version = hash.digest('hex').slice(0, 12)
      const list = ['/', ...files.filter((f) => f !== 'index.html').map((f) => '/' + f), '/index.html']
      writeFileSync(join(outDir, 'sw.js'), tpl.replace('__SW_VERSION__', () => version).replace('__PRECACHE_LIST__', () => JSON.stringify(list)))
      // Dibaca aplikasi yang sudah terpasang untuk mengetahui ada versi baru (tidak pernah di-cache).
      writeFileSync(join(outDir, 'version.json'), JSON.stringify({ ...BUILD, sw: version }))
      console.log(`\n[sw] dist/sw.js v${version} — ${list.length} berkas precache`)
    }
  }
}

/**
 * Identitas build yang ditampilkan di aplikasi. Berubah otomatis pada setiap build:
 * nomor build = waktu build (WIB), ditambah potongan commit bila tersedia (Cloudflare Workers Builds / GitHub Actions / git lokal).
 */
function buildInfo() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const d = new Date(Date.now() + 7 * 3600 * 1000)
  const p = (n) => String(n).padStart(2, '0')
  const number = `${p(d.getUTCFullYear() % 100)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}.${p(d.getUTCHours())}${p(d.getUTCMinutes())}`
  let commit = process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || ''
  if (!commit) {
    try {
      commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {}
  }
  return { version: pkg.version, number, commit: /^[0-9a-f]{7,40}$/.test(commit) ? commit.slice(0, 7) : '', time: new Date().toISOString() }
}

const BUILD = buildInfo()

export default defineConfig({
  define: { __APP_BUILD__: JSON.stringify(BUILD) },
  plugins: [serviceWorkerPlugin()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/adhan')) return 'adhan'
        }
      }
    }
  }
})
