#!/usr/bin/env node
// Membuat tangkapan layar Play Store dari `dist/` tanpa jaringan dan tanpa Worker/D1.
//
//   npm run build && npm run gen:shots:app
//   PORT=5182 npm run gen:shots:app
//
// Semua permintaan keluar (EQuran.id, Al Quran Cloud, mp3quran, Nominatim, dsb.) DIBLOKIR:
// aplikasi lalu memakai cadangan terakhirnya, yaitu /data/… yang dibuat `scripts/gen-local.mjs`.
// Dengan begitu screenshot tetap berasal dari UI asli, dan tidak bergantung pada API pihak ketiga
// yang bisa berubah sewaktu-waktu.
//
// Ukuran keluaran 1080×1920 (9:16). Ini penting: Play menolak gambar dengan rasio lebih dari 2:1,
// sedangkan berkas lama 824×1830 (2,22:1) berada di luar batas itu.
import http from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { surahDetail, surahList, tafsir } from './play-shots-fixture.mjs'

// Zona waktu WAJIB dipaksa sebelum modul lain memakai `Date`. Jadwal salat dihitung di perangkat
// dan diformat dengan getHours(), jadi mesin UTC menghasilkan Subuh 20:57 / Magrib 10:50 — angka
// yang tidak masuk akal untuk pembaca Indonesia. Tanpa baris ini, hasilnya bergantung pada TZ mesin.
if (!process.env.TZ) process.env.TZ = 'Asia/Jakarta'

const ROOT = new URL('../dist/', import.meta.url).pathname
const OUT = new URL('../store/screenshots/', import.meta.url).pathname
const PORT = Number(process.env.PORT || 5182)
const WIDTH = 1080
const HEIGHT = 1920

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
  '.txt': 'text/plain; charset=utf-8'
}

/** Foto & donasi contoh: data tiruan supaya papan kebaikan tidak kosong. */
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

/** Waktu salat contoh: tanpa API, jadwal akan kosong dan halaman Salat tidak layak difoto. */
const PRAYERS = { imsak: '04:32', subuh: '04:42', terbit: '05:50', dzuhur: '11:52', ashar: '15:16', maghrib: '17:54', isya: '19:06', tanggal: 'Minggu, 22 November 2026' }

