// Uji integrasi Papan Kebaikan (anonim): webhook Trakteer → SQL sungguhan (SQLite, mesin yang sama dengan D1) → /api/donors.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fakeD1 } from './helpers.mjs'
import { ensureSchema } from '../functions/lib/db.js'
import { onRequestPost } from '../functions/api/trakteer-webhook.js'
import { onRequestGet } from '../functions/api/donors.js'

const post = (env, body) => onRequestPost({ request: new Request('https://x/api/trakteer-webhook', { method: 'POST', headers: { 'X-Webhook-Token': 't', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env })

test('webhook → D1 → Papan Kebaikan anonim (tanpa nama & nominal)', async () => {
  const env = { DB: fakeD1(), TRAKTEER_WEBHOOK_TOKEN: 't' }
  await ensureSchema(env.DB)
  const now = Date.now()
  const iso = (ms) => new Date(ms).toISOString()
  const day = 86400000
  const tx = [
    { transaction_id: 'a1', supporter_name: 'Budi', supporter_message: 'Semoga berkah', price: 10000, quantity: 1, unit: 'Kopi', created_at: iso(now - 60000) },
    { transaction_id: 'a2', supporter_name: 'budi', price: 15000, quantity: 1, unit: 'Kopi', created_at: iso(now - 30000) },
    { transaction_id: 'a3', supporter_name: 'Aisyah', supporter_message: 'Jazakumullah khairan', price: 20000, quantity: 2, unit: 'Kopi', created_at: iso(now - 10000) },
    { transaction_id: 'test-1', supporter_name: 'Tes', supporter_message: 'uji', price: 5000, quantity: 1, unit: 'Kopi', type: 'test', created_at: iso(now) }
  ]
  for (const t of tx) assert.equal((await post(env, t)).status, 200)
  // Donasi lama dimasukkan langsung (webhook sengaja menolak cap waktu yang terlalu jauh dari sekarang).
  env.DB._db.prepare("INSERT INTO donations (id, name, amount, created_at, message) VALUES ('old', 'Lama', 999000, ?, 'Doa lama')").run(now - 40 * day)
  assert.equal((await post(env, tx[0])).status, 200, 'kiriman ulang diterima')
  assert.equal(env.DB._db.prepare('SELECT COUNT(*) AS c FROM donations').get().c, 5, 'duplikat tidak menggandakan baris')

  const res = await onRequestGet({ env })
  assert.equal(res.status, 200)
  const j = await res.json()
  assert.ok(j.ok)
  // Publik hanya menerima hitungan + doa; nama & nominal tidak pernah bocor.
  assert.equal(j.totals.count, 4)
  assert.equal(j.totals.doaCount, 3)
  assert.equal(j.doa.length, 3, 'hanya yang punya pesan yang masuk dinding doa')
  assert.equal(j.doa[0].message, 'Jazakumullah khairan')
  assert.ok(!JSON.stringify(j).includes('Budi') && !JSON.stringify(j).includes('Aisyah') && !JSON.stringify(j).includes('Lama'), 'nama donatur tidak dikirim ke publik')
  assert.ok(!JSON.stringify(j).includes('10000') && !JSON.stringify(j).includes('999000'), 'nominal tidak dikirim ke publik')
  assert.ok(!JSON.stringify(j).includes('uji'), 'transaksi tes disembunyikan')
  assert.equal(j.top, undefined)
  assert.equal(j.latest, undefined)
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
  const doa0 = (await (await call('/api/donors')).json()).doa[0]
  assert.equal(doa0.message, 'Semoga bermanfaat bya/b') // pesan donatur disimpan, tanpa tanda < >
  assert.equal(doa0.name, undefined, 'nama tidak dikirim ke publik')
  assert.equal(doa0.amount, undefined, 'nominal tidak dikirim ke publik')
  // Secret yang tersimpan dengan tanda kutip / baris baru tetap cocok; payload uji dari dasbor (id "test-…") diterima 200
  const env2 = { ...env, TRAKTEER_WEBHOOK_TOKEN: '"trhook-abc123"\n' }
  const hook = (h, b) => worker.fetch(new Request('https://quran.cgs.my.id/api/trakteer-webhook', { method: 'POST', headers: h, body: JSON.stringify(b) }), env2, ctx)
  const sample = { created_at: '2023-07-14T14:50:10+07:00', transaction_id: 'test-xxxxxxxx', type: 'tip', supporter_name: 'Egis', supporter_message: 'Selalu Berkarya', unit: 'Kopi', quantity: 1, price: 5000, net_amount: 4750 }
  assert.equal((await hook({ 'X-Webhook-Token': 'trhook-abc123', 'content-type': 'application/json' }, sample)).status, 200)
  assert.equal((await hook({}, sample)).status, 401)
  assert.equal((await hook({ 'X-Webhook-Token': 'trhook-abc124' }, sample)).status, 401)
  assert.equal((await call('/api/tidak-ada')).status, 404)
})
