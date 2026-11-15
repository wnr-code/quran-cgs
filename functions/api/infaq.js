// Alur infaq di dalam aplikasi: buat niat infaq → (QRIS langsung | halaman pembayaran) → tunggu → terkonfirmasi.
// Konfirmasi hanya berasal dari data transaksi sukses (webhook / Public API), bukan dari klaim pengguna.
import { ensureSchema, insertDonation, metaGet, cleanText, json } from '../lib/db.js'
import { providerConfig, createDirectQris, syncSupports } from '../lib/provider.js'

const INTENT_TTL = 30 * 60 * 1000
const MAX_QTY = 2000
const PER_IP = 6 // niat infaq per IP per 10 menit
const GLOBAL = 120 // per jam, seluruh pengguna

async function ipKey(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || '0'
  const data = new TextEncoder().encode(`${ip}|${env.TRAKTEER_WEBHOOK_TOKEN || 'quranku'}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const newId = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')

const publicDonation = (d) => (d ? { name: d.name, amount: d.amount, at: d.created_at } : null)

export async function onConfig({ env }) {
  const cfg = providerConfig(env)
  return json({ ok: true, enabled: !!(cfg.username && cfg.unitPrice && env.DB), unitPrice: cfg.unitPrice, maxQuantity: MAX_QTY, direct: cfg.hasDirect }, 200, 'public, max-age=300')
}

export async function onCreate({ request, env }) {
  const cfg = providerConfig(env)
  if (!env.DB || !cfg.username || !cfg.unitPrice) return json({ ok: false, error: 'not_configured' }, 503)
  let body
  try {
    const raw = await request.text()
    if (raw.length > 4000) return json({ ok: false, error: 'too_large' }, 413)
    body = JSON.parse(raw)
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400)
  }
  const quantity = parseInt(body && body.quantity, 10)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) return json({ ok: false, error: 'invalid_quantity' }, 400)
  const name = cleanText(body.name, 40) || 'Hamba Allah'
  const message = cleanText(body.message, 150)

  await ensureSchema(env.DB)
  const now = Date.now()
  const ip = await ipKey(request, env)
  const [mine, all] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS c FROM infaq_intents WHERE ip = ?1 AND created_at > ?2').bind(ip, now - 600000),
    env.DB.prepare('SELECT COUNT(*) AS c FROM infaq_intents WHERE created_at > ?1').bind(now - 3600000)
  ])
  if (mine.results[0].c >= PER_IP || all.results[0].c >= GLOBAL) return json({ ok: false, error: 'rate_limited' }, 429)

  const id = newId()
  const amount = quantity * cfg.unitPrice
  const direct = await createDirectQris(env, { quantity, name, message })
  const mode = direct.ok ? 'qris' : 'redirect'
  await env.DB.prepare('INSERT INTO infaq_intents (id, name, quantity, amount, mode, ref, ip, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)')
    .bind(id, name, quantity, amount, mode, direct.ok ? direct.ref || null : null, ip, now)
    .run()
  const expiresAt = Math.min(now + INTENT_TTL, direct.ok && direct.expiresAt > now ? direct.expiresAt : Infinity)
  return json({ ok: true, id, mode, amount, quantity, name, expiresAt, ...(direct.ok ? { qr: direct.qr } : { url: cfg.pageUrl(quantity), embedUrl: cfg.embedUrl }) })
}

/** Mencari donasi sukses yang cocok dengan niat infaq dan belum dipakai niat lain. */
async function matchDonation(db, it) {
  const SQL = `SELECT d.* FROM donations d WHERE d.is_test = 0 AND d.created_at >= ?1 AND d.created_at <= ?2 AND d.amount = ?3
    AND NOT EXISTS (SELECT 1 FROM infaq_intents i WHERE i.donation_id = d.id) `
  const from = it.created_at - 60000
  const to = it.created_at + INTENT_TTL + 600000
  if (it.ref) {
    const byRef = await db.prepare('SELECT d.* FROM donations d WHERE d.id = ?1 AND NOT EXISTS (SELECT 1 FROM infaq_intents i WHERE i.donation_id = d.id)').bind(it.ref).first()
    if (byRef) return byRef
  }
  const byName = await db.prepare(SQL + 'AND LOWER(d.name) = LOWER(?4) ORDER BY d.created_at ASC LIMIT 1').bind(from, to, it.amount, it.name).first()
  if (byName) return byName
  // Tanpa kecocokan nama: hanya diterima bila tepat SATU niat menunggu dengan nominal ini (hindari tertukar).
  const others = await db.prepare(`SELECT COUNT(*) AS c FROM infaq_intents WHERE status = 'pending' AND amount = ?1 AND created_at > ?2 AND id != ?3`).bind(it.amount, Date.now() - INTENT_TTL, it.id).first()
  if (others && others.c > 0) return null
  return await db.prepare(SQL + 'ORDER BY d.created_at ASC LIMIT 1').bind(from, to, it.amount).first()
}

async function settle(db, it, d) {
  try {
    await db.prepare(`UPDATE infaq_intents SET status = 'paid', donation_id = ?1 WHERE id = ?2 AND status = 'pending'`).bind(d.id, it.id).run()
    return true
  } catch {
    return false // donasi sudah diklaim niat lain (UNIQUE)
  }
}

async function loadIntent(env, id) {
  if (!/^[0-9a-f]{32}$/.test(String(id || ''))) return null
  await ensureSchema(env.DB)
  return await env.DB.prepare('SELECT * FROM infaq_intents WHERE id = ?1').bind(id).first()
}

const view = (it, donation, now = Date.now()) => ({
  ok: true,
  id: it.id,
  status: it.status === 'paid' ? 'paid' : now - it.created_at > INTENT_TTL ? 'expired' : 'pending',
  amount: it.amount,
  name: it.name,
  donation: publicDonation(donation)
})

export async function onStatus({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'not_configured' }, 503)
  const it = await loadIntent(env, new URL(request.url).searchParams.get('id'))
  if (!it) return json({ ok: false, error: 'not_found' }, 404)
  if (it.status === 'paid') return json(view(it, await env.DB.prepare('SELECT * FROM donations WHERE id = ?1').bind(it.donation_id).first()))
  let d = await matchDonation(env.DB, it)
  if (!d && Date.now() - it.created_at < INTENT_TTL + 600000) {
    const r = await syncSupports(env)
    if (r.ok && r.added) d = await matchDonation(env.DB, it)
  }
  if (d && (await settle(env.DB, it, d))) return json(view({ ...it, status: 'paid' }, d))
  return json(view(it, null))
}

/** Pengguna memasukkan ID transaksi dari bukti pembayaran. Diterima hanya bila ID itu ada sebagai transaksi sukses. */
export async function onClaim({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'not_configured' }, 503)
  let body
  try {
    body = JSON.parse((await request.text()).slice(0, 2000))
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400)
  }
  const it = await loadIntent(env, body && body.id)
  if (!it) return json({ ok: false, error: 'not_found' }, 404)
  const ref = cleanText(body.ref, 100)
  if (!/^[\w-]{6,100}$/.test(ref)) return json({ ok: false, error: 'invalid_ref' }, 400)
  if (it.status === 'paid') return json(view(it, await env.DB.prepare('SELECT * FROM donations WHERE id = ?1').bind(it.donation_id).first()))
  const find = () => env.DB.prepare('SELECT d.* FROM donations d WHERE d.id = ?1 AND d.is_test = 0 AND d.created_at > ?2 AND NOT EXISTS (SELECT 1 FROM infaq_intents i WHERE i.donation_id = d.id)').bind(ref, Date.now() - 7 * 86400000).first()
  let d = await find()
  if (!d) {
    await syncSupports(env, { minInterval: 5000 })
    d = await find()
  }
  if (d && (await settle(env.DB, it, d))) return json(view({ ...it, status: 'paid' }, d))
  return json({ ...view(it, null), claim: 'not_found' })
}

/** Diagnosis untuk pengelola (butuh token webhook): hasil percobaan QRIS langsung & sinkronisasi terakhir. Tanpa rahasia. */
export async function onDiag({ request, env }) {
  const token = request.headers.get('X-Webhook-Token') || ''
  if (!env.TRAKTEER_WEBHOOK_TOKEN || token.length !== env.TRAKTEER_WEBHOOK_TOKEN.length || token !== env.TRAKTEER_WEBHOOK_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401)
  if (!env.DB) return json({ ok: false, error: 'not_configured' }, 503)
  await ensureSchema(env.DB)
  const cfg = providerConfig(env)
  const [direct, sync] = [await metaGet(env.DB, 'direct_diag'), await metaGet(env.DB, 'sync_result')]
  return json({
    ok: true,
    config: { username: cfg.username, unitPrice: cfg.unitPrice, apiKey: cfg.hasApi, direct: cfg.hasDirect, webhookToken: true },
    lastDirect: direct ? JSON.parse(direct.v) : null,
    lastSync: sync ? { result: sync.v, at: sync.at } : null
  })
}

export { insertDonation }
