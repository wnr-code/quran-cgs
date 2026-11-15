// Uji alamat cadangan: kedua alamat resmi dipetakan ke Worker lokal; lalu alamat utama "dimatikan" untuk
// permintaan data. Aplikasi harus tetap memuat surah & API lewat alamat cadangan (termasuk CORS dari Worker).
import assert from 'node:assert/strict'
const puppeteer = (await import(process.env.PUPPETEER_PATH || 'puppeteer-core')).default
const LOCAL = process.env.BASE_URL || 'http://localhost:8787'
const P = 'https://quran.cgs.my.id'
const B = 'https://quran-cgs.appwnr.workers.dev'
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: 'shell', args: ['--no-sandbox', '--disable-gpu'] })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 800, isMobile: true })
await page.setBypassServiceWorker(true)
await page.setRequestInterception(true)
let primaryDead = false
const viaBackup = []
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('request', async (req) => {
  const u = new URL(req.url())
  const origin = u.origin
  if (origin !== P && origin !== B) return /^https?:/.test(req.url()) && !req.url().startsWith(LOCAL) ? req.abort('failed') : req.continue()
  const isData = /^\/(api\/|data\/|version\.json)/.test(u.pathname)
  if (origin === P && primaryDead && isData) return req.abort('namenotresolved')
  if (origin === B) viaBackup.push(req.method() + ' ' + u.pathname)
  try {
    const h = { ...req.headers() }
    delete h.host
    const res = await fetch(LOCAL + u.pathname + u.search, { method: req.method(), headers: h, body: req.postData() })
    const headers = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    delete headers['content-encoding']
    delete headers['content-length']
    delete headers['content-security-policy']
    await req.respond({ status: res.status, headers, body: Buffer.from(await res.arrayBuffer()) })
  } catch {
    await req.abort('failed').catch(() => {})
  }
})
let n = 0
const step = async (name, fn) => {
  try {
    await fn()
    console.log('✓ ' + name)
    n++
  } catch (e) {
    console.log('✗ ' + name + '\n  ' + e.message)
    process.exitCode = 1
  }
}
await step('Alamat utama hidup: tidak ada permintaan ke cadangan', async () => {
  await page.goto(P + '/#/surah/1', { waitUntil: 'networkidle2' })
  await page.waitForSelector('.mushaf-flow .ayah')
  assert.equal(viaBackup.length, 0)
})
await step('Alamat utama mati: surah & API otomatis lewat alamat cadangan', async () => {
  primaryDead = true
  await page.evaluate(() => indexedDB.databases().then((l) => Promise.all(l.map((d) => new Promise((r) => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = r })))))
  await page.evaluate(() => (location.hash = '/surah/36'))
  await page.waitForSelector('.mushaf-flow .ayah[data-a="83"]', { timeout: 20000 })
  assert.ok(viaBackup.some((r) => r.startsWith('GET /data/surah/36') || r.startsWith('GET /api/quran/')), 'data surah diambil dari cadangan: ' + viaBackup.join(', '))
  const cfg = await page.evaluate(async () => {
    const r = await fetch('/api/infaq/config')
    return { ok: r.ok, url: r.url, body: await r.json() }
  })
  assert.ok(cfg.ok)
  assert.ok(cfg.url.startsWith('https://quran-cgs.appwnr.workers.dev/'), cfg.url)
})
await step('POST (dengan preflight CORS) juga dialihkan', async () => {
  const r = await page.evaluate(async () => {
    const x = await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: 'https://example.invalid/x' }) })
    return { status: x.status, url: x.url }
  })
  assert.ok(r.url.startsWith(B), r.url)
  assert.ok(r.status < 500, 'status ' + r.status)
  assert.ok(viaBackup.includes('OPTIONS /api/push/unsubscribe'), 'preflight dikirim')
})
await step('Alamat utama hidup lagi: kembali ke utama setelah masa tunggu', async () => {
  primaryDead = false
  await page.evaluate(() => (window.__failover.until = 0))
  const u = await page.evaluate(async () => (await fetch('/version.json?z=1')).url)
  assert.equal((await page.evaluate(async () => (await fetch('/api/tidak-ada')).status)), 404)
  assert.ok(u.startsWith('https://quran.cgs.my.id/'), u)
})
await step('Tidak ada error JavaScript', async () => assert.deepEqual(errors, []))
await browser.close()
