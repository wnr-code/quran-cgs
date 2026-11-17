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
const openReaderMenu = async () => {
  await waitForSplashToClear()
  const open = await page.$eval('.reader-fab-panel', (el) => !el.hidden).catch(() => false)
  if (!open) {
    await page.click('.reader-fab-toggle')
    await page.waitForFunction(() => {
      const panel = document.querySelector('.reader-fab-panel')
      return panel && !panel.hidden && panel.getBoundingClientRect().height > 0
    })
  }
}
const readerMode = async (mode) => {
  await openReaderMenu()
  const selector = `.reader-fab-panel .rd-tabs [data-mode="${mode}"]`
  await page.waitForSelector(selector, { visible: true })
  await page.click(selector)
}
const readerAction = async (action) => {
  await openReaderMenu()
  const selector = `.reader-fab-panel [data-act="${action}"]`
  await page.waitForSelector(selector, { visible: true })
  await page.click(selector)
}
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` })
const count = (sel) => page.$$eval(sel, (e) => e.length)
const text = (sel) => page.$eval(sel, (e) => e.textContent.trim())
const waitForSplashToClear = () => page.waitForFunction(() => {
  const splash = document.querySelector('#splash')
  return !splash || getComputedStyle(splash).visibility === 'hidden'
})
const step = async (name, fn) => {
  try {
    await fn()
    console.log('✓', name)
  } catch (e) {
    console.log('✗', name, '\n   ', e.stack || e.message)
    process.exitCode = 1
  }
}

await page.goto(BASE + '/', { waitUntil: 'networkidle0' })
await step('Pengenalan pertama: navigasi, tombol kembali, dan lewati', async () => {
  await page.waitForSelector('.onboarding-dialog')
  assert.equal(await page.$eval('.onboarding-dialog', (e) => e.getAttribute('aria-modal')), 'true')
  assert.match(await text('.onboarding-step'), /01\s*\/\s*03/)
  await page.click('[data-onboarding-next]')
  assert.match(await text('.onboarding-step'), /02\s*\/\s*03/)
  assert.equal(await page.$eval('.onboarding-dialog', (e) => e.querySelector('#onboarding-title').textContent), 'Waktu salat sesuai lokasi.')
  await page.click('[data-onboarding-back]')
  assert.match(await text('.onboarding-step'), /01\s*\/\s*03/)
  await page.click('[data-onboarding-finish]')
  await page.waitForSelector('.onboarding-dialog', { hidden: true })
  assert.equal(await page.evaluate(() => localStorage.getItem('quranku:onboarding:completed:v1')), '1')
})
await step('Beranda tampil', async () => {
  await page.waitForSelector('.home-hero')
  assert.match((await text('.salam')).normalize('NFC'), new RegExp('اَلسَّلَامُ عَلَيْكُمْ'.normalize('NFC')))
  assert.equal(await page.$eval('.salam', (e) => e.getAttribute('aria-label')), 'Assalamu’alaikum')
  // Ikon ucapan sesuai waktu (font ikon) dan penyemangat kecil berujukan ayat.
  assert.match(await page.$eval('.greet-ic', (e) => e.className), /fi-(sunrise|sun|cloud-sun|moon)/)
  assert.match(await text('.greet'), /^Selamat (pagi|siang|sore|malam)/)
  assert.match(await text('.mutiara small'), /^QS\. /)
  assert.match(await page.$eval('.mutiara', (a) => a.getAttribute('href')), /^#\/surah\/\d+\/\d+$/)
  await page.waitForSelector('.ayah-day-ar')
  await shot('01-beranda')
})
await step('114 surah tampil + nomor Arab-Indic', async () => {
  await go('/quran')
  await page.waitForSelector('.surah-row')
  assert.equal(await count('.surah-row'), 114)
  assert.equal(await text('.surah-row:nth-child(114) .num-star'), '١١٤')
  assert.equal(await count('.popular-surah-card'), 5)
  const popularIds = await page.$$eval('.popular-surah-card', (cards) => cards.map((card) => Number(card.dataset.surah)))
  assert.equal(new Set(popularIds).size, 5)
  for (const id of [36, 56, 67]) assert.ok(popularIds.includes(id), `surah populer ${id} tersedia`)
  await shot('02-daftar-surah')
  await page.click('[data-tab="juz"]')
  assert.equal(await count('.surah-row'), 30)
  assert.equal(await page.$eval('[data-popular]', (el) => el.hidden), true)
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
  const openingFrames = await page.evaluate(() => ({
    bismillahRadius: getComputedStyle(document.querySelector('.rd-wrap > .basmalah-cartouche')).borderRadius,
    surahRadius: getComputedStyle(document.querySelector('.surah-frame')).borderRadius,
    bismillahOutline: getComputedStyle(document.querySelector('.rd-wrap > .basmalah-cartouche')).outlineStyle,
    surahOutline: getComputedStyle(document.querySelector('.surah-frame')).outlineStyle,
  }))
  assert.notEqual(openingFrames.bismillahRadius, openingFrames.surahRadius, 'bingkai basmalah berbeda dari bingkai pembuka surah')
  assert.notEqual(openingFrames.bismillahOutline, openingFrames.surahOutline)
  assert.equal(await page.$eval('.mushaf-flow', (e) => getComputedStyle(e).direction), 'rtl')
  assert.equal(await page.$eval('.mushaf-flow .ayah-text', (e) => getComputedStyle(e).fontSize), '32px')
  assert.ok(await page.evaluate(async () => {
    await document.fonts.load('30px "Amiri Quran"', 'بِسْمِ اللَّهِ')
    return document.fonts.check('30px "Amiri Quran"', 'بِسْمِ اللَّهِ')
  }), 'font Amiri Quran dapat dimuat saat dipilih')
  await shot('03-mushaf-continuous')
})
await step('Tajwid: data Hafs dimuat saat diminta, panduan atribusi tampil, dan dapat dimatikan', async () => {
  await readerAction('tajweed')
  await page.waitForSelector('.mushaf-flow .tajweed')
  assert.ok(await count('.mushaf-flow .tajweed') > 0)
  await readerAction('tajweed-guide')
  await page.waitForSelector('.sheet-wrap.open a[href*="creativecommons.org/licenses/by/4.0"]')
  const guide = await text('.sheet-wrap.open')
  assert.match(guide, /quran-tajweed/)
  assert.match(guide, /12:39 dan 12:41/)
  const tajweedLabel = await page.$eval('.mushaf-flow .tajweed', (e) => e.dataset.ruleLabel)
  assert.ok(tajweedLabel)
  await page.$eval('.sheet-wrap button[data-close]', (b) => b.click())
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'))
  await page.$eval('.mushaf-flow .tajweed', (e) => e.click())
  await page.waitForFunction((label) => document.querySelector('#toast')?.textContent === label, {}, tajweedLabel)
  await readerAction('tajweed')
  await page.waitForFunction(() => document.querySelectorAll('.mushaf-flow .tajweed').length === 0)
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
  await readerMode('focus')
  await page.waitForSelector('.mushaf-focus .ayah-block')
  assert.equal(await count('.ayah-block'), 83)
  await shot('04-ayah-focus')
  await readerAction('settings')
  await page.waitForSelector('.sheet-wrap.open')
  await new Promise((r) => setTimeout(r, 300))
  await shot('05-pengaturan-baca')
  assert.equal(await page.$eval('.ayah-block .ayah-ar', (e) => getComputedStyle(e).fontSize), '32px')
  assert.equal(await page.$eval('.ayah-block .ayah-id', (e) => getComputedStyle(e).fontSize), '18px')
  await page.click('.preset-dark')
  assert.equal(await page.$eval('.reader', (e) => e.dataset.preset), 'dark')
  await page.$eval('input[name=fontSize]', (e) => {
    e.value = e.max
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
  assert.equal(await page.$eval('.ayah-block .ayah-ar', (e) => getComputedStyle(e).fontSize), '56px')
  const themeBefore = await page.$eval(':root', (e) => e.dataset.theme)
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  assert.equal(await page.$eval('.ayah-block .ayah-ar', (e) => getComputedStyle(e).fontSize), '56px')
  await page.evaluate((theme) => { document.documentElement.dataset.theme = theme }, themeBefore)
  await page.click('.sheet [data-close]')
  await new Promise((r) => setTimeout(r, 350))
  await shot('06-dark-reading')
  await readerMode('continuous')
  await page.waitForSelector('.mushaf-flow .ayah')
  assert.equal(await page.$eval('.mushaf-flow .ayah-text', (e) => getComputedStyle(e).fontSize), '56px')
})
await step('Kontrol tidak auto-hide, panel dapat ditutup, dan mushaf berbingkai', async () => {
  await readerMode('continuous')
  await page.waitForSelector('.mushaf-flow')
  await page.evaluate(() => window.scrollTo({ top: 240, behavior: 'instant' }))
  await new Promise((r) => setTimeout(r, 3200))
  assert.equal(await page.$eval('.reader', (el) => el.classList.contains('bars-hidden')), false)
  assert.equal(await page.$eval('.rd-top', (el) => getComputedStyle(el).visibility), 'visible')
  assert.equal(await page.$eval('.rd-top', (el) => getComputedStyle(el).opacity), '1')
  const flowFrame = await page.$eval('.mushaf-flow', (el) => ({
    border: getComputedStyle(el).borderTopWidth,
    ornament: getComputedStyle(el, '::before').content
  }))
  assert.equal(flowFrame.border, '1px')
  assert.match(flowFrame.ornament, /۞/)
  await openReaderMenu()
  assert.equal(await page.$eval('.reader-fab-panel', (el) => el.hidden), false)
  await page.click('.reader-fab-close')
  await page.waitForFunction(() => document.querySelector('.reader-fab-panel')?.hidden)
  await readerMode('page')
  assert.equal(await page.$eval('.mushaf-pages', (el) => getComputedStyle(el).borderTopWidth), '1px')
  await readerMode('focus')
  assert.equal(await page.$eval('.mushaf-focus', (el) => getComputedStyle(el).borderTopWidth), '1px')
  await readerMode('continuous')
})
await step('Lembar ayat: tafsir dan catatan tersedia tanpa meninggalkan bacaan', async () => {
  await page.$eval('.mushaf-flow .ayah[data-a="1"] .ayah-num', (el) => el.click())
  await page.waitForSelector('.sheet-wrap.open .ayah-sheet-actions')
  assert.equal(await page.$eval('.sheet-wrap.open .ayah-sheet-tafsir', (el) => el.hidden), true)
  await page.click('.sheet-wrap.open [data-act="tafsir"]')
  await page.waitForSelector('.sheet-wrap.open .ayah-sheet-tafsir-copy')
  assert.match(await text('.sheet-wrap.open .ayah-sheet-tafsir-copy'), /\[TEKS UJI\] tafsir ayat 1/)
  assert.match(await text('.sheet-wrap.open .ayah-sheet-tafsir-source'), /Tafsir Kementerian Agama RI/)
  assert.equal(await page.$eval('.sheet-wrap.open [data-act="tafsir"]', (el) => el.getAttribute('aria-expanded')), 'true')
  assert.equal(await page.$eval('.sheet-wrap.open .ayah-sheet-notes', (el) => el.open), false)
  await page.click('.sheet-wrap.open .ayah-sheet-notes > summary')
  await page.waitForFunction(() => document.querySelector('.ayah-sheet-notes')?.open)
  await page.click('.sheet-wrap.open .sheet-head [data-close]')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'))
})
await step('Mode membaca imersif menyembunyikan navigasi', async () => {
  await readerAction('immersive')
  await new Promise((r) => setTimeout(r, 400))
  assert.equal(await page.$eval('.navbar', (e) => getComputedStyle(e).display), 'none')
  assert.equal(await page.evaluate(() => !!document.querySelector('.rd-bottom')), false, 'tidak ada bilah navigasi bawah tetap')
  const controlsSeparated = await page.evaluate(() => {
    const audio = document.querySelector('.reader-audio-float').getBoundingClientRect()
    const menu = document.querySelector('.reader-float').getBoundingClientRect()
    return audio.right <= menu.left || menu.right <= audio.left || audio.bottom <= menu.top || menu.bottom <= audio.top
  })
  assert.equal(controlsSeparated, true, 'pemutar audio tidak menimpa kontrol baca')
  await page.click('.reader-audio-toggle')
  await page.waitForFunction(() => document.querySelector('.reader').classList.contains('audio-dock-hidden'))
  assert.equal(await page.$eval('.reader-audio-toggle', (e) => e.getAttribute('aria-label')), 'Tampilkan pemutar audio')
  assert.equal(await page.$eval('.reader-audio-dock', (e) => getComputedStyle(e).visibility), 'hidden')
  await page.click('.reader-audio-toggle')
  await page.waitForFunction(() => !document.querySelector('.reader').classList.contains('audio-dock-hidden'))
  await shot('07-mode-membaca')
})
await step('Bookmark + posisi bacaan tersimpan & dipulihkan', async () => {
  await page.evaluate(() => document.querySelector('.ayah[data-a="40"]').scrollIntoView({ block: 'start', behavior: 'instant' }))
  await page.evaluate(() => window.scrollBy(0, -80))
  await new Promise((r) => setTimeout(r, 1200))
  const cur = await page.evaluate(() => JSON.parse(localStorage.getItem('quranku:lastRead')))
  assert.equal(cur.surah, 36)
  assert.ok(Math.abs(cur.ayah - 40) <= 1, 'ayat terakhir ≈ 40, dapat ' + cur.ayah)
  await page.evaluate(() => window.scrollBy(0, -30))
  await new Promise((r) => setTimeout(r, 300))
  await readerAction('bookmark')
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
await step('Tema Ramadan: pilihan tersimpan dan lentera beranimasi', async () => {
  await go('/pengaturan')
  await page.waitForSelector('[data-seg="theme"] [data-v="ramadan"]')
  await page.click('[data-seg="theme"] [data-v="ramadan"]')
  assert.equal(await page.$eval('[data-seg="theme"] [data-v="ramadan"]', (b) => b.getAttribute('aria-pressed')), 'true')
  assert.equal(await page.$eval(':root', (e) => e.dataset.theme), 'ramadan')
  const lamp = await page.$eval('.page-head .ramadan-lantern--one', (e) => ({ visible: getComputedStyle(e.parentElement).display !== 'none', animation: getComputedStyle(e).animationName }))
  assert.equal(lamp.visible, true)
  assert.equal(lamp.animation, 'ramadan-lantern-sway')
  await page.click('[data-seg="theme"] [data-v="auto"]')
  await page.waitForFunction(() => document.documentElement.dataset.theme !== 'ramadan')
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
  for (const [h, sel] of [['/murottal', '.audio-row'], ['/salat', '.loc-picker'], ['/kalender', '.cal-grid'], ['/asmaul-husna', '.asma'], ['/doa', '.cat-card'], ['/tasbih', '.tasbih-btn'], ['/kiblat', '.loc-picker'], ['/target', '.chart'], ['/offline', '[data-start]'], ['/infaq', '.infaq-hero'], ['/lainnya', '.menu-item'], ['/tentang', '.about-hero']]) {
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
  const deg = parseFloat(await text('.qibla-stats b'))
  assert.ok(deg > 293 && deg < 297, 'kiblat Kuningan ≈ 295°, dapat ' + deg)
  await go('/tasbih')
  await page.click('.tasbih-btn')
  assert.equal(await text('[data-count]'), '١')
  await go('/infaq')
  await shot('10-infaq')
})
await step('Tentang: tombol privasi berseberangan dan tidak ada gulir mendatar di layar kecil', async () => {
  await page.setViewport({ width: 320, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  try {
    await go('/tentang')
    await page.waitForSelector('.about-privacy-actions .btn')
    const edges = await page.$eval('.about-privacy-actions', (row) => {
      const buttons = row.querySelectorAll('.btn')
      const a = buttons[0].getBoundingClientRect()
      const b = buttons[1].getBoundingClientRect()
      const r = row.getBoundingClientRect()
      return { left: a.left - r.left, right: r.right - b.right }
    })
    assert.ok(edges.left < 2, `tombol kiri sejajar tepi: ${edges.left}`)
    assert.ok(edges.right < 2, `tombol kanan sejajar tepi: ${edges.right}`)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
    assert.match(await page.$eval('.about-privacy-actions a[target="_blank"]', (a) => a.rel), /noreferrer/)
  } finally {
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  }
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
await step('Ayat pilihan: bagikan sebagai teks atau PNG; salin adalah tindakan terpisah', async () => {
  await go('/')
  await page.waitForSelector('.ayah-day-ar')
  const before = await text('.ayah-day .link')
  assert.equal(await count('.ayah-day [data-ayah-play]'), 1)
  assert.equal(await count('.ayah-day [data-ayah-share]'), 1)
  assert.equal(await page.$eval('.ayah-day [data-ayah-copy]', (b) => b.textContent.trim()), 'Salin')
  await page.evaluate(() => {
    window.__shareCalls = []
    window.__copied = ''
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload) => window.__shareCalls.push(payload) })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: (payload) => !!payload.files?.length })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { window.__copied = value } } })
  })
  await page.$eval('[data-ayah-share]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open .share-grid')
  const hrefs = await page.$$eval('.sheet-wrap.open .share-opt[data-net]', (a) => a.map((x) => x.href))
  assert.equal(hrefs.length, 4)
  assert.match(hrefs[0], /^https:\/\/wa\.me\//)
  assert.ok(decodeURIComponent(hrefs[0]).includes('QS. '))
  assert.ok(decodeURIComponent(hrefs[0]).includes('quran.cgs.my.id/#/surah/'))
  assert.equal(await page.evaluate(() => window.__shareCalls.length), 0, 'Bagikan menampilkan pilihan, bukan langsung membuka share native')
  assert.equal(await page.evaluate(() => window.__copied), '', 'Bagikan tidak menyalin diam-diam')
  await page.$eval('.sheet-wrap.open [data-native]', (b) => b.click())
  await page.waitForFunction(() => window.__shareCalls.length === 1)
  const shared = await page.evaluate(() => window.__shareCalls[0])
  assert.ok(shared.title.startsWith('QS. '))
  assert.ok(shared.url.includes('#/surah/'))
  assert.equal(await page.evaluate(() => window.__copied), '', 'Aplikasi lain tidak menyalin')
  await page.$eval('[data-ayah-share]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open .share-grid')
  await page.$eval('.sheet-wrap.open [data-copyshare]', (b) => b.click())
  await page.waitForFunction(() => window.__copied.length > 0)
  assert.ok((await page.evaluate(() => window.__copied)).includes('quran.cgs.my.id/#/surah/'))

  await page.$eval('[data-ayah-share]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open [data-image-create]')
  assert.equal(await page.$$eval('.sheet-wrap.open [data-image-theme]', (buttons) => buttons.length), 3)
  await page.$eval('.sheet-wrap.open [data-image-create]', (b) => b.click())
  await page.waitForFunction(() => {
    const image = document.querySelector('.sheet-wrap.open [data-image-preview]')
    return image && image.complete && image.naturalWidth === 720 && !document.querySelector('.sheet-wrap.open [data-image-preview-wrap]').hidden
  })
  const previewDimensions = await page.$eval('.sheet-wrap.open [data-image-preview]', (image) => [image.naturalWidth, image.naturalHeight])
  assert.deepEqual(previewDimensions, [720, 1280], 'pratinjau memakai desain 9:16 yang sama dengan hasil ekspor')
  await page.evaluate(async () => {
    const image = document.querySelector('.sheet-wrap.open [data-image-preview]')
    const blob = await (await fetch(image.src)).blob()
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
    window.__previewImageFingerprint = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  })
  await page.$eval('.sheet-wrap.open [data-image-share]', (b) => b.click())
  await page.waitForFunction(() => window.__shareCalls.some((payload) => payload.files?.length))
  const imageShare = await page.evaluate(() => window.__shareCalls.find((payload) => payload.files?.length))
  assert.equal(imageShare.files[0].type, 'image/png')
  assert.match(imageShare.files[0].name, /^quranku-ayat-\d+-\d+\.png$/)
  assert.ok(imageShare.files[0].size > 1000, 'berkas gambar PNG berisi hasil render canvas')
  const imageInspection = await page.evaluate(async () => {
    const file = window.__shareCalls.find((payload) => payload.files?.length).files[0]
    const fileDigest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    const fileFingerprint = [...new Uint8Array(fileDigest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bitmap, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let transparentPixels = 0
    for (let alpha = 3; alpha < pixels.length; alpha += 4) if (pixels[alpha] !== 255) transparentPixels++
    const result = { width: bitmap.width, height: bitmap.height, transparentPixels, topLeft: [...pixels.slice(0, 4)], fingerprint: fileFingerprint }
    bitmap.close()
    return result
  })
  assert.deepEqual([imageInspection.width, imageInspection.height], [720, 1280], 'format vertikal Status WhatsApp 9:16')
  assert.equal(imageInspection.transparentPixels, 0, 'latar PNG hasil berbagi terisi penuh dan tidak transparan')
  assert.ok(imageInspection.topLeft[3] === 255, 'piksel sudut memiliki latar yang nyata')
  assert.equal(imageInspection.fingerprint, await page.evaluate(() => window.__previewImageFingerprint), 'berkas berbagi identik dengan pratinjau')
  assert.ok(imageShare.text.includes('quran.cgs.my.id/#/surah/'))

  await page.$eval('[data-ayah-next]', (b) => b.click())
  await page.waitForFunction((b) => document.querySelector('.ayah-day .link') && document.querySelector('.ayah-day .link').textContent.trim() !== b, {}, before)
})
await step('Mode Halaman: lembar per halaman mushaf, digeser ke samping', async () => {
  await go('/surah/2')
  await page.waitForSelector('.mushaf-flow .ayah')
  await readerMode('page')
  await page.waitForSelector('.mushaf-pages .mpage')
  await page.waitForFunction(() => document.querySelectorAll('.mushaf-pages .mpage:not(.mpage-end)').length === 48)
  const pageFontSizes = await page.$$eval('.mushaf-pages .mpage:not(.mpage-end) .mpage-text', (texts) => texts.map((el) => getComputedStyle(el).fontSize))
  assert.equal(new Set(pageFontSizes).size, 1, 'ukuran huruf Arab sama di semua halaman')
  assert.equal(pageFontSizes[0], '56px', 'pengaturan maksimum berlaku juga di mode halaman')
  // Al-Baqarah menempati halaman 2–49 → 48 lembar + 1 lembar penutup; seluruh 286 ayat tetap ada.
  assert.equal(await count('.mushaf-pages .mpage:not(.mpage-end)'), 48)
  assert.equal(await count('.mushaf-pages .ayah'), 286)
  assert.equal(await count('.mushaf-pages .basmalah'), 1)
  const ornaments = await page.$eval('.mushaf-pages .mpage', (sheet) => {
    const pageNo = sheet.querySelector('.mpage-no')
    const juz = sheet.querySelector('.reader-juz-chip')
    const basmalah = sheet.querySelector('.basmalah-cartouche')
    const surahTitle = sheet.querySelector('.mpage-title')
    const pageStyle = getComputedStyle(pageNo)
    return {
      pageLabel: pageNo.textContent.trim(),
      pageNumber: sheet.dataset.p,
      pageWidth: parseFloat(pageStyle.width),
      pageFontSize: parseFloat(pageStyle.fontSize),
      pageShape: getComputedStyle(pageNo, '::before').clipPath,
      juzShape: getComputedStyle(juz, '::before').clipPath,
      bismillahRadius: getComputedStyle(basmalah).borderRadius,
      titleRadius: getComputedStyle(surahTitle).borderRadius,
      bismillahOutline: getComputedStyle(basmalah).outlineStyle,
      titleOutline: getComputedStyle(surahTitle).outlineStyle,
    }
  })
  assert.equal(ornaments.pageLabel, '٢', 'nomor halaman ditampilkan di dalam medali')
  assert.ok(ornaments.pageWidth >= 36 && ornaments.pageFontSize > 16, 'medali nomor halaman sedikit lebih besar')
  assert.match(ornaments.pageShape, /polygon/, 'nomor halaman memakai bingkai roset')
  assert.match(ornaments.juzShape, /polygon/, 'nomor Juz memakai bingkai khusus')
  assert.notEqual(ornaments.pageShape, ornaments.juzShape, 'bingkai Juz berbeda dari roset halaman')
  assert.notEqual(ornaments.bismillahRadius, ornaments.titleRadius, 'bingkai basmalah berbeda dari bingkai nama surah')
  assert.equal(ornaments.bismillahOutline, 'solid')
  assert.equal(ornaments.titleOutline, 'none')
  const geo = await page.$eval('.mushaf-pages', (e) => ({ sw: e.scrollWidth, cw: e.clientWidth, ch: e.clientHeight, snap: getComputedStyle(e).scrollSnapType, docScroll: document.documentElement.scrollHeight - innerHeight }))
  assert.ok(geo.sw >= geo.cw * 48, 'lembar tersusun mendatar')
  assert.match(geo.snap, /x mandatory/)
  assert.ok(geo.ch > 500, 'lembar memenuhi layar')
  // Halaman tidak melebar keluar layar (tidak ada gulir mendatar pada dokumen).
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await shot('16-mode-halaman')
  // Desktop: ukuran huruf tetap seragam dan halaman panjang dapat digulir vertikal tanpa luapan dokumen.
  await page.setViewport({ width: 1365, height: 768 })
  await waitForSplashToClear()
  await page.waitForFunction(() => document.querySelectorAll('.mushaf-pages .mpage:not(.mpage-end)').length === 48)
  const desktopPages = await page.$$eval('.mushaf-pages .mpage:not(.mpage-end)', (pages) => pages.map((page) => {
    const body = page.querySelector('.mpage-body')
    const text = body.querySelector('.mpage-text')
    return { fontSize: getComputedStyle(text).fontSize, overflowY: getComputedStyle(body).overflowY }
  }))
  assert.ok(desktopPages.every((page) => page.fontSize === '56px'), 'desktop: semua halaman memakai ukuran pilihan')
  assert.ok(desktopPages.every((page) => page.overflowY === 'auto'), 'teks halaman panjang dapat digulir vertikal')
  assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('.rd-top')).display, !!document.querySelector('.rd-bottom')]), ['none', false])
  await readerAction('next')
  await page.waitForFunction(() => document.querySelector('.rd-top [data-page]').textContent.trim() === '٣')
  await readerAction('prev')
  await page.waitForFunction(() => document.querySelector('.rd-top [data-page]').textContent.trim() === '٢')
  await new Promise((resolve) => setTimeout(resolve, 900)) // tunggu usapan halus & posisi terakhir tersimpan sebelum emulasi memuat ulang halaman
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await waitForSplashToClear()
  await page.waitForFunction(() => document.querySelectorAll('.mushaf-pages .mpage:not(.mpage-end) .mpage-text').length === 48)
  assert.ok(await page.$$eval('.mpage-text', (texts) => texts.every((el) => getComputedStyle(el).fontSize === '56px')), 'font maksimum tetap sama setelah ukuran viewport berubah')
  // Pindah halaman dengan tombol → info halaman & ayat ikut berubah.
  assert.equal(await text('.rd-top [data-page]'), '٢')
  await readerAction('next')
  await page.waitForFunction(() => document.querySelector('.rd-top [data-page]').textContent.trim() === '٣', { timeout: 5000 }).catch(() => assert.fail('tombol halaman berikutnya tidak memindah halaman'))
  assert.equal(await text('.rd-top [data-cur]'), '٦')
  await new Promise((r) => setTimeout(r, 600)) // biarkan animasi geser selesai
  // Geser dengan sentuhan (usap ke kanan = halaman berikutnya, seperti mushaf).
  const box = await page.$eval('.mushaf-pages', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  await page.touchscreen.touchStart(box.x + box.w * 0.2, box.y + box.h / 2)
  for (let i = 1; i <= 8; i++) {
    await page.touchscreen.touchMove(box.x + box.w * (0.2 + 0.08 * i), box.y + box.h / 2)
    await new Promise((r) => setTimeout(r, 16))
  }
  await page.touchscreen.touchEnd()
  await page.waitForFunction(() => document.querySelector('.rd-top [data-page]').textContent.trim() === '٤', { timeout: 5000 }).catch(() => assert.fail('usapan tidak memindah halaman'))
  // Lompat ke ayat di halaman lain lalu sentuh ayat → lembar aksi terbuka.
  await go('/surah/2/255')
  await page.waitForSelector('.mushaf-pages .ayah[data-a="255"]')
  await new Promise((r) => setTimeout(r, 500))
  assert.equal(await text('.rd-top [data-page]'), '٤٢')
  const vis = await page.$eval('.mushaf-pages .ayah[data-a="255"]', (e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top < innerHeight })
  assert.ok(vis, 'ayat 255 terlihat di lembarnya')
  await page.$eval('.mushaf-pages .ayah[data-a="255"] .ayah-num', (e) => e.click())
  await page.waitForSelector('.sheet-wrap.open')
  await page.$eval('.sheet-wrap button[data-close]', (b) => b.click())
  await new Promise((r) => setTimeout(r, 350))
  // Posisi tersimpan & dipulihkan dalam mode Halaman.
  await go('/')
  await go('/lanjut')
  await page.waitForSelector('.mushaf-pages .mpage')
  await new Promise((r) => setTimeout(r, 500))
  assert.equal(await text('.rd-top [data-page]'), '٤٢')
  await readerMode('continuous')
  await page.waitForSelector('.mushaf-flow .ayah')
  assert.equal(await page.evaluate(() => document.body.classList.contains('reader-paged')), false)
  await readerAction('settings')
  await page.waitForSelector('.sheet-wrap.open input[name=fontSize]')
  await page.$eval('.sheet-wrap.open input[name=fontSize]', (e) => {
    e.value = 32
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.$eval('.sheet-wrap.open button[data-close]', (b) => b.click())
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'))
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.mushaf-flow .ayah-text')).fontSize === '32px')
})
await step('Mode Terjemahan: ikon aksi per ayat', async () => {
  await readerMode('focus')
  await page.waitForSelector('.mushaf-focus .ayah-block')
  assert.equal(await count('.ayah-block[data-a="1"] .ayah-btns > *'), 6)
  await readerMode('continuous')
  await page.waitForSelector('.mushaf-flow .ayah')
})
await step('Doa wudhu & wirid setelah salat (tersimpan di aplikasi)', async () => {
  await go('/doa/wudhu')
  await page.waitForSelector('.dzikir')
  assert.equal(await count('.dzikir'), 17)
  // Sumber cukup satu kali di kaki halaman, bukan di tiap kartu.
  assert.equal(await count('.dzikir .doa-ref'), 0)
  assert.equal(await count('.src-foot'), 1)
  assert.match(await text('.src-foot'), /Atribusi: Sumber Data/)
  await go('/doa/salat')
  await page.waitForSelector('.dzikir')
  assert.equal(await count('.dzikir'), 17)
  assert.match(await text('.src-foot'), /Atribusi: Sumber Data/)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const c = '.dzikir[data-card="0"] [data-count]'
  for (let i = 0; i < 3; i++) await page.$eval(c, (b) => b.click())
  assert.equal(await text(c), '3 / 3')
  assert.ok(await page.$eval(c, (b) => b.classList.contains('done')))
  // Wirid dan doa terpisah: dua judul bagian, doa hanya di bagian akhir.
  assert.deepEqual(await page.$$eval('.dzikir-section span', (e) => e.map((x) => x.textContent)), ['Wirid', 'Doa'])
  assert.equal(await count('.dzikir.k-wirid'), 15)
  assert.equal(await count('.dzikir.k-doa'), 2)
  // Penghitung selesai → kartu ditandai & progres bertambah; tombol centang juga menandai.
  assert.match(await text('[data-progress-text]'), /^1 dari 17/)
  await page.$eval('.dzikir[data-card="1"] [data-done]', (b) => b.click())
  assert.match(await text('[data-progress-text]'), /^2 dari 17/)
  assert.equal(await count('.dzikir.is-done'), 2)
  await shot('17-wirid-setelah-salat')
  await page.$eval('[data-reset]', (b) => b.click())
  assert.match(await text('[data-progress-text]'), /^0 dari 17/)
})
await step('Doa: sembunyikan arti/latin, ukuran Arab, bagikan ke media sosial', async () => {
  await go('/doa/salat')
  await page.waitForSelector('.dzikir .ayah-id')
  const shown = (sel) => page.$eval(sel, (e) => getComputedStyle(e).display !== 'none')
  assert.equal(await shown('.dzikir .ayah-id'), true)
  await page.$eval('[data-view="arti"]', (b) => b.click())
  assert.equal(await shown('.dzikir .ayah-id'), false)
  assert.equal(await shown('.dzikir .ayah-latin'), true)
  assert.equal(await page.$eval('[data-view="arti"]', (b) => b.getAttribute('aria-pressed')), 'false')
  await page.$eval('[data-view="latin"]', (b) => b.click())
  assert.equal(await shown('.dzikir .ayah-latin'), false)
  assert.equal(await shown('.dzikir .ayah-ar'), true)
  const size = () => page.$eval('.dzikir .ayah-ar', (e) => parseFloat(getComputedStyle(e).fontSize))
  const s0 = await size()
  await page.$eval('[data-size]', (b) => b.click())
  assert.ok((await size()) > s0)
  // Pilihan tersimpan: tetap berlaku setelah pindah tab & muat ulang.
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('.dzikir .ayah-ar')
  await page.evaluate(() => {
    window.__shareCalls = []
    window.__copied = ''
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload) => window.__shareCalls.push(payload) })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { window.__copied = value } } })
  })
  assert.equal(await shown('.dzikir .ayah-id'), false)
  await shot('28-doa-lafaz-saja')
  for (const k of ['arti', 'latin']) await page.$eval(`[data-view="${k}"]`, (b) => b.click())
  await page.$eval('[data-size]', (b) => b.click())
  await page.$eval('[data-size]', (b) => b.click())
  assert.equal(await shown('.dzikir .ayah-id'), true)
  // Ikon font termuat.
  assert.equal(await page.evaluate(async () => { await document.fonts.load("900 16px 'QK Icons'", '\uf06e'); return document.fonts.check("900 16px 'QK Icons'", '\uf06e') }), true)
  await page.$eval('.dzikir[data-card="0"] [data-share]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open .share-grid')
  const hrefs = await page.$$eval('.sheet-wrap.open .share-opt[data-net]', (a) => a.map((x) => x.href))
  assert.equal(hrefs.length, 4)
  assert.match(hrefs[0], /^https:\/\/wa\.me\/\?text=Istighfar/)
  assert.match(decodeURIComponent(hrefs[0]), /Artinya: Aku memohon ampun[\s\S]*quran\.cgs\.my\.id\/#\/doa\/salat$/)
  assert.match(hrefs[1], /^https:\/\/t\.me\/share\/url/)
  assert.match(hrefs[2], /facebook\.com\/sharer/)
  assert.match(hrefs[3], /twitter\.com\/intent\/tweet/)
  await new Promise((r) => setTimeout(r, 400))
  await shot('29-doa-bagikan')
  assert.equal(await page.$eval('.sheet-wrap.open [data-copyshare]', (b) => b.textContent.trim()), 'Salin teks')
  await page.evaluate(() => {
    window.__socialOpened = []
    window.__copied = ''
    window.open = (url, target, features) => { window.__socialOpened.push({ url, target, features }); return {} }
  })
  await page.$eval('.sheet-wrap.open .share-opt[data-net="fb"]', (b) => b.click())
  await page.waitForFunction(() => window.__socialOpened.length === 1)
  assert.ok((await page.evaluate(() => window.__socialOpened[0].url)).includes('facebook.com/sharer'))
  assert.equal(await page.evaluate(() => window.__copied), '', 'Facebook membuka alur share, tidak otomatis menyalin')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap.open'))
  await page.$eval('.dzikir[data-card="0"] [data-share]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open .share-grid')
  await page.$eval('.sheet-wrap.open .share-opt[data-native]', (b) => b.click())
  await page.waitForFunction(() => window.__shareCalls.length === 1)
  assert.match((await page.evaluate(() => window.__shareCalls[0].text)), /Istighfar/)
  await page.$eval('.dzikir[data-card="0"] [data-share]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open .share-grid')
  await page.$eval('.sheet-wrap.open .share-opt[data-copyshare]', (b) => b.click())
  await page.waitForFunction(() => window.__copied.length > 0)
  assert.match(await page.evaluate(() => window.__copied), /Istighfar/)
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap.open'))
})
await step('Doa harian per kategori, cari lintas kategori, tanpa duplikat', async () => {
  await go('/doa/harian')
  await page.waitForSelector('.cat-card')
  assert.deepEqual(await page.$$eval('.cat-card strong', (e) => e.map((x) => x.textContent)), [
    'Keseharian', 'Rezeki', 'Tolak Bala', 'Kesehatan', 'Perjalanan', 'Ilmu',
    'Waktu Tertentu', 'Kualitas Diri', 'Pernikahan & Rumah Tangga', 'Hamil & Persalinan',
    'Para Nabi di Al-Qur’an', 'Baca Al-Qur’an', 'Haji & Umrah', 'Kematian',
    'Wudhu', 'Usai Salat', 'Tahlil & Doa Arwah', "Doa dari Al-Qur'an"
  ])
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await new Promise((r) => setTimeout(r, 700))
  await shot('30-doa-kategori')
  await page.$eval('.cat-card[data-cat="doa-keseharian"]', (b) => b.click())
  await page.waitForSelector('.doa-nu')
  assert.equal(await count('.doa-nu'), 19)
  assert.equal(await count('.src-foot'), 1)
  assert.equal(await count('.doa-nu .doa-ref'), 0)
  const titles = await page.$$eval('.doa-nu summary strong', (e) => e.map((x) => x.textContent))
  assert.equal(new Set(titles).size, 19)
  assert.equal(titles[0], 'Doa Masuk Rumah')
  await page.$eval('.doa-nu summary', (b) => b.click())
  await page.waitForSelector('.doa-nu[open] .ayah-ar')
  await new Promise((r) => setTimeout(r, 500))
  await shot('31-doa-keseharian')
  // Membuka doa lain menutup yang sebelumnya.
  await page.$eval('.doa-nu:nth-of-type(2) summary', (b) => b.click())
  await new Promise((r) => setTimeout(r, 200))
  assert.equal(await count('.doa-nu[open]'), 1)
  await page.$eval('.doa-nu[open] [data-share]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open .share-grid')
  const shareHref = decodeURIComponent(await page.$eval('.sheet-wrap.open .share-opt.wa', (a) => a.href))
  assert.match(shareHref, /Doa Keluar Rumah[\s\S]*#\/doa\/harian$/)
  assert.doesNotMatch(shareHref, /Quran NU Online/)
  await page.$eval('.sheet-head [data-close]', (b) => b.click())
  await new Promise((r) => setTimeout(r, 300))
  // Pindah kategori lewat chip, kembali ke daftar kategori.
  await page.$eval('.cat-chips [data-cat="doa-rezeki"]', (b) => b.click())
  await page.waitForSelector('.cat-head')
  assert.equal(await count('.doa-nu'), 9)
  assert.match(await text('.cat-head h2'), /Doa Rezeki/)
  await page.$eval('.cat-head [data-cat=""]', (b) => b.click())
  await page.waitForSelector('.cat-card')
  // Pencarian menembus semua kategori dan menyebut kategorinya.
  await page.type('.search-box input', 'hujan')
  await page.waitForSelector('.doa-count')
  assert.equal(await count('.doa-nu'), 3)
  assert.deepEqual(await page.$$eval('.doa-nu summary small', (e) => [...new Set(e.map((x) => x.textContent))]), ['Keseharian', 'Tolak Bala'])
  // Kartu "Wudhu" membuka tab wudhu.
  await page.$eval('.search-box input', (i) => { i.value = ''; i.dispatchEvent(new Event('input')) })
  await page.waitForSelector('.cat-card[data-goto="wudhu"]')
  await page.$eval('.cat-card[data-goto="wudhu"]', (b) => b.click())
  await page.waitForSelector('.dzikir')
  assert.equal(await count('.dzikir'), 17)
})
await step('Asmaul Husna: bagikan ke media sosial', async () => {
  await go('/asmaul-husna')
  await page.waitForSelector('.asma')
  assert.equal(await count('.src-foot'), 1)
  await page.$eval('.asma[data-id="1"]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open [data-share]')
  await new Promise((r) => setTimeout(r, 400))
  await shot('32-asmaul-detail')
  await page.$eval('.sheet-wrap.open [data-share]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open .share-grid')
  const hrefs = await page.$$eval('.sheet-wrap.open .share-opt[data-net]', (a) => a.map((x) => x.href))
  assert.equal(hrefs.length, 4)
  assert.match(decodeURIComponent(hrefs[0]), /^https:\/\/wa\.me\/\?text=Asmaul Husna ke-1: [\s\S]*[\u0600-\u06FF][\s\S]*Artinya: [\s\S]*quran\.cgs\.my\.id\/#\/asmaul-husna$/)
  assert.match(hrefs[1], /^https:\/\/t\.me\/share\/url/)
  assert.match(hrefs[2], /facebook\.com\/sharer/)
  assert.match(hrefs[3], /twitter\.com\/intent\/tweet/)
  await new Promise((r) => setTimeout(r, 400))
  await shot('33-asmaul-bagikan')
})
await step('Membaca tanpa gangguan: sentuh teks ayat tidak membuka apa pun, nomor ayat membuka aksi', async () => {
  for (const mode of ['continuous', 'page']) {
    await go('/surah/36')
    await readerMode(mode)
    const root = mode === 'page' ? '.mushaf-pages' : '.mushaf-flow'
    await page.waitForSelector(`${root} .ayah[data-a="2"] .ayah-text`)
    await new Promise((r) => setTimeout(r, 400))
    await page.click(`${root} .ayah[data-a="2"] .ayah-text`)
    await new Promise((r) => setTimeout(r, 500))
    assert.equal(await count('.sheet-wrap'), 0, `mode ${mode}: sentuh teks tidak boleh membuka lembar`)
    await page.click(`${root} .ayah[data-a="2"] .ayah-num`)
    await page.waitForSelector('.sheet-wrap.open')
    assert.match(await text('.sheet-wrap .sheet-meta'), /Juz/)
    await page.$eval('.sheet-wrap button[data-close]', (b) => b.click())
    await page.waitForFunction(() => !document.querySelector('.sheet-wrap'))
  }
  // Halaman baca di ponsel tampil tanpa navigasi bawah.
  assert.equal(await page.$eval('.navbar', (e) => getComputedStyle(e).display), 'none')
  await readerMode('continuous')
})
await step('Teks ayat rapi (rata tengah) & pilih teks → menu kecil: Tandai, Salin, Hapus tanda', async () => {
  await go('/surah/36')
  await readerMode('continuous')
  await page.waitForSelector('.mushaf-flow .ayah[data-a="3"] .ayah-text')
  assert.equal(await page.$eval('.mushaf-flow', (e) => getComputedStyle(e).textAlign), 'center')
  // Jarak antarkata alami: lebar spasi antara dua kata bertetangga tidak melebihi 0,6 × ukuran huruf.
  const gap = await page.evaluate(() => {
    const el = document.querySelector('.mushaf-flow .ayah[data-a="3"] .ayah-text')
    const node = el.firstChild
    const i = node.data.indexOf(' ')
    const r = document.createRange()
    r.setStart(node, i)
    r.setEnd(node, i + 1)
    return r.getBoundingClientRect().width / parseFloat(getComputedStyle(el).fontSize)
  })
  assert.ok(gap < 0.6, 'spasi antarkata terlalu lebar: ' + gap.toFixed(2) + 'em')
  // Pilih kata kedua ayat 3 (seperti tekan lama lalu geser).
  const selectWord = () => page.evaluate(() => {
    const node = document.querySelector('.mushaf-flow .ayah[data-a="3"] .ayah-text').firstChild
    const a = node.data.indexOf(' ') + 1
    const b = node.data.indexOf(' ', a)
    const r = document.createRange()
    r.setStart(node, a + 1) // sengaja mulai di tengah kata → dibulatkan ke kata utuh
    r.setEnd(node, b)
    const sel = getSelection()
    sel.removeAllRanges()
    sel.addRange(r)
    return node.data.slice(a, b)
  })
  const word = await selectWord()
  await page.waitForSelector('.sel-menu:not([hidden])')
  assert.deepEqual(await page.$$eval('.sel-menu button', (b) => b.map((x) => x.textContent.trim())), ['Salin', 'Tandai', 'Bookmark', 'Bagikan', 'Lainnya'])
  const pos = await page.evaluate(() => {
    const m = document.querySelector('.sel-menu').getBoundingClientRect()
    return m.left >= 0 && m.right <= innerWidth && m.top >= 0 && m.bottom <= innerHeight
  })
  assert.equal(pos, true, 'menu berada di dalam layar')
  await shot('24-pilih-teks')
  await page.click('.sel-menu [data-sel="mark"]')
  await page.waitForSelector('.mushaf-flow .ayah[data-a="3"] mark.hl')
  assert.equal(await text('.mushaf-flow .ayah[data-a="3"] mark.hl'), word)
  assert.equal(await count('.sel-menu:not([hidden])'), 0)
  assert.equal(await count('.sheet-wrap'), 0)
  // Tanda tersimpan: tetap ada setelah dimuat ulang dan di mode lain.
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('.mushaf-flow .ayah[data-a="3"] mark.hl')
  await readerMode('focus')
  await page.waitForSelector('.mushaf-focus .ayah[data-a="3"] .ayah-ar mark.hl')
  await readerMode('continuous')
  await page.waitForSelector('.mushaf-flow .ayah[data-a="3"] mark.hl')
  // Sentuh bagian bertanda → menu menawarkan "Hapus tanda".
  await page.$eval('.mushaf-flow .ayah[data-a="3"] mark.hl', (m) => m.click())
  await page.waitForFunction(() => { const b = document.querySelector('.sel-menu:not([hidden]) [data-sel="mark"]'); return b && b.textContent.trim() === 'Hapus tanda' })
  await page.click('.sel-menu [data-sel="mark"]')
  await page.waitForFunction(() => !document.querySelector('.mushaf-flow mark.hl'))
  assert.equal(await page.evaluate(() => localStorage.getItem('quranku:tanda')), '{}')
  // Pilihan lintas ayat → Salin menyertakan rujukan.
  await page.evaluate(() => {
    const a = document.querySelector('.mushaf-flow .ayah[data-a="2"] .ayah-text').firstChild
    const b = document.querySelector('.mushaf-flow .ayah[data-a="3"] .ayah-text').firstChild
    const r = document.createRange()
    r.setStart(a, 0)
    r.setEnd(b, b.data.length)
    getSelection().removeAllRanges()
    getSelection().addRange(r)
    window.__copied = ''
    navigator.clipboard.writeText = async (t) => { window.__copied = t }
  })
  await page.waitForSelector('.sel-menu:not([hidden])')
  await page.click('.sel-menu [data-sel="copy"]')
  await page.waitForFunction(() => window.__copied)
  assert.match(await page.evaluate(() => window.__copied), /\(QS\. .+ 36:2–3\)$/)
})
await step('Pasang aplikasi: ajakan tampil di semua peramban, panduan sesuai peramban', async () => {
  const ua = await browser.userAgent()
  await go('/')
  await page.waitForSelector('[data-install-banner]')
  // Peramban tanpa dialog pasang bawaan (Firefox Android) → panduan langkah + tautan buka di Chrome.
  await page.setUserAgent('Mozilla/5.0 (Android 13; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0')
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('[data-install-now]')
  await page.click('[data-install-now]')
  await page.waitForSelector('.sheet-wrap .install-steps li')
  const t = await page.$eval('.sheet-wrap .sheet-body', (e) => e.textContent)
  assert.match(t, /Firefox/)
  assert.match(await page.$eval('.sheet-wrap a[data-chrome]', (a) => a.getAttribute('href')), /^intent:\/\/.+package=com\.android\.chrome/)
  await shot('25-pasang-aplikasi')
  await page.$eval('.sheet-wrap button[data-close]', (b) => b.click())
  // Kartu pasang di halaman Lainnya selalu terlihat selama belum terpasang.
  await go('/lainnya')
  assert.ok(await page.$eval('[data-install]', (e) => e.getBoundingClientRect().height > 0))
  // Dialog bawaan dipakai bila peramban menyediakannya.
  await page.evaluate(() => (window.__installPrompt = { prompt: () => (window.__prompted = true), userChoice: Promise.resolve({ outcome: 'accepted' }) }))
  await page.click('[data-install]')
  await page.waitForFunction(() => window.__prompted && document.querySelector('[data-install]').hidden)
  // Ajakan di beranda bisa ditutup dan tidak muncul lagi.
  await go('/')
  await page.waitForSelector('[data-install-close]')
  await page.click('[data-install-close]')
  await page.reload({ waitUntil: 'networkidle2' })
  await page.waitForSelector('.home-hero')
  assert.equal(await page.$('[data-install-banner]'), null)
  await page.setUserAgent(ua)
})
await step('Navigasi mengambang dengan tombol tengah (FAB)', async () => {
  await go('/')
  await page.waitForSelector('.navbar .nav-fab .fab-disc')
  const g = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect()
    const nav = r('.navbar'), fab = r('.fab-disc')
    return { navBottom: innerHeight - nav.bottom, navLeft: nav.left, lift: nav.top - fab.top, centered: Math.abs((fab.left + fab.right) / 2 - innerWidth / 2), round: getComputedStyle(document.querySelector('.fab-disc')).borderRadius, items: document.querySelectorAll('.nav-item').length }
  })
  assert.ok(g.navBottom >= 8 && g.navLeft >= 8, 'navigasi mengambang (ada jarak dari tepi)')
  assert.ok(g.lift >= 16, 'tombol tengah terangkat di atas batang, dapat ' + g.lift)
  assert.ok(g.centered < 1.5, 'tombol tengah berada di tengah')
  assert.equal(g.round, '50%')
  assert.equal(g.items, 5)
  await page.click('.nav-fab')
  await page.waitForSelector('.surah-row')
  assert.equal(await page.$eval('.nav-fab', (e) => e.classList.contains('active')), true)
  // Isi halaman paling bawah tidak tertutup navigasi.
  await go('/lainnya')
  await page.waitForSelector('.more-page .more-hero')
  assert.equal(await page.$('.more-page .version-card'), null, 'kartu cek versi tidak lagi di Lainnya')
  await go('/pengaturan')
  await page.waitForSelector('.version-card [data-version]')
  assert.equal(await page.$eval('.version-card [data-update]', (button) => button.getAttribute('aria-label')), 'Periksa pembaruan QuranKu', 'tombol pembaruan PWA tersedia di Pengaturan')
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  const gap = await page.evaluate(() => document.querySelector('.navbar').getBoundingClientRect().top - document.querySelector('.fab-disc').getBoundingClientRect().height / 2 - document.querySelector('.version-card').getBoundingClientRect().bottom)
  assert.ok(gap >= 0, 'kartu versi di Pengaturan tidak tertutup navigasi, selisih ' + gap)
  assert.match(await text('.version-card [data-version]'), /^\d+\.\d+\.\d+ \(build /)
  await shot('21-navigasi-mengambang')
})
await step('Murottal: bagikan audio tanpa memulai ulang; kontrol pemutar & baris aktif', async () => {
  await go('/murottal')
  await page.waitForSelector('.audio-row')
  assert.equal(await count('.audio-row[data-n="36"] [data-share-audio]'), 1)
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'kontrol Bagikan audio tidak menimbulkan overflow')
  await page.evaluate(() => {
    window.__shareCalls = []
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (payload) => window.__shareCalls.push(payload) })
  })
  const beforeAudio = await text('.now-playing h2')
  await page.$eval('.audio-row[data-n="36"] [data-share-audio]', (b) => b.click())
  await page.waitForSelector('.sheet-wrap.open .share-grid')
  const audioLinks = await page.$$eval('.sheet-wrap.open .share-opt[data-net]', (a) => a.map((x) => x.href))
  assert.equal(audioLinks.length, 4)
  assert.ok(decodeURIComponent(audioLinks[0]).includes('Tautan audio: https://audio.test/full/36.mp3'))
  assert.ok(decodeURIComponent(audioLinks[0]).endsWith('https://quran.cgs.my.id/#/murottal'))
  assert.equal(await page.evaluate(() => window.__shareCalls.length), 0, 'Bagikan audio membuka pilihan sosial')
  await page.$eval('.sheet-wrap.open [data-native]', (b) => b.click())
  await page.waitForFunction(() => window.__shareCalls.length === 1)
  const audioShare = await page.evaluate(() => window.__shareCalls[0])
  assert.ok(audioShare.text.includes('Tautan audio:'))
  assert.ok(audioShare.url.endsWith('/#/murottal'))
  assert.equal(await text('.now-playing h2'), beforeAudio, 'membagikan audio tidak menjalankan aksi play')
  assert.equal(await page.$eval('.now-playing', (e) => e.classList.contains('is-idle')), true)
  await page.select('[data-repeat]', 'none')
  const repeatButton = '.audio-row[data-n="36"] [data-repeat-surah]'
  assert.equal(await page.$eval(repeatButton, (b) => b.getAttribute('aria-pressed')), 'false')
  await page.$eval(repeatButton, (b) => b.click())
  await page.waitForFunction(() => {
    const b = document.querySelector('.audio-row[data-n="36"] [data-repeat-surah]')
    const s = JSON.parse(localStorage.getItem('quranku:settings') || '{}')
    return b?.getAttribute('aria-pressed') === 'true' && s.audio?.repeat === 'surah'
  })
  assert.equal(await count('.audio-row.is-current'), 1, 'tombol ulangi memutar surah yang dipilih')
  await page.$eval(repeatButton, (b) => b.click())
  await page.waitForFunction(() => {
    const b = document.querySelector('.audio-row[data-n="36"] [data-repeat-surah]')
    const s = JSON.parse(localStorage.getItem('quranku:settings') || '{}')
    return b?.getAttribute('aria-pressed') === 'false' && s.audio?.repeat === 'none'
  })
  await page.$eval('.now-playing [data-act="stop"]', (b) => b.click())
  await page.waitForSelector('.now-playing.is-idle')
  await page.$eval('.audio-row[data-n="36"] [data-play]', (b) => b.click())
  await page.waitForSelector('.audio-row[data-n="36"].is-current')
  await page.waitForSelector('.now-playing:not(.is-idle) .np-controls')
  assert.equal(await count('.audio-row.is-current'), 1)
  assert.equal(await page.$eval('.np-disc', (e) => getComputedStyle(e).animationName), 'spin')
  await page.$eval('.now-playing [data-act="stop"]', (b) => b.click())
  await page.waitForSelector('.now-playing.is-idle')
  assert.equal(await count('.audio-row.is-current'), 0)
  await go('/asmaul-husna')
  await page.waitForSelector('.asma')
  assert.equal(await count('.asma'), 99)
  await page.waitForSelector('.asma-verse-ar')
  assert.match(await text('.asma-verse-ref'), /7:180/)
  await page.click('.asma[data-id="1"]')
  await page.waitForSelector('.sheet-wrap.open .asma-detail')
  assert.equal(await text('.asma-detail h3'), 'Ar-Rahmaan')
  await page.$eval('.sheet-wrap [data-go="1"]', (b) => b.click())
  assert.equal(await text('.asma-detail h3'), 'Ar-Rahiim')
  assert.equal(await count('.asma-sec'), 3)
  assert.match(await text('.asma-sec p'), /Kasih sayang Allah/)
  assert.equal(await page.$eval('.asma-refs a', (a) => a.getAttribute('href')), '#/surah/33/43')
  await new Promise((r) => setTimeout(r, 350))
  await shot('22-asmaul-husna-detail')
  await page.$eval('.sheet-wrap button[data-close]', (b) => b.click())
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'))
  await shot('23-asmaul-husna')
})
await step('Kompas kiblat: piringan SVG, penanda Ka’bah, statistik', async () => {
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('quranku:settings') || '{}')
    s.location = { lat: -6.2088, lng: 106.8456, name: 'Jakarta' }
    localStorage.setItem('quranku:settings', JSON.stringify(s))
  })
  await page.reload({ waitUntil: 'networkidle2' })
  await go('/kiblat')
  await page.waitForSelector('.compass-dial svg')
  assert.equal(await count('.compass-dial .tk'), 72)
  assert.equal(await count('.qibla-stats .card'), 3)
  // Kiblat dari Jakarta ≈ 295° dari Utara.
  assert.match(await page.$eval('.qibla-mark', (g) => g.getAttribute('transform')), /^rotate\(295\.\d+ 100 100\)$/)
  assert.equal(await text('[data-deg]'), '295°')
  await shot('18-kompas-kiblat')
})
await step('Adzan otomatis: pengaturan, uji suara, On/Off', async () => {
  await browser.defaultBrowserContext().overridePermissions(new URL(BASE).origin, ['notifications'])
  await go('/salat')
  await page.waitForSelector('.adzan-card')
  assert.equal(await page.$eval('.adzan-body', (e) => e.hidden), true)
  await page.$eval('[data-adzan="enabled"]', (e) => e.click())
  await page.waitForFunction(() => document.querySelector('.adzan-body') && !document.querySelector('.adzan-body').hidden, { timeout: 15000 })
  const st = () => page.evaluate(() => JSON.parse(localStorage.getItem('quranku:settings')).adzan)
  assert.equal((await st()).enabled, true)
  assert.equal(await count('.adzan-chips input'), 5)
  assert.equal(await count('[data-adzan-voice] option'), 6)
  await page.$eval('[data-adzan="asar"]', (e) => e.click())
  assert.equal((await st()).asar, false)
  await page.select('[data-adzan-voice]', 'a1')
  assert.equal((await st()).voice, 'a1')
  await shot('19-adzan-otomatis')
  // Tombol Coba → bilah adzan muncul (permintaan audio lewat Service Worker, jadi tidak terlihat oleh penyadap halaman).
  await page.$eval('[data-adzan-test]', (b) => b.click())
  await page.waitForSelector('#adzan-bar.show')
  assert.match(await text('#adzan-bar strong'), /^Adzan$/)
  await page.$eval('#adzan-bar [data-adzan-stop]', (b) => b.click())
  await page.waitForFunction(() => !document.querySelector('#adzan-bar.show'))
  await page.$eval('[data-adzan="enabled"]', (e) => e.click())
  await page.waitForFunction(() => document.querySelector('.adzan-body') && document.querySelector('.adzan-body').hidden, { timeout: 15000 })
  assert.equal((await st()).enabled, false)
})
await step('Adzan berbunyi otomatis tepat saat masuk waktu salat', async () => {
  const { getPrayerTimes } = await import('../../src/api/prayer-api.js')
  // Waktu Magrib hari ini (WIB) untuk Jakarta; jam halaman digeser ke 20 detik sebelum Magrib.
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 3600000)
  const magrib = getPrayerTimes({ lat: -6.2088, lng: 106.8456 }, new Date(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 12), 'kemenag').find((p) => p.key === 'magrib').time
  const p3 = await browser.newPage()
  await p3.emulateTimezone('Asia/Jakarta')
  await p3.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  p3.on('pageerror', (e) => errors.push(String(e)))
  await p3.evaluateOnNewDocument((offset) => {
    const Real = Date
    class Shifted extends Real {
      constructor(...a) {
        if (a.length) super(...a)
        else super(Real.now() + offset)
      }
      static now() {
        return Real.now() + offset
      }
    }
    window.Date = Shifted
    const s = JSON.parse(localStorage.getItem('quranku:settings') || '{}')
    s.location = { lat: -6.2088, lng: 106.8456, name: 'Jakarta' }
    s.adzan = { ...(s.adzan || {}), enabled: true, sound: true, voice: 'a9', magrib: true }
    localStorage.setItem('quranku:settings', JSON.stringify(s))
    for (const k of Object.keys(localStorage)) if (k.startsWith('qk-adzan:')) localStorage.removeItem(k)
  }, magrib.getTime() - 20000 - Date.now())
  const reqs = []
  p3.on('request', (r) => r.url().includes('cdn.aladhan.com') && reqs.push(r.url()))
  await p3.goto(BASE + '/#/salat', { waitUntil: 'domcontentloaded' })
  await p3.waitForSelector('.adzan-card')
  assert.equal(await p3.$('#adzan-bar.show'), null, 'belum waktunya → belum berbunyi')
  await p3.waitForSelector('#adzan-bar.show', { timeout: 45000 })
  assert.match(await p3.$eval('#adzan-bar strong', (e) => e.textContent), /Adzan Magrib/)
  if (reqs.length) assert.deepEqual([...new Set(reqs)], ['https://cdn.aladhan.com/audio/adhans/a9.mp3'])
  await p3.screenshot({ path: `${SHOTS}/20-adzan-berbunyi.png` })
  // Tidak berbunyi dua kali untuk waktu yang sama.
  await p3.$eval('#adzan-bar [data-adzan-stop]', (b) => b.click())
  await new Promise((r) => setTimeout(r, 17000))
  assert.equal(await p3.$('#adzan-bar.show'), null)
  await p3.close()
})
await step('Tidak ada error JavaScript', async () => {
  assert.deepEqual(errors, [])
})
await browser.close()
