// Alur infaq dalam aplikasi: niat → (QRIS langsung | halaman pembayaran) → menunggu → terkonfirmasi.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fakeD1 } from './helpers.mjs'
import { ensureSchema } from '../functions/lib/db.js'
import { mapSupport, parseWib, extractPayment, syncSupports, createDirectQris } from '../functions/lib/provider.js'
import worker from '../worker/index.js'

const QR = '00020101021226670016COM.NOBUBANK.WWW01189360050300000879140214844519767362640303UME51440014ID.CO.QRIS.WWW0215ID20222128523070303UME5204839853033605405100005802ID5909LANTERAKU6007JAKARTA61051234062070703A016304ABCD'
const baseEnv = () => ({ DB: fakeD1(), TRAKTEER_WEBHOOK_TOKEN: 'tok', INFAQ_USERNAME: 'lanteraku', INFAQ_UNIT_PRICE: '5000', ASSETS: { fetch: async () => new Response('aset') } })
const ctx = { waitUntil() {} }
const call = (env, path, init = {}) => worker.fetch(new Request('https://quran.cgs.my.id' + path, { ...init, headers: { 'CF-Connecting-IP': '1.2.3.4', ...(init.headers || {}) } }), env, ctx)
const post = (env, path, body, headers) => call(env, path, { method: 'POST', body: JSON.stringify(body), headers })
const webhook = (env, tx) => post(env, '/api/trakteer-webhook', tx, { 'X-Webhook-Token': 'tok' })
const wib = (ms) => new Date(ms + 7 * 3600000).toISOString().slice(0, 19).replace('T', ' ')

/** Mengganti fetch global selama fn berjalan. */
async function withFetch(impl, fn) {
  const orig = globalThis.fetch
  globalThis.fetch = impl
  try {
    return await fn()
  } finally {
    globalThis.fetch = orig
  }
}
const noNetwork = async () => {
  throw new Error('jaringan tidak boleh dipanggil')
}

test('pemetaan Public API /supports', () => {
  assert.equal(parseWib('2025-03-11 13:44:07'), Date.UTC(2025, 2, 11, 6, 44, 7))
  const now = Date.UTC(2025, 2, 12)
  const d = mapSupport({ creator_name: 'Janessa West', support_message: 'x', quantity: 2, amount: 30000, unit_name: 'Kopi', status: 'success', updated_at: '2025-03-11 13:44:07', order_id: 'j1ee3b42-35f8-5cb1-a316-a405bee9d3a1' }, now)
  assert.deepEqual({ id: d.id, name: d.name, amount: d.amount, quantity: d.quantity, unit: d.unit }, { id: 'j1ee3b42-35f8-5cb1-a316-a405bee9d3a1', name: 'Janessa West', amount: 30000, quantity: 2, unit: 'Kopi' })
  assert.equal(mapSupport({ amount: 1000, status: 'pending', updated_at: '2025-03-11 13:44:07', order_id: 'abcdefg' }, now), null, 'hanya transaksi sukses')
  assert.equal(mapSupport({ amount: 1000, status: 'success', updated_at: '2025-03-11 13:44:07' }, now), null, 'tanpa order_id ditolak')
  assert.ok(mapSupport({ amount: 1000, status: 'success', updated_at: '2025-03-11 13:44:07', order_id: 'abcdefg' }, now).nameUnknown)
})

test('ekstraksi QRIS dari respons berbentuk apa pun', () => {
  assert.equal(extractPayment({ data: { qr_string: QR, external_id: 'trx-12345678' } }).qr, QR)
  assert.equal(extractPayment({ data: { qr_string: QR, external_id: 'trx-12345678' } }).ref, 'trx-12345678')
  assert.equal(extractPayment({ a: [{ b: { payload: QR } }] }).qr, QR)
  assert.equal(extractPayment({ message: 'Unauthenticated.' }).qr, '')
  assert.equal(extractPayment({ qr: '<script>000201' }).qr, '')
})

