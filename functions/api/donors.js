// Papan donatur publik: donatur terbaru + top donatur harian / mingguan / bulanan / sepanjang waktu.
// Hanya nama tampilan, jumlah, dan waktu yang dibuka — pesan & data lain tidak disimpan/ditampilkan.
const WIB = 7 * 3600 * 1000

/** Awal hari, awal minggu (Senin), dan awal bulan menurut WIB, dalam epoch ms (UTC). */
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

const TOP_SQL = `SELECT MIN(name) AS name, SUM(amount) AS amount, COUNT(*) AS count, MAX(created_at) AS at
  FROM donations WHERE is_test = 0 AND created_at >= ?1 GROUP BY LOWER(name) ORDER BY amount DESC, at ASC LIMIT 20`

const json = (obj, status = 200, cache = 'no-store') => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } })

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: 'not_configured' }, 503)
  try {
    const starts = periodStarts()
    const top = env.DB.prepare(TOP_SQL)
    const [daily, weekly, monthly, all, latest, totals] = await env.DB.batch([
      top.bind(starts.daily),
      top.bind(starts.weekly),
      top.bind(starts.monthly),
      top.bind(starts.all),
      env.DB.prepare('SELECT name, amount, unit, quantity, created_at AS at FROM donations WHERE is_test = 0 ORDER BY created_at DESC LIMIT 30'),
      env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count FROM donations WHERE is_test = 0')
    ])
    return json(
      {
        ok: true,
        updatedAt: Date.now(),
        top: { daily: daily.results, weekly: weekly.results, monthly: monthly.results, all: all.results },
        latest: latest.results,
        totals: totals.results[0] || { amount: 0, count: 0 }
      },
      200,
      'public, max-age=60'
    )
  } catch (e) {
    return json({ ok: false, error: 'db_error' }, 500)
  }
}
