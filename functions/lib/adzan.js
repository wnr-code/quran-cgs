// Jadwal adzan di sisi server: menghitung waktu salat tiap pelanggan dan mengirim push tepat waktunya.
import { getPrayerTimes } from '../../src/api/prayer-api.js'
import { toHijri } from '../../src/utils/hijri.js'
import { metaGet, metaSet } from './db.js'
import { generateVapid, sendPush } from './webpush.js'

export const PRAYER_KEYS = ['subuh', 'zuhur', 'asar', 'magrib', 'isya']
export const IMSAK_BEFORE = 10 // menit sebelum Subuh
export const TARHIM_BEFORE = 15 // menit sebelum Subuh
const NAMES = { subuh: 'Subuh', zuhur: 'Zuhur', asar: 'Asar', magrib: 'Magrib', isya: 'Isya' }

/** Tanggal lokal pelanggan (tahun, bulan, hari) pada zona waktunya. */
export function localDate(now, tz) {
  let parts
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  }
  const g = (t) => +parts.find((p) => p.type === t).value
  return { y: g('year'), m: g('month'), d: g('day') }
}

const clock = (t, tz) => {
  try {
    return new Intl.DateTimeFormat('id-ID', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(t).replace('.', ':')
  } catch {
    return ''
  }
}

/**
 * Daftar peristiwa (adzan, imsak, tarhim) untuk satu pelanggan pada tanggal lokalnya.
 * Imsak & tarhim hanya pada bulan Ramadan (kalender Umm al-Qura + koreksi hari milik pengguna).
 */
export function eventsFor(sub, now = new Date()) {
  const { y, m, d } = localDate(now, sub.tz)
  const day = new Date(y, m - 1, d, 12)
  const prefs = sub.prefs || {}
  const times = getPrayerTimes({ lat: sub.lat, lng: sub.lng }, day, sub.method)
  const dateKey = `${y}-${m}-${d}`
  const out = []
  for (const p of times) {
    if (!PRAYER_KEYS.includes(p.key) || (prefs.prayers && prefs.prayers[p.key] === false)) continue
    out.push({ key: p.key, time: p.time, id: `${dateKey}|${p.key}`, title: `Waktu ${NAMES[p.key]}`, body: `Telah masuk waktu salat ${NAMES[p.key]} (${clock(p.time, sub.tz)})${sub.place ? ' untuk ' + sub.place : ''}. Ketuk untuk memutar adzan.` })
  }
  const h = toHijri(day, sub.hijriAdjust || 0)
  if (h && h.month === 9) {
    const fajr = times.find((p) => p.key === 'subuh').time
    if (prefs.tarhim !== false) {
      const t = new Date(fajr.getTime() - TARHIM_BEFORE * 60000)
      out.push({ key: 'tarhim', time: t, id: `${dateKey}|tarhim`, title: 'Tarhim', body: `${TARHIM_BEFORE} menit lagi masuk waktu Subuh (${clock(fajr, sub.tz)}). Segera selesaikan sahur.` })
    }
    if (prefs.imsak !== false) {
      const t = new Date(fajr.getTime() - IMSAK_BEFORE * 60000)
      out.push({ key: 'imsak', time: t, id: `${dateKey}|imsak`, title: 'Imsak', body: `Waktu imsak telah tiba (${clock(t, sub.tz)}). Subuh pukul ${clock(fajr, sub.tz)}.` })
    }
  }
  const reminders = prefs.reminders || {}
  if (reminders.enabled) {
    const leadMinutes = Math.max(1, Math.min(60, Number(reminders.leadMinutes) || 10))
    for (const prayer of times) {
      if (!PRAYER_KEYS.includes(prayer.key) || (reminders.prayers && reminders.prayers[prayer.key] === false)) continue
      const t = new Date(prayer.time.getTime() - leadMinutes * 60000)
      out.push({
        key: `reminder_${prayer.key}`,
        time: t,
        id: `${dateKey}|reminder_${prayer.key}`,
        title: `Pengingat salat ${NAMES[prayer.key]}`,
        body: `${leadMinutes} menit lagi masuk waktu salat ${NAMES[prayer.key]} (${clock(prayer.time, sub.tz)}).`
      })
    }
  }
  return out.sort((a, b) => a.time - b.time)
}

/** Peristiwa yang baru saja jatuh tempo (dalam `windowMs` terakhir). */
export const dueEvents = (sub, now = new Date(), windowMs = 150000) => eventsFor(sub, now).filter((e) => now - e.time >= 0 && now - e.time < windowMs)

export async function getVapid(env) {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_JWK) return { publicKey: env.VAPID_PUBLIC_KEY, privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK) }
  const row = await metaGet(env.DB, 'vapid')
  if (row) return JSON.parse(row.v)
  const v = await generateVapid()
  await metaSet(env.DB, 'vapid', JSON.stringify(v))
  // Bila dua permintaan membuat kunci bersamaan, pakai yang benar-benar tersimpan.
  return JSON.parse((await metaGet(env.DB, 'vapid')).v)
}

const rowToSub = (r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth, lat: r.lat, lng: r.lng, method: r.method, tz: r.tz, place: r.place, hijriAdjust: r.hijri_adjust, prefs: JSON.parse(r.prefs || '{}'), last: r.last_id })

/** Dipanggil cron tiap menit: kirim push untuk setiap peristiwa yang jatuh tempo (sekali per peristiwa). */
export async function pushDue(env, now = new Date(), opts = {}) {
  const { results } = await env.DB.prepare('SELECT * FROM push_subs').all()
  if (!results.length) return { sent: 0, removed: 0 }
  const vapid = await getVapid(env)
  let sent = 0
  let removed = 0
  await Promise.all(
    results.map(async (r) => {
      const sub = rowToSub(r)
      let due
      try {
        due = dueEvents(sub, now)
      } catch {
        return
      }
      const ev = due.filter((e) => e.id !== sub.last).pop()
      if (!ev) return
      // Tandai dulu agar cron berikutnya tidak mengirim ulang walau pengiriman lambat.
      await env.DB.prepare('UPDATE push_subs SET last_id = ?2 WHERE endpoint = ?1').bind(sub.endpoint, ev.id).run()
      const res = await sendPush(sub, { type: 'adzan', key: ev.key, title: ev.title, body: ev.body, at: ev.time.getTime() }, vapid, opts)
      if (res.ok) sent++
      else if (res.gone) {
        await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?1').bind(sub.endpoint).run()
        removed++
      }
    })
  )
  return { sent, removed }
}
