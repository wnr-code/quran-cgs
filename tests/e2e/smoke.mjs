// Uji asap end-to-end (opsional). Menjalankan build produksi di Chromium headless dengan API yang
// di-MOCK dari paket `quran-json` (hanya untuk pengujian; aplikasi nyata memakai EQuran.id).
// Pakai: npm run build && npx vite preview --port 4173 &  lalu  node tests/e2e/smoke.mjs
// Butuh: puppeteer-core + Chromium (set CHROME_PATH), tidak termasuk devDependencies proyek.
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const puppeteer = (await import(process.env.PUPPETEER_PATH || 'puppeteer-core')).default

const BASE = process.env.BASE_URL || 'http://localhost:4173'
const SHOTS = process.env.SHOTS_DIR || 'store/screenshots'
mkdirSync(SHOTS, { recursive: true })
const meta = require('../../src/data/quran-meta.json')
const chapters = require('quran-json/dist/quran_id.json')

const summary = (c) => ({ nomor: c.id, nama: c.name, namaLatin: c.transliteration, jumlahAyat: c.total_verses, tempatTurun: c.type === 'meccan' ? 'Mekah' : 'Madinah', arti: c.translation, deskripsi: 'Deskripsi <i>uji</i>.', audioFull: { '05': `https://audio.test/full/${c.id}.mp3` } })
const BISM = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ '
const detail = (c) => ({ ...summary(c), ayat: c.verses.map((v) => ({ nomorAyat: v.id, teksArab: v.text, teksLatin: v.transliteration, teksIndonesia: v.translation, audio: { '05': `https://audio.test/a/${c.id}/${v.id}.mp3` } })) })
const ok = (data) => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ code: 200, message: 'ok', data }) })

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: 'shell', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] })
const page = await browser.newPage()
await page.emulateTimezone('Asia/Jakarta')
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text()))
let apiDown = false
await page.setRequestInterception(true)
page.on('request', (req) => {
  const u = new URL(req.url())
  if (u.origin === new URL(BASE).origin) return req.continue()
  if (apiDown) return req.abort()
  let m
  if (u.hostname === 'equran.id') {
    if (u.pathname === '/api/v2/surat') return req.respond(ok(chapters.map(summary)))
    if ((m = /^\/api\/v2\/surat\/(\d+)$/.exec(u.pathname))) return req.respond(ok(detail(chapters[m[1] - 1])))
    if ((m = /^\/api\/v2\/tafsir\/(\d+)$/.exec(u.pathname))) return req.respond(ok({ nomor: +m[1], namaLatin: chapters[m[1] - 1].transliteration, tafsir: chapters[m[1] - 1].verses.map((v) => ({ ayat: v.id, teks: `[TEKS UJI] tafsir ayat ${v.id}` })) }))
  }
  return req.abort()
})
const go = async (hash) => {
  await page.evaluate((h) => (location.hash = h), hash)
  await new Promise((r) => setTimeout(r, 700))
}
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const count = (sel) => page.$$eval(sel, (e) => e.length)
const text = (sel) => page.$eval(sel, (e) => e.textContent.trim())
const step = async (name, fn) => {
  try {
    await fn()
    console.log('✓', name)
  } catch (e) {
    console.log('✗', name, '\n   ', e.message.split('\n')[0])
    process.exitCode = 1
  }
}