test('tanpa kunci QRIS langsung: mode halaman pembayaran, dikonfirmasi oleh webhook', async () => {
  const env = baseEnv()
  await withFetch(noNetwork, async () => {
    const cfg = await (await call(env, '/api/infaq/config')).json()
    assert.deepEqual({ enabled: cfg.enabled, unitPrice: cfg.unitPrice, direct: cfg.direct }, { enabled: true, unitPrice: 5000, direct: false })
    assert.equal((await post(env, '/api/infaq/create', { quantity: 0 })).status, 400)
    assert.equal((await post(env, '/api/infaq/create', { quantity: 99999 })).status, 400)
    const c = await (await post(env, '/api/infaq/create', { quantity: 4, name: ' <b>Fatimah</b> ' })).json()
    assert.equal(c.mode, 'redirect')
    assert.equal(c.amount, 20000)
    assert.equal(c.name, 'bFatimah/b')
    assert.equal(c.url, 'https://trakteer.id/lanteraku/tip?quantity=4')
    assert.equal((await (await call(env, '/api/infaq/status?id=' + c.id)).json()).status, 'pending')
    assert.equal((await call(env, '/api/infaq/status?id=bukan-id')).status, 404)
    // Donasi lain dengan nominal berbeda tidak mengonfirmasi niat ini
    await webhook(env, { transaction_id: 'tx-lain-1', supporter_name: 'Orang Lain', price: 5000, quantity: 1 })
    assert.equal((await (await call(env, '/api/infaq/status?id=' + c.id)).json()).status, 'pending')
    await webhook(env, { transaction_id: 'tx-fatimah-1', supporter_name: 'bfatimah/b', price: 20000, quantity: 4 })
    const s = await (await call(env, '/api/infaq/status?id=' + c.id)).json()
    assert.equal(s.status, 'paid')
    assert.equal(s.donation.amount, 20000)
    // Satu donasi tidak bisa mengonfirmasi dua niat
    const c2 = await (await post(env, '/api/infaq/create', { quantity: 4, name: 'bFatimah/b' })).json()
    assert.equal((await (await call(env, '/api/infaq/status?id=' + c2.id)).json()).status, 'pending')
  })
})

test('nominal sama dari dua orang tidak tertukar; klaim dengan ID transaksi', async () => {
  const env = baseEnv()
  await withFetch(noNetwork, async () => {
    const a = await (await post(env, '/api/infaq/create', { quantity: 2, name: 'Ali' })).json()
    const b = await (await post(env, '/api/infaq/create', { quantity: 2, name: 'Bilal' })).json()
    // Donatur mengisi nama berbeda di halaman pembayaran → tidak ada kecocokan nama, dua niat menunggu → tidak otomatis
    await webhook(env, { transaction_id: 'tx-anon-77', supporter_name: 'Seseorang', price: 10000, quantity: 2 })
    assert.equal((await (await call(env, '/api/infaq/status?id=' + a.id)).json()).status, 'pending')
    assert.equal((await (await call(env, '/api/infaq/status?id=' + b.id)).json()).status, 'pending')
    assert.equal((await post(env, '/api/infaq/claim', { id: b.id, ref: 'x' })).status, 400)
    const miss = await (await post(env, '/api/infaq/claim', { id: b.id, ref: 'tx-tidak-ada' })).json()
    assert.equal(miss.status, 'pending')
    assert.equal(miss.claim, 'not_found')
    const ok = await (await post(env, '/api/infaq/claim', { id: b.id, ref: 'tx-anon-77' })).json()
    assert.equal(ok.status, 'paid')
    const dup = await (await post(env, '/api/infaq/claim', { id: a.id, ref: 'tx-anon-77' })).json()
    assert.equal(dup.status, 'pending', 'ID transaksi yang sama tidak bisa dipakai dua kali')
  })
})

