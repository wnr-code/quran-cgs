// Uji halaman infaq di peramban terhadap Worker lokal (`npx wrangler dev --local`, dengan .dev.vars berisi
// TRAKTEER_WEBHOOK_TOKEN=token-uji-lokal). Respons QRIS langsung ditiru karena penyedia tidak terjangkau dari lingkungan uji.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
const puppeteer = (await import(process.env.PUPPETEER_PATH || 'puppeteer-core')).default
const BASE = process.env.BASE_URL || 'http://localhost:8787'
const TOKEN = process.env.WEBHOOK_TOKEN || 'token-uji-lokal'
const SHOTS = process.env.SHOTS_DIR || 'store/screenshots'
mkdirSync(SHOTS, { recursive: true })
const QR = '00020101021226670016COM.NOBUBANK.WWW01189360050300000879140214844519767362640303UME51440014ID.CO.QRIS.WWW0215ID20222128523070303UME5204839853033605405100005802ID5909LANTERAKU6007JAKARTA61051234062070703A016304ABCD'
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: 'shell', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
let fakeQris = false
await page.setRequestInterception(true)
page.on('request', async (req) => {
  const u = new URL(req.url())
  if (u.origin !== new URL(BASE).origin) return req.abort()
  if (fakeQris && u.pathname === '/api/infaq/create') {
    // Buat niat sungguhan di server, lalu tambahkan QR tiruan ke jawabannya (meniru mode QRIS langsung).
    const real = await (await fetch(BASE + u.pathname, { method: 'POST', headers: { 'content-type': 'application/json' }, body: req.postData() })).json()
    delete real.url
    return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...real, mode: 'qris', qr: QR }) })
  }
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
  await page.$eval(sel, (e) => e.scrollIntoView({ block: 'center' }))
  await page.click(sel)
}

