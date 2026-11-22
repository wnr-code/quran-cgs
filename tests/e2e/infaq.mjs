// Uji halaman infaq di peramban terhadap Worker lokal (`npx wrangler dev --local`, dengan .dev.vars berisi
// TRAKTEER_WEBHOOK_TOKEN=token-uji-lokal). Halaman sematan Trakteer ditiru karena penyedia tidak terjangkau dari lingkungan uji:
// tiruan itu mengikuti protokol skrip resmi (menerima `embed.openModal`, mengirim `embed.modalClosed`).
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
const puppeteer = (await import(process.env.PUPPETEER_PATH || 'puppeteer-core')).default
const BASE = process.env.BASE_URL || 'http://localhost:8787'
const TOKEN = process.env.WEBHOOK_TOKEN || 'token-uji-lokal'
const SHOTS = process.env.SHOTS_DIR || 'store/screenshots'
mkdirSync(SHOTS, { recursive: true })
const EMBED = 'https://trakteer.id/v1/lanteraku/tip/embed/modal'
const FAKE = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent;font-family:sans-serif">
<div id="m" style="display:none;position:fixed;inset:10% 6%;background:#fff;border-radius:16px;padding:20px;box-shadow:0 10px 40px #0006">
<b>Formulir tiruan penyedia</b><p>Kopi · Rp 1.000 / unit</p><button id="c">Tutup</button></div>
<script>addEventListener('message',e=>{if(e.data&&e.data.type==='embed.openModal'){document.getElementById('m').style.display='block';parent.postMessage({type:'tes.terbuka'},'*')}});
document.getElementById('c').onclick=()=>parent.postMessage({type:'embed.modalClosed'},'*')</script>`
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: 'shell', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const embedRequests = []
await page.setRequestInterception(true)
page.on('request', (req) => {
  const u = new URL(req.url())
  if (u.origin + u.pathname === EMBED) {
    embedRequests.push(req.url())
    return req.respond({ status: 200, contentType: 'text/html', body: FAKE })
  }
  if (u.origin !== new URL(BASE).origin) return req.abort()
  req.continue()
})
const webhook = (tx) => fetch(BASE + '/api/trakteer-webhook', { method: 'POST', headers: { 'X-Webhook-Token': TOKEN, 'content-type': 'application/json' }, body: JSON.stringify(tx) })
const pagesBefore = (await browser.pages()).length
const uniq = Date.now().toString(36)
const T = { timeout: 30000 }
let failed = 0
const step = async (name, fn) => {
  try {
    await fn()
    console.log('✓', name)
  } catch (e) {
    failed++
    console.log('✗', name, '—', String(e.message).slice(0, 300))
    await page.screenshot({ path: `/tmp/infaq-gagal-${failed}.png` }).catch(() => {})
  }
}
// Navigasi bawah mengambang menutupi tepi bawah layar: gulir elemen ke tengah dulu sebelum disentuh.
const tap = async (sel) => {
  await page.waitForSelector(sel, T)
  await page.$eval(sel, (e) => e.scrollIntoView({ block: 'center' }))
  await page.click(sel)
}
// Akad hanya tampil bila persetujuan belum ada / teks akad berubah.
const openForm = async () => {
  await tap('[data-infaq-open]')
  const akad = await page.waitForSelector('.sheet-wrap.open [data-akad-ok]', { timeout: 4000 }).catch(() => null)
  if (akad) await page.$eval('[data-akad-ok]', (b) => b.click())
  await page.waitForSelector('.trk-overlay', T)
}
const frameOpened = () =>
  page.evaluate(
    () =>
      new Promise((res) => {
        addEventListener('message', (e) => e.data && e.data.type === 'tes.terbuka' && res(true))
        setTimeout(() => res(false), 8000)
      })
  )

await step('Tombol INFAQ sesuai identitas sematan; nama penyedia tidak tampil', async () => {
  await page.goto(`${BASE}/#/infaq`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-infaq-open]', T)
  const btn = await page.$eval('[data-infaq-open]', (b) => {
    const probe = document.createElement('span')
    probe.style.backgroundColor = 'var(--primary)'
    document.body.appendChild(probe)
    const primary = getComputedStyle(probe).backgroundColor
    probe.remove()
    return { text: b.textContent.trim(), bg: getComputedStyle(b).backgroundColor, primary, img: b.querySelector('img')?.getAttribute('src') || '' }
  })
  assert.equal(btn.text, 'INFAQ')
  assert.equal(btn.bg, btn.primary, 'tombol memakai warna utama tema aktif')
  assert.equal(btn.img, 'https://mirror-uploads.trakteer.id/images/units/uic-WAJ1GG3F86NzLSXQAwcEDJTa83KnmEMF1794742909.png')
  assert.ok(!/trakteer/i.test(await page.$eval('#view', (e) => e.textContent)), 'nama penyedia masih tampil')
  assert.equal(await page.$('[data-q], [data-custom], [data-pay]'), null, 'tidak ada lagi isian nominal di aplikasi')
  // Akad dijelaskan sebelum tombol: sukarela, bukan jual beli, bukan zakat, dipakai juga untuk pengelola
  assert.equal(await page.$('[data-akad]'), null, 'akad tidak lagi memenuhi halaman')
  await tap('[data-infaq-open]')
  await page.waitForSelector('.sheet-wrap.open [data-akad]', T)
  assert.equal(await page.$('.trk-overlay'), null, 'formulir belum dibuka sebelum akad disetujui')
  const akad = await page.$eval('[data-akad]', (e) => e.textContent)
  await page.screenshot({ path: `${SHOTS}/13-infaq-akad.png` })
  await page.click('.sheet-head [data-close]')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'), T)
  for (const w of [
    /hibah, bukan jual beli/i,
    /Aep \(WNR Code\), pengembang dan pengelola/,
    /dapat diverifikasi lewat kontak pengelola di halaman Tentang/,
    /Kanal pembayaran:\s*Lanteraku/,
    /Penerimaan \(qabul\)/,
    /Bukan zakat, fidyah, kafarah, atau nazar/i,
    /Nafkah keluarga lebih utama/i,
    /Bismillah, saya setuju & lanjut/,
    /Pernyataan akad/i
  ]) assert.match(akad, w)
})

