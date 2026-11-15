import { defineConfig } from 'vite'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative, sep } from 'node:path'

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
    /^icons\/(icon-192\.png|icon-512\.png|favicon\.svg|apple-touch-icon\.png|badge-96\.png)$/.test(p)
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
      console.log(`\n[sw] dist/sw.js v${version} — ${list.length} berkas precache`)
    }
  }
}

export default defineConfig({
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