await step('Formulir infaq tampil tanpa nama penyedia pembayaran', async () => {
  await page.goto(`${BASE}/#/infaq`, { waitUntil: 'domcontentloaded' })
  // Tombol INFAQ: identitas sesuai kode sematan (teks, warna, gambar unit)
  await page.waitForSelector('[data-infaq-open]', T)
  const btn = await page.$eval('[data-infaq-open]', (b) => ({ text: b.textContent.trim(), bg: getComputedStyle(b).backgroundColor, img: b.querySelector('img')?.getAttribute('src') || '' }))
  assert.equal(btn.text, 'INFAQ')
  assert.equal(btn.bg, 'rgb(26, 98, 117)') // #1A6275
  assert.match(btn.img, /^https:\/\/mirror-uploads\.trakteer\.id\/images\/units\/uic-WAJ1GG3F86NzLSXQAwcEDJTa83KnmEMF1794742909\.png$/)
  assert.equal(await page.$('.dlg-wrap'), null, 'popup belum terbuka')
  // Ketuk INFAQ → popup "INFAQ QURANKU" di atas halaman, alamat & halaman tidak berubah
  await tap('[data-infaq-open]')
  await page.waitForSelector('.dlg-wrap.open [data-pay]', T)
  assert.equal(await page.$eval('.dlg-head h2', (e) => e.textContent), 'INFAQ QURANKU')
  assert.equal(await page.$eval('.dlg-head', (e) => getComputedStyle(e).backgroundColor), 'rgb(26, 98, 117)')
  assert.ok(await page.$('.dlg-x[aria-label="Tutup"]'))
  assert.equal(new URL(page.url()).hash, '#/infaq')
  // Tombol kembali (Android) menutup popup lebih dulu, halaman tetap
  await page.goBack()
  await page.waitForFunction(() => !document.querySelector('.dlg-wrap'), T)
  assert.equal(new URL(page.url()).hash, '#/infaq')
  assert.ok(await page.$('[data-infaq-open]'))
  await tap('[data-infaq-open]')
  await page.waitForSelector('.dlg-wrap.open [data-pay]', T)
  const text = await page.$eval('#view', (e) => e.textContent)
  assert.ok(!/trakteer/i.test(text), 'nama penyedia masih tampil')
  assert.equal(await page.$eval('[data-total]', (e) => e.textContent.replace(/\s/g, '')), 'Rp10.000')
  await tap('[data-q="5"]')
  assert.equal(await page.$eval('[data-total]', (e) => e.textContent.replace(/\s/g, '')), 'Rp5.000')
  // Nominal minimal Rp1.000
  await tap('[data-q="1"]')
  assert.equal(await page.$eval('[data-total]', (e) => e.textContent.replace(/\s/g, '')), 'Rp1.000')
  assert.equal(await page.$eval('[data-custom]', (e) => e.min), '1000')
  await page.type('[data-custom]', '15000')
  assert.equal(await page.$eval('[data-total]', (e) => e.textContent.replace(/\s/g, '')), 'Rp15.000')
  await page.type('[data-name]', 'Penguji ' + uniq)
  await page.screenshot({ path: `${SHOTS}/10-infaq.png` })
})
await step('Mode halaman pembayaran: menunggu → otomatis “terima kasih” setelah webhook', async () => {
  // "Lanjut bayar" menampilkan formulir pembayaran di dalam popup (bingkai) dengan jumlah unit yang sama — tanpa tab baru.
  await tap('[data-pay]')
  await page.waitForSelector('.dlg-wrap.open iframe[data-frame]', T)
  const payUrl = 'https://trakteer.id/lanteraku/tip?quantity=15'
  assert.equal(await page.$eval('iframe[data-frame]', (f) => f.getAttribute('src')), payUrl)
  assert.equal(await page.$eval('a[data-open]', (a) => a.href), payUrl) // jalan cadangan bila bingkai ditolak
  await new Promise((r) => setTimeout(r, 600))
  assert.equal((await browser.pages()).length, pagesBefore, 'tidak ada tab baru')
  assert.equal(new URL(page.url()).hash, '#/infaq', 'halaman aplikasi tidak berpindah')
  await page.screenshot({ path: `${SHOTS}/15-infaq-popup.png` })
  // Menutup popup BUKAN bukti bayar: niat tetap menunggu, bingkai dilepas, dan bisa dilanjutkan
  await page.click('.dlg-x')
  await page.waitForFunction(() => !document.querySelector('.dlg-wrap'), T)
  assert.equal(await page.$('iframe[data-frame]'), null)
  assert.match(await page.$eval('[data-cta-note]', (e) => e.textContent), /sedang menunggu pembayaran/)
  await tap('[data-infaq-open]')
  await page.waitForSelector('.dlg-wrap.open iframe[data-frame]', T)
  assert.match(await page.$eval('[data-left]', (e) => e.textContent), /^\d\d:\d\d$/)
  // Pindah halaman lalu kembali: niat infaq yang sedang menunggu dipulihkan
  await page.evaluate(() => (location.hash = '#/tentang'))
  await page.waitForSelector('.source-group', T)
  await page.evaluate(() => (location.hash = '#/infaq'))
  await page.waitForFunction(() => /sedang menunggu pembayaran/.test(document.querySelector('[data-cta-note]')?.textContent || ''), T)
  await page.reload({ waitUntil: 'load' }) // juga bertahan setelah muat ulang penuh
  await page.waitForFunction(() => /sedang menunggu pembayaran/.test(document.querySelector('[data-cta-note]')?.textContent || ''), T)
  await tap('[data-infaq-open]')
  await page.waitForSelector('.dlg-wrap.open iframe[data-frame]', T)
  await webhook({ transaction_id: 'e2e-a-' + uniq, supporter_name: 'penguji ' + uniq, price: 15000, quantity: 15, unit: 'Kopi' })
  await page.waitForSelector('.infaq-result.ok', T)
  assert.match(await page.$eval('.infaq-result.ok', (e) => e.textContent), /15\.000/)
  await page.screenshot({ path: `${SHOTS}/13-infaq-terima-kasih.png` })
  await page.waitForFunction((n) => document.querySelector('[data-latest]').textContent.toLowerCase().includes(n), T, 'penguji ' + uniq)
})
await step('Mode QRIS: kode QR digambar, dapat diunduh, lalu terkonfirmasi lewat ID transaksi', async () => {
  fakeQris = true
  await page.setBypassServiceWorker(true) // permintaan lewat Service Worker tidak bisa dicegat penguji
  await page.click('.dlg-wrap [data-again]') // "Selesai" menutup popup
  await page.waitForFunction(() => !document.querySelector('.dlg-wrap'), T)
  await tap('[data-infaq-open]')
  await page.waitForSelector('.dlg-wrap.open [data-pay]', T)
  await tap('[data-q="2"]')
  await tap('[data-pay]')
  await page.waitForSelector('[data-qr]', T)
  await page.waitForFunction(() => document.querySelector('[data-qr]').width > 200, T)
  const dark = await page.$eval('[data-qr]', (c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128) n++
    return n / (d.length / 4)
  })
  assert.ok(dark > 0.2 && dark < 0.6, 'kanvas QR tidak tergambar: ' + dark)
  assert.equal(await page.$('[data-open]'), null, 'tidak ada tautan keluar pada mode QRIS')
  assert.equal(await page.$('iframe[data-frame]'), null)
  await page.screenshot({ path: `${SHOTS}/14-infaq-qris.png` })
  // Donatur memakai nama lain saat membayar → tidak otomatis; konfirmasi dengan ID transaksi
  await webhook({ transaction_id: 'e2e-b-' + uniq, supporter_name: 'Orang Lain ' + uniq, price: 10000, quantity: 2, unit: 'Kopi' })
  await tap('.infaq-claim summary')
  await page.type('[data-ref]', 'id-salah-123')
  await tap('[data-claim]')
  await page.waitForFunction(() => /belum ditemukan/.test(document.querySelector('[data-claim-msg]').textContent), T)
  await page.$eval('[data-ref]', (i) => (i.value = ''))
  await page.type('[data-ref]', 'e2e-b-' + uniq)
  await tap('[data-claim]')
  await page.waitForSelector('.infaq-result.ok', T)
})
await step('Tidak ada error JavaScript', async () => assert.deepEqual(errors, []))
await browser.close()
process.exit(failed ? 1 : 0)
