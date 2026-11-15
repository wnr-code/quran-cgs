// Adzan otomatis.
//  • Aplikasi terbuka / masih hidup di latar belakang → suara adzan diputar otomatis.
//  • Aplikasi ditutup → server mengirim pemberitahuan push tepat waktunya (bunyi mengikuti nada notifikasi perangkat;
//    web tidak diizinkan memutar audio saat tertutup). Ketuk pemberitahuan untuk memutar adzan.
import { getSettings, saveSettings } from './storage.js'
import { getPrayerTimes } from '../api/prayer-api.js'
import { toHijri } from '../utils/hijri.js'
import { showNotification, requestNotifPermission, notifSupported } from './notification.js'
import { pause as pauseQuran } from './audio.js'
import { icon } from '../components/icons.js'
import { formatClock, dateKey } from '../utils/format.js'
import { esc, emit, on } from '../utils/helpers.js'
import { ADZAN_VOICES, adzanUrl } from './adzan-voices.js'

export { ADZAN_VOICES, adzanUrl }

export const PRAYERS = [
  ['subuh', 'Subuh'],
  ['zuhur', 'Zuhur'],
  ['asar', 'Asar'],
  ['magrib', 'Magrib'],
  ['isya', 'Isya']
]
export const IMSAK_BEFORE = 10
export const TARHIM_BEFORE = 15
const NAME = Object.fromEntries(PRAYERS)

export const isRamadan = (date = new Date(), adjust = getSettings().hijriAdjust) => {
  const h = toHijri(date, adjust)
  return !!h && h.month === 9
}

/** Peristiwa hari ini menurut pengaturan pengguna: adzan lima waktu, serta tarhim & imsak pada bulan Ramadan. */
export function todayEvents(s = getSettings(), now = new Date()) {
  if (!s.location) return []
  const a = s.adzan
  const times = getPrayerTimes(s.location, now, s.prayerMethod)
  const out = times.filter((p) => NAME[p.key] && a[p.key] !== false).map((p) => ({ key: p.key, name: p.name, time: p.time, adzan: true }))
  if (isRamadan(now, s.hijriAdjust)) {
    const fajr = times.find((p) => p.key === 'subuh').time
    if (a.tarhim) out.push({ key: 'tarhim', name: 'Tarhim', time: new Date(fajr.getTime() - TARHIM_BEFORE * 60000), fajr })
    if (a.imsak) out.push({ key: 'imsak', name: 'Imsak', time: new Date(fajr.getTime() - IMSAK_BEFORE * 60000), fajr })
  }
  return out.sort((x, y) => x.time - y.time)
}

// ---------- Pemutar adzan ----------
let audio = null
let playingKey = null

function bar() {
  let el = document.getElementById('adzan-bar')
  if (!el) {
    el = document.createElement('div')
    el.id = 'adzan-bar'
    el.setAttribute('role', 'alert')
    document.body.appendChild(el)
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-adzan-stop]')) stopAdzan()
      else if (e.target.closest('[data-adzan-play]')) playAdzan(playingKey || 'uji', { user: true })
    })
  }
  return el
}
function renderBar(state) {
  const el = bar()
  const title = playingKey && NAME[playingKey] ? `Adzan ${NAME[playingKey]}` : 'Adzan'
  el.innerHTML = `<span class="adzan-ic">${icon('mosque')}</span>
    <span class="adzan-tx"><strong>${esc(title)}</strong><small>${state === 'blocked' ? 'Ketuk tombol putar untuk mendengarkan' : state === 'error' ? 'Audio tidak dapat dimuat (periksa internet)' : esc(ADZAN_VOICES[getSettings().adzan.voice] || '')}</small></span>
    ${state === 'blocked' || state === 'error' ? `<button class="btn sm btn-primary" data-adzan-play>${icon('play')}Putar</button>` : ''}
    <button class="icon-btn" data-adzan-stop aria-label="Hentikan adzan">${icon(state === 'playing' ? 'stop' : 'close')}</button>`
  el.classList.add('show')
}

export const adzanPlaying = () => !!audio && !audio.paused

export function stopAdzan() {
  if (audio) {
    audio.pause()
    audio.src = ''
    audio = null
  }
  playingKey = null
  const el = document.getElementById('adzan-bar')
  if (el) el.classList.remove('show')
  emit('adzan:state', { playing: false })
}

/**
 * Memutar adzan. Peramban dapat menolak pemutaran otomatis bila halaman belum pernah disentuh;
 * dalam hal itu ditampilkan tombol "Putar".
 * @returns {Promise<'playing'|'blocked'|'error'>}
 */
export async function playAdzan(key, { voice = getSettings().adzan.voice } = {}) {
  stopAdzan()
  playingKey = key
  try {
    pauseQuran()
  } catch {}
  audio = new Audio(adzanUrl(voice))
  audio.preload = 'auto'
  const mine = audio
  audio.addEventListener('ended', () => mine === audio && stopAdzan())
  audio.addEventListener('error', () => mine === audio && renderBar('error'))
  let state = 'playing'
  try {
    await audio.play()
  } catch (e) {
    state = e && e.name === 'NotAllowedError' ? 'blocked' : 'error'
  }
  if (mine !== audio) return 'error'
  renderBar(state)
  emit('adzan:state', { playing: state === 'playing', key })
  return state
}

// ---------- Pemicu tepat waktu ----------
const firedKey = (key) => `qk-adzan:${dateKey()}|${key}`
const alreadyFired = (key) => {
  try {
    return !!localStorage.getItem(firedKey(key))
  } catch {
    return false
  }
}
function markFired(key) {
  try {
    // Buang penanda hari-hari sebelumnya.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith('qk-adzan:') && !k.startsWith(`qk-adzan:${dateKey()}|`)) localStorage.removeItem(k)
    }
    localStorage.setItem(firedKey(key), '1')
  } catch {}
}