await page.goto(BASE + '/', { waitUntil: 'networkidle0' })
await step('Beranda tampil', async () => {
  await page.waitForSelector('.home-hero')
  assert.match(await text('.salam'), /Assalamu/)
  await page.waitForSelector('.ayah-day-ar')
  await shot('01-beranda')
})
await step('114 surah tampil + nomor Arab-Indic', async () => {
  await go('/quran')
  await page.waitForSelector('.surah-row')
  assert.equal(await count('.surah-row'), 114)
  assert.equal(await text('.surah-row:nth-child(114) .num-star'), '١١٤')
  await shot('02-daftar-surah')
  await page.click('[data-tab="juz"]')
  assert.equal(await count('.surah-row'), 30)
})
await step('Jumlah ayat tiap surah benar (114 surah, 6236 ayat) lewat adapter', async () => {
  let total = 0
  for (const c of chapters) {
    assert.equal(c.total_verses, meta.ayahCounts[c.id - 1])
    total += c.total_verses
  }
  assert.equal(total, 6236)
})
await step('Reader: Mushaf Continuous, basmalah, penanda ayat ﴿١﴾', async () => {
  await go('/surah/2')
  await page.waitForSelector('.mushaf-flow .ayah')
  assert.equal(await count('.mushaf-flow .ayah'), 286)
  assert.equal(await text('.ayah[data-a="1"] .ayah-num'), '\uFD3F١\uFD3E')
  assert.equal(await text('.ayah[data-a="286"] .ayah-num'), '\uFD3F٢٨٦\uFD3E')
  assert.equal(await count('.basmalah'), 1)
  assert.equal(await page.$eval('.mushaf-flow', (e) => getComputedStyle(e).direction), 'rtl')
  assert.ok(await page.evaluate(() => document.fonts.check('30px "Amiri Quran"')), 'font Amiri Quran termuat')
  await shot('03-mushaf-continuous')
})
await step('At-Taubah tanpa basmalah; Al-Fatihah tanpa basmalah terpisah', async () => {
  await go('/surah/9')
  await page.waitForSelector('.mushaf-flow .ayah')
  assert.equal(await count('.basmalah'), 0)
  await go('/surah/1')
  await page.waitForSelector('.mushaf-flow .ayah')
  assert.equal(await count('.basmalah'), 0)
  assert.equal(await count('.mushaf-flow .ayah'), 7)
})
await step('Ayah Focus Mode + Dark Reading + ukuran font', async () => {
  await go('/surah/36')
  await page.waitForSelector('.mushaf-flow .ayah')
  await page.click('.rd-top [data-act="mode"]')
  await page.waitForSelector('.mushaf-focus .ayah-block')
  assert.equal(await count('.ayah-block'), 83)
  await shot('04-ayah-focus')
  await page.click('.rd-top [data-act="settings"]')
  await page.waitForSelector('.sheet-wrap.open')
  await new Promise((r) => setTimeout(r, 300))
  await shot('05-pengaturan-baca')
  await page.click('.preset-dark')
  assert.equal(await page.$eval('.reader', (e) => e.dataset.preset), 'dark')
  await page.$eval('input[name=fontSize]', (e) => {
    e.value = 40
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
  assert.equal(await page.$eval('.ayah-block .ayah-ar', (e) => getComputedStyle(e).fontSize), '40px')
  await page.click('.sheet [data-close]')
  await new Promise((r) => setTimeout(r, 350))
  await shot('06-dark-reading')
  await page.click('.rd-top [data-act="mode"]')
  await page.waitForSelector('.mushaf-flow .ayah')
})
await step('Mode membaca imersif menyembunyikan navigasi', async () => {
  await page.click('.rd-top [data-act="immersive"]')
  await new Promise((r) => setTimeout(r, 400))
  assert.equal(await page.$eval('.navbar', (e) => getComputedStyle(e).display), 'none')
  await shot('07-mode-membaca')
})
await step('Bookmark + posisi bacaan tersimpan & dipulihkan', async () => {
  await page.evaluate(() => document.querySelector('.ayah[data-a="40"]').scrollIntoView({ block: 'start' }))
  await page.evaluate(() => window.scrollBy(0, -80))
  await new Promise((r) => setTimeout(r, 1200))
  const cur = await page.evaluate(() => JSON.parse(localStorage.getItem('quranku:lastRead')))
  assert.equal(cur.surah, 36)
  assert.ok(Math.abs(cur.ayah - 40) <= 1, 'ayat terakhir ≈ 40, dapat ' + cur.ayah)
  await page.evaluate(() => window.scrollBy(0, -30))
  await new Promise((r) => setTimeout(r, 300))
  await page.click('.rd-bottom [data-act="bookmark"]')
  await new Promise((r) => setTimeout(r, 400))
  await page.reload({ waitUntil: 'networkidle0' })
  await go('/')
  await page.waitForSelector('.continue a[href*="resume=1"]')
  assert.match(await text('.continue h2'), /Ya/)
  await page.click('.continue a[href*="resume=1"]')
  await page.waitForSelector('.mushaf-flow .ayah')
  await new Promise((r) => setTimeout(r, 900))
  const top = await page.$eval(`.ayah[data-a="${cur.ayah}"]`, (e) => e.getBoundingClientRect().top)
  assert.ok(top > -60 && top < 500, 'ayat terakhir terlihat setelah dipulihkan, top=' + top)
  await go('/bookmark')
  await page.waitForSelector('.row-link')
  assert.equal(await count('.row-link'), 1)
  await shot('08-bookmark')
})
await step('Angka Latin opsional; referensi internal tetap Latin', async () => {
  await go('/pengaturan')
  await page.click('[data-seg="numerals"] [data-v="latin"]')
  await go('/surah/112')
  await page.waitForSelector('.mushaf-flow .ayah')
  assert.equal(await text('.ayah[data-a="4"] .ayah-num'), '4')
  assert.match(page.url(), /#\/surah\/112$/)
  await go('/pengaturan')
  await page.click('[data-seg="numerals"] [data-v="arabic"]')
})
await step('Tafsir tampil', async () => {
  await go('/tafsir/1')
  await page.waitForSelector('.tafsir-item')
  assert.equal(await count('.tafsir-item'), 7)
})
await step('Pencarian: 2:255, juz 30, kata terjemahan', async () => {
  await go('/cari')
  await page.type('.search-box input', '2:255')
  await page.waitForSelector('a[href="#/surah/2/255"]')
  await page.$eval('.search-box input', (e) => (e.value = ''))
  await page.type('.search-box input', 'juz 30')
  await page.waitForSelector('a[href="#/surah/78/1"]')
  await page.$eval('.search-box input', (e) => (e.value = ''))
  await page.type('.search-box input', 'sapi betina')
  await page.waitForSelector('.hit')
})
await step('Halaman fitur lain terbuka tanpa error', async () => {
  for (const [h, sel] of [['/murottal', '.audio-row'], ['/salat', '.loc-picker'], ['/kalender', '.cal-grid'], ['/asmaul-husna', '.asma'], ['/doa', '.doa'], ['/tasbih', '.tasbih-btn'], ['/kiblat', '.loc-picker'], ['/target', '.chart'], ['/offline', '[data-start]'], ['/infaq', '.infaq-hero'], ['/lainnya', '.menu-item'], ['/tentang', '.about-hero']]) {
    await go(h)
    await page.waitForSelector(sel, { timeout: 5000 }).catch(() => {
      throw new Error('gagal: ' + h)
    })
  }
  assert.equal(await count('.asma'), 0) // sudah pindah halaman
  await go('/asmaul-husna')
  assert.equal(await count('.asma'), 99)
  await go('/salat')
  await page.select('[data-loc-city]', '17')
  await page.waitForSelector('.prayer-list li')
  assert.equal(await count('.prayer-list li'), 7)
  await shot('09-jadwal-salat')
  await go('/kiblat')
  await page.waitForSelector('.compass')
  const deg = parseFloat(await text('.qibla-card h2'))
  assert.ok(deg > 293 && deg < 297, 'kiblat Kuningan ≈ 295°, dapat ' + deg)
  await go('/tasbih')
  await page.click('.tasbih-btn')
  assert.equal(await text('[data-count]'), '١')
  await go('/infaq')
  await shot('10-infaq')
})
await step('Service Worker aktif & aplikasi berjalan OFFLINE (API mati)', async () => {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await new Promise((r) => setTimeout(r, 1500))
  // Halaman baru TANPA intersepsi permintaan (intersepsi Puppeteer melewati Service Worker).
  const p2 = await browser.newPage()
  await p2.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  p2.on('pageerror', (e) => errors.push(String(e)))
  await p2.setOfflineMode(true)
  await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await p2.waitForSelector('.home-hero', { timeout: 8000 })
  const nav = async (h, sel) => {
    await p2.evaluate((x) => (location.hash = x), h)
    await p2.waitForSelector(sel, { timeout: 8000 })
  }
  await nav('/quran', '.surah-row')
  assert.equal(await p2.$$eval('.surah-row', (e) => e.length), 114)
  await nav('/surah/36', '.mushaf-flow .ayah')
  assert.equal(await p2.$$eval('.mushaf-flow .ayah', (e) => e.length), 83)
  await nav('/surah/50', '.state-error') // belum tersimpan → error state, bukan crash
  await nav('/kalender', '.cal-grid') // chunk lazy dari precache
  await nav('/bookmark', '.row-link')
  await p2.screenshot({ path: `${SHOTS}/11-offline.png` })
  await p2.close()
})
await step('Tidak ada error JavaScript', async () => {
  assert.deepEqual(errors, [])
})
await browser.close()
