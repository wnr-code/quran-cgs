// Uji integrasi papan donatur: webhook Trakteer → SQL sungguhan (SQLite, mesin yang sama dengan D1) → /api/donors.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { onRequestPost } from '../functions/api/trakteer-webhook.js'
import { onRequestGet } from '../functions/api/donors.js'

/** Tiruan tipis antarmuka D1 di atas SQLite. */
function fakeD1() {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync('migrations/0001_donations.sql', 'utf8'))
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => ({ success: true, meta: db.prepare(sql).run(...args) }),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) ?? null
  })
  return { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.all())), _db: db }
}

const post = (env, body) => onRequestPost({ request: new Request('https://x/api/trakteer-webhook', { method: 'POST', headers: { 'X-Webhook-Token': 't', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env })

test('webhook → D1 → papan donatur harian/mingguan/bulanan', async () => {
  const env = { DB: fakeD1(), TRAKTEER_WEBHOOK_TOKEN: 't' }
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
