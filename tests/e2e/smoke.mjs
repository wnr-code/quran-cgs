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
  await page.click('.rd-tabs [data-mode="focus"]')
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
  await page.click('.rd-tabs [data-mode="continuous"]')
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
  const deg = parseFloat(await text('.qibla-stats b'))
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
await step('Ayat pilihan: tombol ayat lain, putar & bagikan', async () => {
  await go('/')
  await page.waitForSelector('.ayah-day-ar')
  const before = await text('.ayah-day .link')
  assert.equal(await count('.ayah-day [data-ayah-play]'), 1)
  assert.equal(await count('.ayah-day [data-ayah-share]'), 1)
  await page.$eval('[data-ayah-next]', (b) => b.click())
  await page.waitForFunction((b) => document.querySelector('.ayah-day .link') && document.querySelector('.ayah-day .link').textContent.trim() !== b, {}, before)
})
await step('Mode Halaman: lembar per halaman mushaf, digeser ke samping', async () => {
  await go('/surah/2')
  await page.waitForSelector('.mushaf-flow .ayah')
  await page.click('.rd-tabs [data-mode="page"]')
  await page.waitForSelector('.mushaf-pages .mpage')
  // Al-Baqarah menempati halaman 2–49 → 48 lembar + 1 lembar penutup; seluruh 286 ayat tetap ada.
  assert.equal(await count('.mushaf-pages .mpage:not(.mpage-end)'), 48)
  assert.equal(await count('.mushaf-pages .ayah'), 286)
  assert.equal(await count('.mushaf-pages .basmalah'), 1)
  const geo = await page.$eval('.mushaf-pages', (e) => ({ sw: e.scrollWidth, cw: e.clientWidth, ch: e.clientHeight, snap: getComputedStyle(e).scrollSnapType, docScroll: document.documentElement.scrollHeight - innerHeight }))
  assert.ok(geo.sw >= geo.cw * 48, 'lembar tersusun mendatar')
  assert.match(geo.snap, /x mandatory/)
  assert.ok(geo.ch > 500, 'lembar memenuhi layar')
  // Halaman tidak melebar keluar layar (tidak ada gulir mendatar pada dokumen).
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await shot('16-mode-halaman')
  // Pindah halaman dengan tombol → info halaman & ayat ikut berubah.
  assert.equal(await text('.rd-top [data-page]'), '٢')
  await page.click('.rd-bottom [data-act="next"]')
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
  await page.click('.rd-tabs [data-mode="continuous"]')
  await page.waitForSelector('.mushaf-flow .ayah')
  assert.equal(await page.evaluate(() => document.body.classList.contains('reader-paged')), false)
})
await step('Mode Terjemahan: ikon aksi per ayat', async () => {
  await page.click('.rd-tabs [data-mode="focus"]')
  await page.waitForSelector('.mushaf-focus .ayah-block')
  assert.equal(await count('.ayah-block[data-a="1"] .ayah-btns > *'), 6)
  await page.click('.rd-tabs [data-mode="continuous"]')
  await page.waitForSelector('.mushaf-flow .ayah')
})
await step('Doa wudhu & wirid setelah salat (tersimpan di aplikasi)', async () => {
  await go('/doa/wudhu')
  await page.waitForSelector('.dzikir')
  assert.equal(await count('.dzikir'), 2)
  await go('/doa/salat')
  await page.waitForSelector('.dzikir')
  assert.equal(await count('.dzikir'), 13)
  assert.match(await text('.dzikir:first-child .doa-ref'), /HR\. Muslim/)
  const c = '.dzikir:first-child [data-count]'
  for (let i = 0; i < 3; i++) await page.$eval(c, (b) => b.click())
  assert.equal(await text(c), '3 / 3')
  assert.ok(await page.$eval(c, (b) => b.classList.contains('done')))
  await shot('17-wirid-setelah-salat')
})
await step('Membaca tanpa gangguan: sentuh teks ayat tidak membuka apa pun, nomor ayat membuka aksi', async () => {
  for (const mode of ['continuous', 'page']) {
    await go('/surah/36')
    await page.waitForSelector('.rd-tabs [data-mode]')
    await page.$eval(`.rd-tabs [data-mode="${mode}"]`, (b) => b.click())
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
  await page.$eval('.rd-tabs [data-mode="continuous"]', (b) => b.click())
})
await step('Teks ayat rapi (rata tengah) & pilih teks → menu kecil: Tandai, Salin, Hapus tanda', async () => {
  await go('/surah/36')
  await page.waitForSelector('.rd-tabs [data-mode]')
  await page.$eval('.rd-tabs [data-mode="continuous"]', (b) => b.click())
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
  await page.$eval('.rd-tabs [data-mode="focus"]', (b) => b.click())
  await page.waitForSelector('.mushaf-focus .ayah[data-a="3"] .ayah-ar mark.hl')
  await page.$eval('.rd-tabs [data-mode="continuous"]', (b) => b.click())
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
  await page.waitForSelector('.version-card')
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  const gap = await page.evaluate(() => document.querySelector('.navbar').getBoundingClientRect().top - document.querySelector('.fab-disc').getBoundingClientRect().height / 2 - document.querySelector('.version-card').getBoundingClientRect().bottom)
  assert.ok(gap >= 0, 'kartu versi tidak tertutup navigasi, selisih ' + gap)
  assert.match(await text('.version-card [data-version]'), /^\d+\.\d+\.\d+ \(build /)
  await shot('21-navigasi-mengambang')
})
await step('Murottal: pemutar beranimasi & baris aktif; Asmaul Husna: kartu & detail', async () => {
  await go('/murottal')
  await page.waitForSelector('.audio-row')
  assert.equal(await page.$eval('.now-playing', (e) => e.classList.contains('is-idle')), true)
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