await step('INFAQ membuka popup sematan di atas halaman: tanpa tab baru, tombol kembali menutup', async () => {
  const opened = frameOpened()
  await openForm()
  await page.waitForSelector('.trk-overlay.open iframe', T)
  const src = await page.$eval('.trk-overlay iframe', (f) => f.src)
  assert.equal(src, `${EMBED}?embedId=0&ref=${BASE}/`)
  assert.equal(await opened, true, 'bingkai tidak menerima embed.openModal')
  assert.equal(await page.$eval('#view [data-trk-direct]', (a) => a.href), 'https://trakteer.id/lanteraku/tip') // jalan untuk dompet digital
  // Tidak ada tombol/teks milik aplikasi yang menutupi formulir penyedia setelah termuat
  assert.equal(await page.$('.trk-overlay [data-trk-close], .trk-overlay .trk-help'), null)
  // Teks berjalan berada di ATAS bingkai formulir, tidak menimpanya
  const geo = await page.evaluate(() => {
    const t = document.querySelector('[data-trk-ticker]').getBoundingClientRect()
    const f = document.querySelector('.trk-overlay iframe').getBoundingClientRect()
    return { tb: t.bottom, ft: f.top, fb: f.bottom, vh: innerHeight, href: document.querySelector('[data-trk-ticker]').href }
  })
  assert.ok(geo.tb <= geo.ft + 0.5 && Math.abs(geo.fb - geo.vh) < 1, JSON.stringify(geo))
  assert.equal(geo.href, 'https://trakteer.id/lanteraku/tip')
  await new Promise((r) => setTimeout(r, 500))
  await page.screenshot({ path: `${SHOTS}/15-infaq-popup.png` })
  assert.equal((await browser.pages()).length, pagesBefore, 'tidak ada tab baru')
  assert.equal(new URL(page.url()).hash, '#/infaq', 'halaman aplikasi tidak berpindah')
  // Tombol kembali (Android) menutup popup lebih dulu
  await page.goBack()
  await page.waitForFunction(() => !document.querySelector('.trk-overlay'), T)
  assert.equal(new URL(page.url()).hash, '#/infaq')
  assert.ok(await page.$('[data-infaq-open]'))
  // Penyedia mengirim embed.modalClosed (tombol tutup di formulirnya) → popup hilang
  const again = frameOpened()
  await openForm()
  assert.equal(await again, true)
  const frame = await (await page.$('.trk-overlay iframe')).contentFrame()
  await frame.click('#c')
  await page.waitForFunction(() => !document.querySelector('.trk-overlay'), T)
  // Tombol kembali sekali lagi
  await openForm()
  await page.waitForSelector('.trk-overlay.open', T)
  await page.goBack()
  await page.waitForFunction(() => !document.querySelector('.trk-overlay'), T)
  assert.equal(new URL(page.url()).hash, '#/infaq')
  assert.equal((await browser.pages()).length, pagesBefore)
  assert.ok(embedRequests.length >= 3)
})

