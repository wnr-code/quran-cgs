// Uji halaman kalender di peramban: ketuk tanggal → rincian, tambah/ubah/hapus catatan, tanda di sel.
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
const puppeteer = (await import(process.env.PUPPETEER_PATH || 'puppeteer-core')).default
const BASE = process.env.BASE_URL || 'http://localhost:8787'
const SHOTS = process.env.SHOTS_DIR || 'store/screenshots'
mkdirSync(SHOTS, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: 'shell', args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const T = { timeout: 30000 }
let failed = 0
const step = async (name, fn) => {
  try {
    await fn()
    console.log('✓', name)
  } catch (e) {
    failed++
    console.log('✗', name, '—', String(e.message).slice(0, 300))
    await page.screenshot({ path: `/tmp/kalender-gagal-${failed}.png` }).catch(() => {})
  }
}
const js = (sel) => page.$eval(sel, (e) => e.click())

await step('Kalender tampil; ketuk hari besar menampilkan keterangannya', async () => {
  await page.goto(`${BASE}/#/kalender`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[data-grid] button.cal-cell', T)
  // Maju sampai ada bulan yang memuat hari besar
  for (let i = 0; i < 14 && !(await page.$('button.cal-cell.event')); i++) await js('[data-m="1"]')
  await js('button.cal-cell.event')
  await page.waitForSelector('.sheet-wrap.open .day-event', T)
  const ev = await page.$eval('.day-event', (e) => ({ name: e.querySelector('strong').textContent, desc: e.querySelector('p').textContent }))
  assert.ok(ev.name.length > 3 && ev.desc.length > 40, JSON.stringify(ev))
  await page.screenshot({ path: `${SHOTS}/17-kalender-rincian.png` })
  await js('.sheet-head [data-close]')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'), T)
  await js('[data-today]')
})

await step('Tanggal merah & pasaran: Natal 2026 merah, rincian memuat weton dan nama libur', async () => {
  const now = await page.evaluate(() => [new Date().getFullYear(), new Date().getMonth()])
  const steps = (2026 - now[0]) * 12 + (11 - now[1])
  for (let i = 0; i < Math.abs(steps); i++) await js(`[data-m="${steps > 0 ? 1 : -1}"]`)
  await page.waitForSelector('[data-day="2026-12-25"].red', T)
  assert.ok(await page.$('[data-day="2026-12-27"].red'), 'hari Minggu merah')
  assert.equal(await page.$('[data-day="2026-12-24"].red'), null)
  await js('[data-day="2026-12-25"]')
  await page.waitForSelector('.sheet-wrap.open [data-weton]', T)
  assert.equal(await page.$eval('[data-weton]', (e) => e.textContent), 'Jumat Legi')
  assert.match(await page.$eval('.day-event.red', (e) => e.textContent), /Natal.*SKB 3 Menteri/)
  await page.screenshot({ path: `${SHOTS}/19-kalender-tanggal-merah.png` })
  await js('.sheet-head [data-close]')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'), T)
  await page.screenshot({ path: `${SHOTS}/20-kalender-desember.png` })
  await js('[data-today]')
})

await step('Catatan: tambah dengan pengingat, tanda muncul di sel, ubah, bertahan setelah muat ulang, hapus', async () => {
  await js('button.cal-cell.today')
  await page.waitForSelector('.sheet-wrap.open [data-form]', T)
  await page.type('[data-text]', 'Kajian tafsir bakda magrib')
  await js('[data-remind]')
  await page.waitForFunction(() => !document.querySelector('[data-time]').disabled, T)
  await js('[data-save]')
  await page.waitForFunction(() => document.querySelectorAll('.day-notes li').length === 1, T)
  assert.match(await page.$eval('.day-notes li', (e) => e.textContent), /Kajian tafsir bakda magrib.*Pengingat pukul 07:00/)
  // ubah
  await js('[data-edit]')
  await page.$eval('[data-text]', (t) => (t.value = ''))
  await page.type('[data-text]', 'Kajian tafsir <b>diubah</b>')
  await js('[data-save]')
  await page.waitForFunction(() => /diubah/.test(document.querySelector('.day-notes li')?.textContent || ''), T)
  assert.equal(await page.$('.day-notes li b'), null, 'teks catatan tidak boleh menjadi HTML')
  await page.screenshot({ path: `${SHOTS}/18-kalender-catatan.png` })
  await js('.sheet-head [data-close]')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap'), T)
  assert.ok(await page.$('button.cal-cell.today .dot.rem'), 'tanda pengingat di sel')
  assert.match(await page.$eval('#view', (e) => e.textContent), /Catatan bulan ini/)
  await page.screenshot({ path: `${SHOTS}/06-kalender.png` })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('button.cal-cell.today .dot.rem', T)
  await js('button.cal-cell.today')
  await page.waitForSelector('.day-notes li', T)
  await js('[data-del]')
  await page.waitForFunction(() => !document.querySelector('.day-notes li'), T)
  await js('.sheet-head [data-close]')
  await page.waitForFunction(() => !document.querySelector('.sheet-wrap') && !document.querySelector('button.cal-cell.today .dot'), T)
})

await step('Tidak ada error JavaScript', async () => assert.deepEqual(errors, []))
await browser.close()
process.exit(failed ? 1 : 0)
