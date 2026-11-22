#!/usr/bin/env node
// Membuat ulang screenshot halaman Infaq untuk Play Store tanpa perlu memasang wrangler/Worker.
// Halaman dijalankan dari `dist/` (hasil `npm run build`) dan /api/donors dilayani data tiruan anonim.
//
//   npm run gen:shots                 # semua screenshot Infaq
//   PORT=5181 npm run gen:shots       # ganti port
//
// Butuh peramban Chromium yang bisa dijalankan puppeteer-core. Urutan pencarian:
//   1. PUPPETEER_PATH / CHROME_PATH (variabel lingkungan)
//   2. Google Chrome / Chromium yang terpasang di sistem
//   3. `npx @puppeteer/browsers install chrome@stable` lalu set CHROME_PATH

import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const ROOT = new URL('../dist/', import.meta.url).pathname
const OUT = new URL('../store/screenshots/', import.meta.url).pathname
const PORT = Number(process.env.PORT || 5181)
const SHOTS = OUT

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg'
}

// Data contoh: cukup 5 doa agar tinggi halaman stabil, semua tanpa nama & nominal.
const now = Date.now()
const DEMO = {
  ok: true,
  updatedAt: now,
  totals: { count: 128, doaCount: 46 },
  doa: [
    { message: 'Semoga QuranKu terus berkembang dan bermanfaat untuk umat.', at: now - 2 * 3600e3 },
    { message: 'Ya Allah, berkahilah setiap orang yang bersedekah di jalan-Mu.', at: now - 26 * 3600e3 },
    { message: 'Terima kasih, aplikasinya sangat membantu saya mengaji setiap hari.', at: now - 50 * 3600e3 },
    { message: 'Semoga menjadi amal jariyah yang mengalir pahalanya.', at: now - 74 * 3600e3 },
    { message: 'Barakallahu fiikum, semoga selalu istiqamah.', at: now - 98 * 3600e3 }
  ]
}

function serve() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname === '/api/donors') {
      res.writeHead(200, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' })
      return res.end(JSON.stringify(DEMO))
    }
    if (url.pathname.startsWith('/api/')) {
      res.writeHead(503, { 'content-type': TYPES['.json'] })
      return res.end('{"ok":false,"error":"tidak_tersedia_di_pratinjau"}')
    }
    let p = normalize(decodeURIComponent(url.pathname))
    if (p.endsWith('/')) p += 'index.html'
    const file = join(ROOT, p)
    if (!file.startsWith(ROOT)) {
      res.writeHead(403)
      return res.end('forbidden')
    }
    try {
      const s = await stat(file)
      const target = s.isDirectory() ? join(file, 'index.html') : file
      let body = await readFile(target)
      if (target.endsWith('index.html')) {
        // Langsung ke halaman Infaq agar screenshot tidak perlu navigasi.
        body = Buffer.from(body.toString('utf8').replace('</body>', "<script>if(!location.hash)location.hash='#/infaq'</script></body>"))
      }
      res.writeHead(200, { 'content-type': TYPES[extname(target)] || 'application/octet-stream', 'cache-control': 'no-cache' })
      res.end(body)
    } catch {
      try {
        const body = await readFile(join(ROOT, 'index.html'))
        res.writeHead(200, { 'content-type': TYPES['.html'] })
        res.end(body)
      } catch {
        res.writeHead(404)
        res.end('not found')
      }
    }
  })
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)))
}

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error('dist/index.html tidak ada. Jalankan `npm run build` lebih dulu.')
  process.exit(1)
}

const server = await serve()
console.log(`Pratinjau lokal: http://127.0.0.1:${PORT}/`)

const puppeteer = await import(process.env.PUPPETEER_PATH || 'puppeteer-core').then((m) => m.default).catch(() => {
  console.error('puppeteer-core tidak terpasang. Jalankan: npm i -D puppeteer-core')
  server.close()
  process.exit(1)
})

let browser
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars']
  })
} catch (e) {
  console.error('Gagal membuka Chromium:', e.message)
  console.error('Pasang Chrome lalu set CHROME_PATH, atau: npx @puppeteer/browsers install chrome@stable')
  server.close()
  process.exit(1)
}

const page = await browser.newPage()
// Ukuran yang sama dengan screenshot lama di repo (824×1830 @2x).
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.setRequestInterception(true)
page.on('request', (req) => {
  const u = new URL(req.url())
  if (u.origin !== `http://127.0.0.1:${PORT}`) return req.abort()
  req.continue()
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

await page.goto(`http://127.0.0.1:${PORT}/#/infaq`, { waitUntil: 'networkidle2' })
await page.waitForSelector('.doa-item .doa-msg', { timeout: 20000 })
await page.evaluate(() => document.querySelector('[data-stats]')?.scrollIntoView({ block: 'start' }))
await wait(900) // beri waktu animasi 0,5 dtk + stagger selesai
await page.screenshot({ path: join(SHOTS, '14-infaq-papan.png') })
console.log('✓ 14-infaq-papan.png')

// Kartu atas halaman Infaq (tombol INFAQ + akad) untuk screenshot pengantar.
await page.evaluate(() => scrollTo({ top: 0 }))
await wait(400)
await page.screenshot({ path: join(SHOTS, '10-infaq.png') })
console.log('✓ 10-infaq.png')

// Akad di dalam sheet.
await page.$eval('[data-akad-open]', (b) => b.click())
await page.waitForSelector('.sheet-wrap.open [data-akad]', { timeout: 10000 })
await wait(500)
await page.screenshot({ path: join(SHOTS, '13-infaq-akad.png') })
console.log('✓ 13-infaq-akad.png')

await browser.close()
server.close()

if (errors.length) {
  console.error('Error JavaScript di halaman:', errors)
  process.exit(1)
}
console.log('Selesai. Periksa ukuran berkas sebelum mengunggah ke Play Store (2–8 gambar, rasio maks. 2:1).')
