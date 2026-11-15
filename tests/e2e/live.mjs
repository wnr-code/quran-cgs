// Uji end-to-end terhadap build produksi dengan API SUNGGUHAN (tanpa mock). Butuh internet + puppeteer.
// Dijalankan oleh workflow "Live API test".
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
const puppeteer = (await import(process.env.PUPPETEER_PATH || 'puppeteer')).default
const BASE = process.env.BASE_URL || 'http://localhost:4173'
const SHOTS = process.env.SHOTS_DIR || 'live-shots'
mkdirSync(SHOTS, { recursive: true })
const gh = !!process.env.GITHUB_ACTIONS
let failed = 0
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'] })
const page = await browser.newPage()
await page.emulateTimezone('Asia/Jakarta')
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const step = async (name, fn) => {
  let line
  try {
    const info = await fn()
    line = `✓ ${name}${info ? ' — ' + info : ''}`
    if (gh) console.log(`::notice::${line}`)
  } catch (e) {
    failed++
    line = `✗ ${name} — ${String(e.message).replace(/\s+/g, ' ').slice(0, 300)}`
    if (gh) console.log(`::error::${line}`)
    await page.screenshot({ path: `${SHOTS}/gagal-${failed}.png` }).catch(() => {})
  }
  console.log(line)
}
const go = (hash) => page.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded' })
const T = { timeout: 45000 }

await step('Daftar 114 surah dari API sungguhan', async () => {
  await go('/quran')
  await page.waitForSelector('a[href="#/surah/114"]', T)
  assert.equal(await page.$$eval('a[href^="#/surah/"]', (a) => new Set(a.map((x) => x.getAttribute('href'))).size), 114)
})
await step('Al-Baqarah: 286 ayat dari sumber utama (bukan cadangan), satu basmalah', async () => {
  await go('/surah/2')
  await page.waitForSelector('.mushaf-flow .ayah', T)
  assert.equal((await page.$$('.mushaf-flow .ayah')).length, 286)
  assert.equal(await page.$('.source-note'), null, 'memakai sumber cadangan: ' + (await page.$eval('.source-note', (e) => e.textContent).catch(() => '')))
  await page.screenshot({ path: `${SHOTS}/03-mushaf-continuous.png` })
  return await page.$eval('.ayah[data-a="1"]', (e) => e.textContent.trim().slice(0, 30))
})
await step('Tafsir sungguhan tampil', async () => {
  await go('/tafsir/1')
  await page.waitForSelector('.source-card', T)
  const len = await page.$eval('#view', (e) => e.textContent.length)
  assert.ok(len > 1500, 'isi tafsir terlalu pendek: ' + len)
})
await step('Doa sehari-hari tampil dari API EQuran', async () => {
  await go('/doa')
  await page.waitForSelector('[data-tab="harian"]', T)
  await page.click('[data-tab="harian"]')
  await new Promise((r) => setTimeout(r, 800))
  await page.waitForSelector('[data-copy], [data-retry]', T)
  await page.screenshot({ path: `${SHOTS}/doa.png` })
  assert.equal(await page.$('[data-retry]'), null, 'halaman doa menampilkan keadaan "tidak tersedia"')
  const n = (await page.$$('[data-copy]')).length
  assert.ok(n > 100, 'jumlah doa: ' + n)
  return `${n} doa; pertama: ${await page.$eval('details.doa strong', (e) => e.textContent.slice(0, 50))}`
})
await step('Murottal: audio surah benar-benar berputar', async () => {
  await go('/murottal')
  await page.waitForSelector('[data-play]', T)
  await page.$$eval('[data-play]', (b) => b[b.length - 1].click()) // surah terakhir (pendek)
  await page.waitForFunction(() => [...document.querySelectorAll('[data-cur]')].some((e) => /[1-9]/.test(e.textContent)), T)
  await page.screenshot({ path: `${SHOTS}/murottal.png` })
  const t = await page.$eval('[data-cur]', (e) => e.textContent)
  await page.$$eval('#mini-player [data-act]', (b) => b[0] && b[0].click())
  return 'posisi ' + t
})
await step('Unduh audio manual tersimpan di Cache Storage', async () => {
  await page.$$eval('[data-dl]', (b) => b[b.length - 1].click())
  await page.waitForFunction(async () => (await (await caches.open('quranku-audio-v1')).keys()).length > 0, T)
  return await page.evaluate(async () => (await (await caches.open('quranku-audio-v1')).keys())[0].url)
})
await step('Audio yang diunduh berputar saat OFFLINE (lewat Service Worker)', async () => {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-play]', T)
  assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'halaman belum dikendalikan service worker')
  await page.setOfflineMode(true)
  try {
    await page.$$eval('[data-play]', (b) => b[b.length - 1].click())
    await page.waitForFunction(() => [...document.querySelectorAll('[data-cur]')].some((e) => /[1-9]/.test(e.textContent)), T)
  } finally {
    await page.setOfflineMode(false)
  }
  return 'posisi ' + (await page.$eval('[data-cur]', (e) => e.textContent))
})
await step('Audio per ayat berputar dari halaman baca', async () => {
  await go('/surah/112')
  await page.waitForSelector('.mushaf-flow .ayah', T)
  await page.$eval('.rd-play', (b) => b.click())
  await page.waitForSelector('.ayah.playing', T)
  await page.waitForFunction(() => !document.querySelector('#mini-player').hidden, T)
})
await step('Murottal qari tambahan (mp3quran.net): surah penuh benar-benar berputar', async () => {
  await go('/murottal')
  await page.waitForSelector('[data-play]', T)
  const reqs = []
  page.on('request', (r) => /mp3quran\.net/.test(r.url()) && reqs.push(r.url()))
  await page.select('[data-qari]', 'x-mahir-al-muaiqly')
  await page.$$eval('[data-play]', (b) => b[b.length - 1].click())
  await page.waitForFunction(() => /Mahir/.test(document.querySelector('[data-np]').textContent) && [...document.querySelectorAll('[data-cur]')].some((e) => /[1-9]/.test(e.textContent)), T)
  assert.ok(reqs.some((u) => u.endsWith('/maher/114.mp3')), 'alamat audio: ' + reqs.join(','))
  const out = `posisi ${await page.$eval('[data-cur]', (e) => e.textContent)} dari ${reqs[0]}`
  await page.$$eval('#mini-player [data-act]', (b) => b[0] && b[0].click())
  return out
})
await step('Tidak ada error JavaScript', async () => assert.deepEqual(errors, []))
await browser.close()
process.exit(failed ? 1 : 0)