function serve() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    const p = url.pathname
    // Proxy EQuran tiruan: bentuk responsnya sama dengan yang dipetakan src/api/equran.js,
    // sehingga aplikasi menganggapnya sumber utama (tanpa banner "Sumber cadangan").
    if (p.startsWith('/api/quran/')) {
      const parts = p.slice('/api/quran/'.length).split('/')
      let body = null
      if (parts.length === 1 && parts[0] === 'surat') body = surahList()
      else if (parts.length === 2 && parts[0] === 'surat') body = surahDetail(parts[1])
      else if (parts.length === 2 && parts[0] === 'tafsir') body = tafsir(parts[1])
      res.writeHead(body ? 200 : 404, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' })
      return res.end(JSON.stringify(body || { code: 404, message: 'not found' }))
    }
    if (p === '/api/donors') {
      res.writeHead(200, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' })
      return res.end(JSON.stringify(DEMO))
    }
    if (p.startsWith('/api/')) {
      res.writeHead(503, { 'content-type': TYPES['.json'] })
      return res.end('{"ok":false,"error":"tidak_tersedia_di_pratinjau"}')
    }
    let file = normalize(decodeURIComponent(p))
    if (file.endsWith('/')) file += 'index.html'
    const target = join(ROOT, file)
    if (!target.startsWith(ROOT)) {
      res.writeHead(403)
      return res.end('forbidden')
    }
    try {
      const s = await stat(target)
      const f = s.isDirectory() ? join(target, 'index.html') : target
      const body = await readFile(f)
      res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' })
      res.end(body)
    } catch {
      // Router memakai History API: jalur tanpa ekstensi dilayani shell.
      try {
        const body = await readFile(join(ROOT, 'index.html'))
        res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-cache' })
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

await mkdir(OUT, { recursive: true })
const server = await serve()
console.log(`Pratinjau: http://127.0.0.1:${PORT}/`)

/** Cari Chromium: CHROME_PATH → lokasi sistem → cache puppeteer. */
async function findChrome() {
  const { existsSync, readdirSync } = await import('node:fs')
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const common = [
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:/Program Files/Google/Chrome/Application/chrome.exe'
  ]
  const hit = common.find((f) => existsSync(f))
  if (hit) return hit
  const cache = join(process.env.HOME || '', '.cache/puppeteer/chrome')
  if (existsSync(cache)) {
    for (const d of readdirSync(cache)) {
      const b = join(cache, d, 'chrome-linux64/chrome')
      if (existsSync(b)) return b
    }
  }
  if (existsSync('/tmp/chromium')) return '/tmp/chromium'
  return null
}

const executablePath = await findChrome()
if (!executablePath) {
  console.error('Chromium tidak ditemukan. Set CHROME_PATH atau jalankan `npx @puppeteer/browsers install chrome@stable`.')
  server.close()
  process.exit(1)
}
console.log(`Peramban: ${executablePath}`)

const puppeteer = (await import('puppeteer-core')).default
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  env: { ...process.env, ...(process.env.LD_LIBRARY_PATH ? { LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH } : {}) },
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none', '--force-device-scale-factor=2']
})

const page = await browser.newPage()
// 540×960 CSS @2x = 1080×1920 piksel, rasio 16:9 — di dalam batas Play.
await page.setViewport({ width: WIDTH / 2, height: HEIGHT / 2, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

/**
 * Keadaan awal yang wajar: onboarding sudah selesai, lokasi sudah dipilih, dan progres
 * membaca sudah ada. Tanpa ini, halaman tampil kosong ("Belum ada bacaan terakhir"),
 * dan slide onboarding yang muncul saat pertama dibuka akan menutupi layar.
 */
const STATE = {
  'quranku:onboarding:completed:v1': '1',
  'quranku:install-dismissed': '1',
  'quranku:settings': JSON.stringify({
    location: { lat: -7.3274, lng: 108.2207, name: 'Tasikmalaya' },
    prayerMethod: 'kemenag',
    numerals: 'latin'
  })
}
page.on('pageerror', (e) => console.warn('  JS error:', String(e).slice(0, 120)))

// Blokir semua permintaan keluar: screenshot harus berasal dari data lokal & UI asli.
await page.setRequestInterception(true)
page.on('request', (req) => {
  let u
  try { u = new URL(req.url()) } catch { return req.abort() }
  if (u.origin !== `http://127.0.0.1:${PORT}`) return req.abort()
  req.continue()
})

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Buka rute, tunggu stabil, lalu simpan. `action` boleh memanipulasi halaman sebelum foto. */
/**
 * Layar pembuka web sengaja ditahan 1,6 dtk (peramban) atau 2,6 dtk (mode terpasang) agar salam
 * sempat terbaca, lalu memudar 0,7 dtk. Screenshot yang diambil lebih awal akan menangkapnya
 * sebagai lapisan gelap bertumpuk — jadi tunggu sampai elemennya benar-benar dibuang.
 */
async function waitSplashGone() {
  await page.waitForFunction(() => !document.getElementById('splash'), { timeout: 15000 }).catch(() => {})
}

async function shot(name, path, { action, waitFor, settle = 900 } = {}) {
  // State disetel per navigasi: localStorage hanya bisa ditulis setelah ada origin.
  if (!page.__seeded) {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate((state) => {
      for (const [k, v] of Object.entries(state)) localStorage.setItem(k, v)
    }, STATE)
    page.__seeded = true
  }
  await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await waitSplashGone()
  // Muat ulang tidak memunculkan splash lagi (elemen hanya ada di index.html awal),
  // tetapi onboarding ditampilkan pada rute pertama setiap muat halaman.
  await page.evaluate(() => document.querySelectorAll('.onboarding, [data-onboarding]').forEach((n) => n.remove()))
  await wait(settle)
  if (waitFor) {
    await page.waitForSelector(waitFor, { timeout: 15000 }).catch(() => console.warn(`  (selektornya tidak muncul: ${waitFor})`))
    await wait(600)
  }
  if (action) {
    await action(page)
    await wait(700)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await wait(250)
  const file = join(OUT, name)
  await page.screenshot({ path: file })
  console.log(`✓ ${name}`)
}

// 1 — Beranda: salam, jadwal berikutnya, progres tilawah.
await shot('01-beranda.png', '/', { waitFor: '.hero, .home-hero, main' })

// 2 — Daftar surah.
await shot('02-daftar-surah.png', '/quran', { waitFor: '.surah-card, .surah-item, main' })

// 3 — Mushaf: teks Arab + terjemahan.
await shot('03-mushaf.png', '/surah/1', { waitFor: '.ayah, .ayah-card, main' })

// 4 — Surah lebih panjang (Al-Baqarah) untuk menunjukkan kerapatan teks.
await shot('04-surah-albaqarah.png', '/surah/2', { waitFor: '.ayah, .ayah-card, main' })

// 5 — Doa harian.
await shot('05-doa.png', '/doa', { waitFor: 'main' })

// 6 — Jadwal salat.
await shot('06-jadwal-salat.png', '/salat', { waitFor: '.prayer-list, main' })

/**
 * Penjaga: jam salat harus berurutan dalam satu hari dan masuk akal.
 * Tanpa pemeriksaan ini, screenshot dengan Subuh 20:57 / Magrib 10:50 bisa lolos ke Play Store
 * hanya karena tampilannya rapi — persis bug yang lolos pada versi sebelumnya.
 */
{
  const jam = await page.$$eval('.prayer-list li', (rows) =>
    rows.map((li) => {
      const name = (li.querySelector('span')?.textContent || '').trim()
      const clock = (li.querySelector('b')?.textContent || '').trim()
      const m = /^(\d{2}):(\d{2})$/.exec(clock)
      return { name, clock, minutes: m ? +m[1] * 60 + +m[2] : null }
    })
  )
  console.log('  jam salat:', jam.map((j) => `${j.name} ${j.clock}`).join(' · '))
  if (jam.length < 5) throw new Error(`jadwal salat tidak lengkap (${jam.length} baris)`)
  for (const row of jam) {
    if (row.minutes == null) throw new Error(`jam salat "${row.name}" tidak terbaca: ${row.clock}`)
  }
  // Subuh harus pagi (00:00–08:00) dan Magrib harus sore (15:00–20:00) untuk garis lintang Indonesia.
  const subuh = jam.find((j) => /subuh/i.test(j.name))
  const magrib = jam.find((j) => /magrib/i.test(j.name))
  const zuhur = jam.find((j) => /zuhur/i.test(j.name))
  if (subuh && !(subuh.minutes >= 0 && subuh.minutes <= 8 * 60)) throw new Error(`Subuh ${subuh.clock} tidak masuk akal (zona waktu salah?)`)
  if (magrib && !(magrib.minutes >= 15 * 60 && magrib.minutes <= 20 * 60)) throw new Error(`Magrib ${magrib.clock} tidak masuk akal (zona waktu salah?)`)
  if (zuhur && !(zuhur.minutes >= 10 * 60 && zuhur.minutes <= 14 * 60)) throw new Error(`Zuhur ${zuhur.clock} tidak masuk akal (zona waktu salah?)`)
  // Urutan waktu salat wajib naik dalam satu hari.
  const wajib = ['subuh', 'zuhur', 'asar', 'magrib', 'isya'].map((k) => jam.find((j) => new RegExp(k, 'i').test(j.name)))
  if (wajib.every(Boolean)) {
    for (let i = 1; i < wajib.length; i++) {
      if (wajib[i].minutes <= wajib[i - 1].minutes) {
        throw new Error(`urutan salat tidak naik: ${wajib[i - 1].name} ${wajib[i - 1].clock} → ${wajib[i].name} ${wajib[i].clock}`)
      }
    }
  }
  console.log(`  ✓ jam salat wajar (TZ=${process.env.TZ})`)
}

// 7 — Asmaul Husna.
await shot('07-asmaul-husna.png', '/asmaul-husna', { waitFor: 'main' })

// 8 — Kelola Offline.
await shot('08-offline.png', '/offline', { waitFor: 'main' })

// Play hanya menerima 2–8 screenshot per jenis perangkat. Berhenti di 8 supaya tidak melewati
// batas — sebelumnya skrip ini masih menghasilkan 9. Halaman Infaq dan Pengaturan tidak difoto:
// keduanya bukan fitur utama yang dicari saat memilih aplikasi Al-Qur'an.

await browser.close()
server.close()
console.log(`\nSelesai → ${OUT}`)
console.log('Periksa: 1080×1920, PNG tanpa transparansi, < 8 MB per berkas.')
