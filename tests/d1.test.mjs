// Uji integrasi papan donatur: webhook Trakteer → SQL sungguhan (SQLite, mesin yang sama dengan D1) → /api/donors.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fakeD1 } from './helpers.mjs'
import { ensureSchema } from '../functions/lib/db.js'
import { onRequestPost } from '../functions/api/trakteer-webhook.js'
import { onRequestGet } from '../functions/api/donors.js'

const post = (env, body) => onRequestPost({ request: new Request('https://x/api/trakteer-webhook', { method: 'POST', headers: { 'X-Webhook-Token': 't', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env })

test('webhook → D1 → papan donatur harian/mingguan/bulanan', async () => {
  const env = { DB: fakeD1(), TRAKTEER_WEBHOOK_TOKEN: 't' }
  await ensureSchema(env.DB)
  const now = Date.now()
  const iso = (ms) => new Date(ms).toISOString()
  const day = 86400000
  const tx = [
    { transaction_id: 'a1', supporter_name: 'Budi', price: 10000, quantity: 1, unit: 'Kopi', created_at: iso(now - 60000) },
    { transaction_id: 'a2', supporter_name: 'budi', price: 15000, quantity: 1, unit: 'Kopi', created_at: iso(now - 30000) },
    { transaction_id: 'a3', supporter_name: 'Aisyah', price: 20000, quantity: 2, unit: 'Kopi', created_at: iso(now - 10000) },
    { transaction_id: 'test-1', supporter_name: 'Tes', price: 5000, quantity: 1, unit: 'Kopi', type: 'test', created_at: iso(now) }
  ]
  for (const t of tx) assert.equal((await post(env, t)).status, 200)
  // Donasi lama dimasukkan langsung (webhook sengaja menolak cap waktu yang terlalu jauh dari sekarang).
  env.DB._db.prepare("INSERT INTO donations (id, name, amount, created_at) VALUES ('old', 'Lama', 999000, ?)").run(now - 40 * day)
  assert.equal((await post(env, tx[0])).status, 200, 'kiriman ulang diterima')
  assert.equal(env.DB._db.prepare('SELECT COUNT(*) AS c FROM donations').get().c, 5, 'duplikat tidak menggandakan baris')

  const res = await onRequestGet({ env })
  assert.equal(res.status, 200)
  const j = await res.json()
  assert.ok(j.ok)
  const names = (l) => l.map((x) => `${x.name.toLowerCase()}:${x.amount}`)
  assert.deepEqual(names(j.top.monthly).slice(0, 2), ['budi:25000', 'aisyah:20000'], 'nama digabung tanpa beda huruf besar/kecil')
  assert.ok(!names(j.top.monthly).some((n) => n.startsWith('lama')), 'donasi 40 hari lalu di luar bulan ini')
  assert.equal(names(j.top.all)[0], 'lama:999000')
  assert.ok(!JSON.stringify(j).includes('"Tes"'), 'transaksi tes disembunyikan')
  assert.equal(j.totals.count, 4)
  assert.equal(j.totals.amount, 1044000)
  assert.equal(j.latest[0].name, 'Aisyah')
})

test('worker: rute /api/* ke handler, selain itu ke aset statis', async () => {
  const worker = (await import('../worker/index.js')).default
  const env = { DB: fakeD1(), TRAKTEER_WEBHOOK_TOKEN: 't', ASSETS: { fetch: async (r) => new Response('ASET ' + new URL(r.url).pathname) } }
  const ctx = { waitUntil() {} }
  const call = (path, init) => worker.fetch(new Request('https://quran.cgs.my.id' + path, init), env, ctx)
  assert.equal(await (await call('/')).text(), 'ASET /')
  assert.equal(await (await call('/assets/x.js')).text(), 'ASET /assets/x.js')
  const donors = await call('/api/donors')
  assert.equal(donors.status, 200)
  assert.ok((await donors.json()).ok)
  assert.equal((await call('/api/donors', { method: 'POST' })).status, 405)
  assert.equal((await call('/api/trakteer-webhook', { method: 'POST', headers: { 'X-Webhook-Token': 'salah' }, body: '{}' })).status, 401)
  const ok = await call('/api/trakteer-webhook', { method: 'POST', headers: { 'X-Webhook-Token': 't' }, body: JSON.stringify({ transaction_id: 'w1', supporter_name: 'Umar', supporter_message: '  Semoga   bermanfaat <b>ya</b>\n', price: 5000, quantity: 1 }) })
  assert.equal(ok.status, 200)
  const latest0 = (await (await call('/api/donors')).json()).latest[0]
  assert.equal(latest0.name, 'Umar')
  assert.equal(latest0.message, 'Semoga bermanfaat bya/b') // pesan donatur disimpan, tanpa tanda < >
  assert.equal((await call('/api/tidak-ada')).status, 404)
})