/** Menjalankan satu peristiwa (sekali per hari per peristiwa, juga bila ada beberapa tab). */
export function fireEvent(ev, { notify = true } = {}) {
  if (alreadyFired(ev.key)) return false
  markFired(ev.key)
  const s = getSettings()
  const place = s.location && s.location.name ? ` untuk ${s.location.name}` : ''
  if (ev.adzan) {
    if (notify) showNotification(`Waktu ${ev.name}`, `Telah masuk waktu salat ${ev.name} (${formatClock(ev.time)})${place}.`, 'salat-' + ev.key)
    if (s.adzan.sound) playAdzan(ev.key)
  } else if (notify) {
    if (ev.key === 'imsak') showNotification('Imsak', `Waktu imsak (${formatClock(ev.time)}). Subuh pukul ${formatClock(ev.fajr)}.`, 'salat-imsak')
    else showNotification('Tarhim', `${TARHIM_BEFORE} menit lagi masuk waktu Subuh (${formatClock(ev.fajr)}). Segera selesaikan sahur.`, 'salat-tarhim')
  }
  return true
}

/** Dipanggil berkala selama aplikasi hidup. */
export function adzanTick(now = new Date()) {
  const s = getSettings()
  if (!s.adzan.enabled || !s.location) return
  for (const ev of todayEvents(s, now)) {
    const diff = now - ev.time
    if (diff >= 0 && diff < 120000) fireEvent(ev)
  }
}

/** Pesan dari Service Worker (push tiba saat aplikasi terbuka, atau pemberitahuan diketuk). */
export function handleSwMessage(data) {
  if (!data || data.type !== 'adzan') return
  const s = getSettings()
  if (!s.adzan.enabled) return
  if (data.play && NAME[data.key]) return void playAdzan(data.key)
  const ev = todayEvents(s).find((e) => e.key === data.key)
  if (ev && Math.abs(Date.now() - ev.time) < 10 * 60000) fireEvent(ev, { notify: false })
}

// ---------- Langganan push ----------
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && notifSupported()
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function registration() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return null
  return Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 4000))])
}

/** Mendaftarkan/menyegarkan langganan push sesuai pengaturan sekarang. @returns {Promise<'ok'|'unsupported'|'failed'>} */
export async function syncPush({ test = false } = {}) {
  const s = getSettings()
  if (!pushSupported()) return 'unsupported'
  try {
    const reg = await registration()
    if (!reg) return 'unsupported'
    let sub = await reg.pushManager.getSubscription()
    if (!s.adzan.enabled || !s.location) {
      if (sub) {
        await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {})
        await sub.unsubscribe().catch(() => {})
      }
      return 'ok'
    }
    if (!sub) {
      const k = await (await fetch('/api/push/key')).json()
      if (!k.ok) return 'failed'
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64(k.key) })
    }
    const a = s.adzan
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        lat: s.location.lat,
        lng: s.location.lng,
        place: s.location.name || '',
        method: s.prayerMethod,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        hijriAdjust: s.hijriAdjust,
        prefs: { prayers: Object.fromEntries(PRAYERS.map(([k2]) => [k2, a[k2] !== false])), imsak: !!a.imsak, tarhim: !!a.tarhim },
        test
      })
    })
    const j = await res.json().catch(() => ({}))
    return j.ok ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}

/** Menyalakan adzan otomatis (meminta izin notifikasi). @returns {Promise<{ok:boolean, reason?:string, push?:string}>} */
export async function enableAdzan() {
  const s = getSettings()
  if (!s.location) return { ok: false, reason: 'location' }
  const perm = await requestNotifPermission()
  // Tanpa izin notifikasi, suara adzan tetap bisa diputar selama aplikasi terbuka.
  saveSettings({ adzan: { enabled: true }, reminders: { prayer: false } })
  const push = perm === 'granted' ? await syncPush({ test: true }) : 'denied'
  return { ok: true, push }
}

export async function disableAdzan() {
  saveSettings({ adzan: { enabled: false } })
  stopAdzan()
  await syncPush()
}

let syncTimer
/** Dipanggil saat aplikasi mulai: migrasi pengaturan lama, dengarkan pesan SW, segarkan langganan bila lokasi/pilihan berubah. */
export function initAdzan() {
  const s = getSettings()
  // Pengaturan lama "Pengingat waktu salat" → adzan otomatis (tanpa suara, seperti perilaku sebelumnya).
  if (s.reminders.prayer && !s.adzan.enabled) saveSettings({ adzan: { enabled: true, sound: false }, reminders: { prayer: false } })
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => handleSwMessage(e.data))
  let last = ''
  const snapshot = () => {
    const x = getSettings()
    return JSON.stringify([x.adzan, x.location, x.prayerMethod, x.hijriAdjust])
  }
  last = snapshot()
  on('settings:changed', () => {
    const now = snapshot()
    if (now === last) return
    last = now
    clearTimeout(syncTimer)
    syncTimer = setTimeout(() => syncPush(), 1500)
  })
  if (getSettings().adzan.enabled) setTimeout(() => syncPush(), 4000)
  // Dibuka dari pemberitahuan adzan: /?adzan=subuh#/salat
  const key = new URLSearchParams(location.search).get('adzan')
  if (key) {
    history.replaceState(null, '', location.pathname + location.hash)
    if (NAME[key] && getSettings().adzan.enabled) playAdzan(key)
  }
}
