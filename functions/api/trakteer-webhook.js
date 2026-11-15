// Webhook Trakteer → Cloudflare D1.
// Atur di Trakteer: Integrations → Webhook → URL: https://quran.cgs.my.id/api/trakteer-webhook
// Simpan "Webhook Token" dari Trakteer sebagai secret Worker: TRAKTEER_WEBHOOK_TOKEN. Binding D1: DB.
import { ensureSchema, insertDonation, json } from '../lib/db.js'

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const text = (v, max) =>
  String(v ?? '')
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .trim()
    .slice(0, max)

export function parseDonation(body, now = Date.now()) {
  if (!body || typeof body !== 'object') return null
  const id = text(body.transaction_id, 100)
  if (!id) return null
  const quantity = Math.max(1, Math.min(100000, parseInt(body.quantity, 10) || 1))
  const price = Math.max(0, Math.min(1e10, Math.round(Number(body.price) || 0)))
  const t = Date.parse(body.created_at)
  return {
    id,
    name: text(body.supporter_name, 60) || 'Hamba Allah',
    message: text(String(body.supporter_message ?? '').replace(/\s+/g, ' '), 280),
    unit: text(body.unit, 30),
    quantity,
    // Diasumsikan `price` = total nominal dukungan. Verifikasi dengan transaksi uji (lihat docs/INFAQ.md);
    // bila ternyata harga per unit, ubah menjadi `price * quantity`.
    amount: price,
    type: text(body.type, 20) || 'tip',
    created_at: Number.isFinite(t) && Math.abs(t - now) < 7 * 86400000 ? t : now
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.TRAKTEER_WEBHOOK_TOKEN || !env.DB) return json({ ok: false, error: 'not_configured' }, 503)
  const token = request.headers.get('X-Webhook-Token') || ''
  if (!safeEqual(token, env.TRAKTEER_WEBHOOK_TOKEN)) return json({ ok: false, error: 'unauthorized' }, 401)
  let body
  try {
    const raw = await request.text()
    if (raw.length > 20000) return json({ ok: false, error: 'too_large' }, 413)
    body = JSON.parse(raw)
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400)
  }
  const d = parseDonation(body)
  if (!d) return json({ ok: false, error: 'invalid_payload' }, 400)
  // Transaksi uji dari tombol "Send Webhook Test" Trakteer tidak ditampilkan di papan donatur.
  const isTest = /^test/i.test(d.id) ? 1 : 0
  await ensureSchema(env.DB)
  await insertDonation(env.DB, { ...d, is_test: isTest }, 'webhook')
  return json({ ok: true })
}

export const onRequestGet = () => json({ ok: true, info: 'QuranKu Trakteer webhook endpoint (POST only)' })