test('QRIS langsung: berhasil → mode qris; gagal → otomatis ke halaman pembayaran', async () => {
  const env = { ...baseEnv(), TRAKTEER_SESSION: 'sess-rahasia', TRAKTEER_CSRF_TOKEN: 'csrf', TRAKTEER_CREATOR_ID: 'cr', TRAKTEER_UNIT_ID: 'un' }
  let sent
  await withFetch(
    async (url, init) => {
      sent = { url: String(url), init }
      return new Response(JSON.stringify({ status: 'success', data: { qr_string: QR, external_id: 'trx-qris-0001' } }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
    async () => {
      const c = await (await post(env, '/api/infaq/create', { quantity: 2, name: 'Zaid', message: 'Barakallah' })).json()
      assert.equal(c.mode, 'qris')
      assert.equal(c.qr, QR)
      assert.equal(c.url, undefined)
      assert.ok(!JSON.stringify(c).includes('sess-rahasia'), 'rahasia tidak pernah dikirim ke peramban')
      assert.equal(sent.url, 'https://trakteer.id/pay/xendit/qris')
      const body = JSON.parse(sent.init.body)
      assert.deepEqual({ q: body.quantity, n: body.display_name, m: body.payment_method, c: body.creator_id }, { q: 2, n: 'Zaid', m: 'qris', c: 'cr' })
      assert.equal(sent.init.headers.Cookie, 'trakteer-sess=sess-rahasia')
      // Webhook dengan ID yang sama dengan referensi QRIS langsung mengonfirmasi
      await webhook(env, { transaction_id: 'trx-qris-0001', supporter_name: 'Nama Lain', price: 10000, quantity: 2 })
      assert.equal((await (await call(env, '/api/infaq/status?id=' + c.id)).json()).status, 'paid')
    }
  )
  await withFetch(
    async () => new Response('<html>login</html>', { status: 419, headers: { 'content-type': 'text/html' } }),
    async () => {
      const c = await (await post(env, '/api/infaq/create', { quantity: 1, name: 'Zaid' })).json()
      assert.equal(c.mode, 'redirect')
      assert.ok(c.url.endsWith('/tip?quantity=1'))
      const diag = await (await call(env, '/api/infaq/diag', { headers: { 'X-Webhook-Token': 'tok' } })).json()
      assert.equal(diag.lastDirect.status, 419)
      assert.equal(diag.lastDirect.qr, false)
      assert.ok(!JSON.stringify(diag).includes('sess-rahasia'))
      assert.equal((await call(env, '/api/infaq/diag')).status, 401)
    }
  )
  assert.deepEqual(await createDirectQris(baseEnv(), { quantity: 1, name: 'x' }), { ok: false, reason: 'not_configured' })
})

test('Public API: sinkronisasi mengonfirmasi niat & tidak menggandakan donasi webhook', async () => {
  const env = { ...baseEnv(), TRAKTEER_API_KEY: 'kunci-api' }
  await ensureSchema(env.DB)
  const now = Date.now()
  let calls = 0
  let seenKey
  const api = async (url, init) => {
    calls++
    seenKey = init.headers.key
    assert.match(String(url), /^https:\/\/api\.trakteer\.id\/v1\/public\/supports\?include=/)
    return new Response(JSON.stringify({ status: 'success', status_code: 200, result: { data: [
      { creator_name: 'Hasan', quantity: 3, amount: 15000, unit_name: 'Kopi', status: 'success', updated_at: wib(now - 5000), order_id: 'ord-hasan-001' },
      { creator_name: 'Budi', quantity: 1, amount: 5000, unit_name: 'Kopi', status: 'success', updated_at: wib(now - 20000), order_id: 'ord-budi-xyz' },
      { creator_name: 'Gagal', quantity: 1, amount: 5000, unit_name: 'Kopi', status: 'failed', updated_at: wib(now - 20000), order_id: 'ord-gagal-1' }
    ] }, message: 'OK' }), { status: 200 })
  }
  await withFetch(api, async () => {
    // Donasi Budi sudah masuk lewat webhook dengan ID berbeda → tidak boleh terhitung dua kali
    await webhook(env, { transaction_id: 'wh-budi-123', supporter_name: 'budi', price: 5000, quantity: 1 })
    const c = await (await post(env, '/api/infaq/create', { quantity: 3, name: 'Hasan' })).json()
    const s = await (await call(env, '/api/infaq/status?id=' + c.id)).json()
    assert.equal(s.status, 'paid', 'terkonfirmasi lewat Public API tanpa webhook')
    assert.equal(seenKey, 'kunci-api')
    const rows = env.DB._db.prepare('SELECT id, source FROM donations ORDER BY id').all()
    assert.deepEqual(rows.map((r) => r.id), ['ord-hasan-001', 'wh-budi-123'])
    const before = calls
    assert.equal((await syncSupports(env)).skipped, true, 'dibatasi: tidak memanggil API terlalu sering')
    assert.equal(calls, before)
  })
  const bad = await withFetch(async () => new Response('{"message":"Unauthorized"}', { status: 401 }), () => syncSupports(env, { minInterval: 0 }))
  assert.deepEqual(bad, { ok: false, reason: 'http_401' })
})

test('pembatasan permintaan & skema lama', async () => {
  const env = baseEnv()
  await withFetch(noNetwork, async () => {
    let last
    for (let i = 0; i < 7; i++) last = await post(env, '/api/infaq/create', { quantity: 1, name: 'Spam' })
    assert.equal(last.status, 429)
  })
  // Tabel donations lama (tanpa kolom source) ditingkatkan otomatis
  const old = fakeD1()
  old._db.exec(readFileSync('migrations/0001_donations.sql', 'utf8'))
  await ensureSchema(old)
  assert.ok(old._db.prepare('PRAGMA table_info(donations)').all().some((c) => c.name === 'source'))
  assert.equal((await call({ ...baseEnv(), INFAQ_UNIT_PRICE: '' }, '/api/infaq/create', { method: 'POST', body: '{"quantity":1}' })).status, 503)
})
