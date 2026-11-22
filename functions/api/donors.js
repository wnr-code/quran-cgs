// Papan Kebaikan publik: hitungan kebaikan + dinding doa/ucapan donatur (anonim).
// Yang dibuka ke publik HANYA: jumlah kebaikan tercatat, jumlah doa, dan teks pesan/doa + waktu.
// Nama donatur dan nominal (amount) TIDAK dikirim ke publik demi menjaga keikhlasan & privasi.
// Kolom `amount`/`name` tetap disimpan di D1 untuk pencocokan niat infaq di sisi server.
import { ensureSchema } from '../lib/db.js'

const WIB = 7 * 3600 * 1000

/** Awal hari, awal minggu (Senin), dan awal bulan menurut WIB, dalam epoch ms (UTC).
 * Dipertahankan untuk statistik periode & uji; papan publik tidak lagi memakai peringkat. */
export function periodStarts(now = Date.now()) {
  const d = new Date(now + WIB)
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const dow = (d.getUTCDay() + 6) % 7
  return {
    daily: dayStart - WIB,
    weekly: dayStart - dow * 86400000 - WIB,
    monthly: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - WIB,
    all: 0
  }
}

const json = (obj, status = 200, cache = 'no-store') => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } })

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: 'not_configured' }, 503)
  try {
    await ensureSchema(env.DB)
    const [totals, doa] = await env.DB.batch([
      env.DB.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(CASE WHEN TRIM(message) <> '' THEN 1 ELSE 0 END), 0) AS doaCount FROM donations WHERE is_test = 0`),
      env.DB.prepare(`SELECT message, created_at AS at FROM donations WHERE is_test = 0 AND TRIM(message) <> '' ORDER BY created_at DESC LIMIT 30`)
    ])
    const t = totals.results[0] || { count: 0, doaCount: 0 }
    return json(
      {
        ok: true,
        updatedAt: Date.now(),
        totals: { count: Number(t.count) || 0, doaCount: Number(t.doaCount) || 0 },
        doa: (doa.results || []).map((r) => ({ message: String(r.message || '').slice(0, 280), at: Number(r.at) || 0 }))
      },
      200,
      'public, max-age=60'
    )
  } catch (e) {
    return json({ ok: false, error: 'db_error' }, 500)
  }
}
