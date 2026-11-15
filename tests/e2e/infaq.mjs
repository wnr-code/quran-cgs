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
  const btn = await page.$eval('[data-infaq-open]', (b) => ({ text: b.textContent.trim(), bg: getComputedStyle(b).backgroundColor, img: b.querySelector('img')?.getAttribute('src') || '' }))
  assert.equal(btn.text, 'INFAQ')
  assert.equal(btn.bg, 'rgb(26, 98, 117)') // #1A6275
  assert.equal(btn.img, 'https://mirror-uploads.trakteer.id/images/units/uic-WAJ1GG3F86NzLSXQAwcEDJTa83KnmEMF1794742909.png')
  assert.ok(!/trakteer/i.test(await page.$eval('#view', (e) => e.textContent)), 'nama penyedia masih tampil')
  assert.equal(await page.$('[data-q], [data-custom], [data-pay]'), null, 'tidak ada lagi isian nominal di aplikasi')
})

await step('INFAQ membuka popup sematan di atas halaman: tanpa tab baru, tombol kembali menutup', async () => {
  const opened = frameOpened()
  await tap('[data-infaq-open]')
  await page.waitForSelector('.trk-overlay.open iframe', T)
  const src = await page.$eval('.trk-overlay iframe', (f) => f.src)
  assert.equal(src, `${EMBED}?embedId=0&ref=${BASE}/`)
  assert.equal(await opened, true, 'bingkai tidak menerima embed.openModal')
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
  await tap('[data-infaq-open]')
  assert.equal(await again, true)
  const frame = await (await page.$('.trk-overlay iframe')).contentFrame()
  await frame.click('#c')
  await page.waitForFunction(() => !document.querySelector('.trk-overlay'), T)
  // Tombol X milik aplikasi
  await tap('[data-infaq-open]')
  await page.waitForSelector('.trk-overlay.open', T)
  await page.click('[data-trk-close]')
  await page.waitForFunction(() => !document.querySelector('.trk-overlay'), T)
  assert.equal(new URL(page.url()).hash, '#/infaq')
  assert.equal((await browser.pages()).length, pagesBefore)
  assert.ok(embedRequests.length >= 3)
})

await step('Papan donatur: menutup popup tidak menambah donatur; webhook menampilkan nama, nominal & ucapan', async () => {
  const name = 'Penguji ' + uniq
  assert.ok(!(await page.$eval('#view', (e) => e.textContent)).includes(name), 'popup ditutup ≠ sudah bayar')
  const r = await webhook({ transaction_id: 'e2e-m-' + uniq, supporter_name: name, supporter_message: 'Semoga berkah <script>x</script> ' + uniq, price: 25000, quantity: 25, unit: 'Kopi' })
  assert.equal(r.status, 200)
  await tap('[data-infaq-open]')
  await page.waitForSelector('.trk-overlay.open', T)
  await page.click('[data-trk-close]') // papan dimuat ulang setelah popup ditutup
  await page.waitForFunction((n) => [...document.querySelectorAll('.wish strong')].some((e) => e.textContent === n), T, name)
  const wish = await page.evaluate((n) => {
    const li = [...document.querySelectorAll('.wish')].find((e) => e.querySelector('strong').textContent === n)
    return { amount: li.querySelector('.wish-head b').textContent, msg: li.querySelector('.wish-msg')?.textContent || '', html: li.innerHTML }
  }, name)
  assert.match(wish.amount, /25\.000/)
  assert.ok(wish.msg.startsWith('Semoga berkah') && wish.msg.includes(uniq), wish.msg)
  assert.ok(!/<script/i.test(wish.html))
  assert.ok(await page.$('.podium .podium-col.p1'))
  assert.equal(await page.$eval('[data-stats]', (e) => e.hidden), false)
  await page.$eval('.infaq-stats', (e) => e.scrollIntoView({ block: 'start' }))
  await page.screenshot({ path: `${SHOTS}/14-infaq-papan.png` })
})

await step('Halaman Lainnya: kartu infaq & menu tampil', async () => {
  await page.evaluate(() => (location.hash = '#/lainnya'))
  await page.waitForSelector('.more-page .more-infaq', T)
  assert.ok((await page.$$('.more-page .menu-item')).length >= 12)
  await page.screenshot({ path: `${SHOTS}/16-lainnya.png` })
  await tap('.more-infaq')
  await page.waitForSelector('[data-infaq-open]', T)
})

await step('Tidak ada error JavaScript', async () => assert.deepEqual(errors, []))
await browser.close()
process.exit(failed ? 1 : 0)
