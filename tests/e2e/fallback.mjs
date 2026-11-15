// Uji cadangan terakhir: SEMUA API pihak ketiga dimatikan; surah harus tetap terbuka dari data lokal (/data).
// Pakai sama seperti smoke.mjs (butuh `vite preview` di :4173).
import { mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'
const puppeteer = (await import(process.env.PUPPETEER_PATH || 'puppeteer-core')).default
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const SHOTS = process.env.SHOTS_DIR || 'store/screenshots'
mkdirSync(SHOTS, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: 'shell', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.setRequestInterception(true)
page.on('request', (r) => (new URL(r.url()).origin === new URL(BASE).origin && !new URL(r.url()).pathname.startsWith('/api/') ? r.continue() : r.abort()))
try {
  await page.goto(`${BASE}/#/quran`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.surah-item, .surah-card, [href="#/surah/114"]', { timeout: 60000 })
  assert.equal(await page.$$eval('a[href^="#/surah/"]', (a) => new Set(a.map((x) => x.getAttribute('href'))).size), 114)
  console.log('✓ Daftar 114 surah dari data lokal saat semua API mati')
  await page.goto(`${BASE}/#/surah/36`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.source-note', { timeout: 60000 })
  const note = await page.$eval('.source-note', (e) => e.textContent)
  assert.match(note, /Data lokal QuranKu/)
  assert.equal((await page.$$('.mushaf-flow .ayah')).length, 83)
  console.log('✓ Surah Ya-Sin (83 ayat) terbuka dari data lokal, ditandai sebagai sumber cadangan')
  await page.goto(`${BASE}/#/sumber`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.source-group')
  assert.ok((await page.$$('.source-item')).length >= 12)
  await page.screenshot({ path: `${SHOTS}/12-tentang-sumber-data.png`, fullPage: true })
  console.log('✓ Halaman Tentang menampilkan daftar sumber data')
  assert.deepEqual(errors, [])
  console.log('✓ Tidak ada error JavaScript')
} catch (e) {
  console.log('✗', e.message)
  await page.screenshot({ path: '/tmp/fallback-fail.png' })
  process.exitCode = 1
}
await browser.close()