await step('Papan Kebaikan: menutup popup tidak menambah kebaikan; webhook menampilkan doa anonim tanpa nama & nominal', async () => {
  const name = 'Penguji ' + uniq
  assert.ok(!(await page.$eval('#view', (e) => e.textContent)).includes(name), 'popup ditutup ≠ sudah bayar')
  const r = await webhook({ transaction_id: 'e2e-m-' + uniq, supporter_name: name, supporter_message: 'Semoga berkah <script>x</script> ' + uniq, price: 25000, quantity: 25, unit: 'Kopi' })
  assert.equal(r.status, 200)
  await openForm()
  await page.waitForSelector('.trk-overlay.open', T)
  await new Promise((r) => setTimeout(r, 300))
  await page.goBack() // papan dimuat ulang setelah popup ditutup
  await page.waitForFunction((n) => [...document.querySelectorAll('.doa-item .doa-msg')].some((e) => e.textContent.includes(n)), T, uniq)
  const doa = await page.evaluate((n) => {
    const li = [...document.querySelectorAll('.doa-item')].find((e) => e.querySelector('.doa-msg').textContent.includes(n))
    return { msg: li.querySelector('.doa-msg').textContent, meta: li.querySelector('.doa-meta').textContent, html: li.innerHTML }
  }, uniq)
  assert.ok(doa.msg.startsWith('Semoga berkah') && doa.msg.includes(uniq), doa.msg)
  assert.match(doa.meta, /Hamba Allah/)
  assert.ok(!/<script/i.test(doa.html))
  assert.ok(!(await page.$eval('#view', (e) => e.textContent)).includes(name), 'nama donatur tidak tampil')
  assert.ok(!(await page.$eval('#view', (e) => e.textContent)).includes('25.000'), 'nominal tidak tampil')
  assert.equal(await page.$('.podium'), null, 'podium dihapus')
  assert.equal(await page.$eval('[data-stats]', (e) => e.hidden), false)
  await page.$eval('.infaq-stats', (e) => e.scrollIntoView({ block: 'start' }))
  await page.screenshot({ path: `${SHOTS}/14-infaq-papan.png` })
})

