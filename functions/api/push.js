// Langganan pengingat adzan (Web Push). Data yang disimpan: alamat push, koordinat (dibulatkan), zona waktu, pilihan pengingat.
import { ensureSchema, cleanText } from '../lib/db.js'
import { getVapid, PRAYER_KEYS } from '../lib/adzan.js'
import { validEndpoint, sendPush } from '../lib/webpush.js'

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
const METHODS = ['kemenag', 'mwl', 'ummalqura', 'egypt', 'singapore']

export async function onKey({ env }) {
  if (!env.DB) return json({ ok: false, error: 'no_database' }, 503)
  await ensureSchema(env.DB)
  return json({ ok: true, key: (await getVapid(env)).publicKey })
}

function parse(body) {
  const s = body && body.subscription
  const k = s && s.keys
  if (!s || !k || typeof s.endpoint !== 'string' || s.endpoint.length > 1000 || !validEndpoint(s.endpoint)) return null
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(k.p256dh || '') || !/^[A-Za-z0-9_-]{16,32}$/.test(k.auth || '')) return null
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return null
  const p = body.prefs || {}
  const reminderPrefs = p.reminders || {}
  const leadMinutes = Math.max(1, Math.min(60, Math.round(Number(reminderPrefs.leadMinutes) || 10)))
  const prefs = {
    prayers: Object.fromEntries(PRAYER_KEYS.map((key) => [key, !(p.prayers && p.prayers[key] === false)])),
    imsak: p.imsak !== false,
    tarhim: p.tarhim !== false,
    reminders: {
      enabled: reminderPrefs.enabled === true,
      leadMinutes,
      prayers: Object.fromEntries(PRAYER_KEYS.map((key) => [key, !(reminderPrefs.prayers && reminderPrefs.prayers[key] === false)]))
    }
  }
  let tz = cleanText(body.tz, 60)
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
  } catch {
    tz = 'Asia/Jakarta'
  }
  return {
    endpoint: s.endpoint,
    p256dh: k.p256dh,
    auth: k.auth,
    // 2 desimal (±1 km) cukup untuk jadwal salat dan tidak menyimpan lokasi persis.
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
    method: METHODS.includes(body.method) ? body.method : 'kemenag',
    tz,
    place: cleanText(body.place, 60),
    hijriAdjust: Math.max(-2, Math.min(2, Math.round(Number(body.hijriAdjust) || 0))),
    prefs
  }
}

export async function onSubscribe({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'no_database' }, 503)
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400)
  }
  const sub = parse(body)
  if (!sub) return json({ ok: false, error: 'invalid' }, 400)
  await ensureSchema(env.DB)
  await env.DB.prepare(
    `INSERT INTO push_subs (endpoint, p256dh, auth, lat, lng, method, tz, place, hijri_adjust, prefs, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = ?2, auth = ?3, lat = ?4, lng = ?5, method = ?6, tz = ?7, place = ?8, hijri_adjust = ?9, prefs = ?10, updated_at = ?11`
  )
    .bind(sub.endpoint, sub.p256dh, sub.auth, sub.lat, sub.lng, sub.method, sub.tz, sub.place, sub.hijriAdjust, JSON.stringify(sub.prefs), Date.now())
    .run()
  let test = null
  if (body.test) {
    const r = await sendPush(sub, { type: 'test', title: 'Pengingat adzan aktif', body: 'QuranKu akan mengirim pemberitahuan pada setiap waktu salat, juga saat aplikasi ditutup.' }, await getVapid(env))
    test = r.status
  }
  return json({ ok: true, test })
}

export async function onUnsubscribe({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'no_database' }, 503)
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400)
  }
  if (!body || typeof body.endpoint !== 'string') return json({ ok: false, error: 'invalid' }, 400)
  await ensureSchema(env.DB)
  await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?1').bind(body.endpoint).run()
  return json({ ok: true })
}