await step('Akad infaq: cukup sekali, berikutnya langsung formulir, dan bisa dibatalkan', async () => {
  // Bersihkan persetujuan lalu muat ulang halaman.
  await page.evaluate(() => localStorage.removeItem('quranku:akad-infaq'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-infaq-open]', T)

  // 1) Belum setuju → akad tampil.
  await tap('[data-infaq-open]')
  await page.waitForSelector('.sheet-wrap.open [data-akad-ok]', T)
  await page.click('.sheet-head [data-close]')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'), T)
  const statusAwal = await page.$eval('[data-akad-status]', (e) => e.hidden)
  assert.equal(statusAwal, true, 'belum ada status persetujuan')

  // 2) Setuju → tersimpan, status tampil, formulir terbuka.
  await openForm()
  await page.waitForSelector('.trk-overlay.open', T)
  await page.goBack()
  await page.waitForFunction(() => !document.querySelector('.trk-overlay'), T)
  const consent = await page.evaluate(() => JSON.parse(localStorage.getItem('quranku:akad-infaq') || 'null'))
  assert.ok(consent && consent.versi && Date.parse(consent.tanggal) > 0, 'persetujuan tersimpan')
  await page.waitForFunction(() => !document.querySelector('[data-akad-status]').hidden, T)
  assert.match(await page.$eval('[data-akad-status]', (e) => e.textContent), /sudah menyetujui akad/i)

  // 3) Klik INFAQ lagi → TIDAK ada akad, langsung formulir.
  await tap('[data-infaq-open]')
  await page.waitForSelector('.trk-overlay.open', T)
  assert.equal(await page.$('.sheet-wrap [data-akad]'), null, 'akad tidak muncul lagi')
  await page.goBack()
  await page.waitForFunction(() => !document.querySelector('.trk-overlay'), T)

  // 4) Batalkan persetujuan → akad tampil lagi.
  await tap('[data-akad-reset]')
  await page.waitForFunction(() => document.querySelector('[data-akad-status]').hidden, T)
  assert.equal(await page.evaluate(() => localStorage.getItem('quranku:akad-infaq')), null, 'persetujuan terhapus')
  await tap('[data-infaq-open]')
  await page.waitForSelector('.sheet-wrap.open [data-akad-ok]', T) // akad harus tampil lagi setelah dibatalkan
  await page.click('.sheet-head [data-close]')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'), T)
})

await step('Halaman Lainnya: identitas, slogan, kartu bertema & menu tampil', async () => {
  await page.evaluate(() => (location.hash = '#/lainnya'))
  await page.waitForSelector('.more-page .more-infaq', T)
  assert.ok((await page.$$('.more-page .menu-item')).length >= 12)
  assert.equal(await page.$eval('.more-hero h2', (e) => e.textContent), 'QuranKu')
  assert.equal(await page.$eval('.more-arabic', (e) => e.textContent), 'كَلَامُ اللَّهِ')
  const arabicRightGap = await page.$eval('.more-arabic', (e) => Math.abs(e.getBoundingClientRect().right - e.parentElement.getBoundingClientRect().right))
  assert.ok(arabicRightGap < 2, `teks Arab rata ke pinggir kanan: ${arabicRightGap}px`)
  assert.ok((await page.$eval('[data-more-slogan]', (e) => e.textContent.trim())).length > 10)
  assert.equal(await page.$eval('.more-promise', (e) => e.textContent.replace(/\s+/g, ' ').trim()), 'Gratis • Tanpa Iklan • Tanpa Analitik')
  assert.equal(await page.$('.more-page .version-card'), null, 'cek versi dipindah ke Pengaturan')
  const colors = await page.evaluate(() => {
    const root = document.documentElement
    const card = document.querySelector('.more-infaq')
    const previous = root.dataset.theme
    const before = getComputedStyle(card).backgroundImage
    root.dataset.theme = 'ramadan'
    const after = getComputedStyle(card).backgroundImage
    const color = getComputedStyle(card).color
    const probe = document.createElement('span')
    probe.style.color = 'var(--primary-ink)'
    document.body.appendChild(probe)
    const ink = getComputedStyle(probe).color
    probe.remove()
    root.dataset.theme = previous
    return { before, after, color, ink }
  })
  assert.notEqual(colors.before, colors.after, 'kartu infaq berubah mengikuti tema')
  assert.equal(colors.color, colors.ink, 'teks kartu mengikuti warna kontras tema')
  await page.screenshot({ path: `${SHOTS}/16-lainnya.png` })
  await tap('.more-infaq')
  await page.waitForSelector('[data-infaq-open]', T)
})

await step('Tidak ada error JavaScript', async () => assert.deepEqual(errors, []))
await browser.close()
process.exit(failed ? 1 : 0)
