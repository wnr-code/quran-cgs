// Pengingat waktu salat.
//  • PWA: perilaku browser/Web Push dan service worker tetap terpisah dari Android.
//  • Android: jadwal AlarmManager/Receiver native berjalan independen dari JS dan WebView.
import { getSettings, saveSettings } from './storage.js'
import { getPrayerTimes } from '../api/prayer-api.js'
import { toHijri } from '../utils/hijri.js'
import { showNotification, requestNotifPermission, refreshNotificationPermission, notifSupported } from './notification.js'
import { pause as pauseQuran } from './audio.js'
import { icon } from '../components/icons.js'
import { formatClock, dateKey } from '../utils/format.js'
import { esc, emit, on } from '../utils/helpers.js'
import { ADZAN_VOICES, adzanUrl } from './adzan-voices.js'
import { isAndroidApp, isNativePlatform } from './platform.js'
import { syncAndroidPrayerNotifications, requestExactAlarmAccess, getNativePrayerStatus, startNativeAzan, stopNativeAzan } from './prayer-notifications.js'

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

/** Peristiwa lokal hari ini; imsak/tarhim tetap Ramadan, pengingat pra-salat bisa dipilih sendiri. */
export function todayEvents(s = getSettings(), now = new Date()) {
  if (!s.location) return []
  const a = s.adzan
  const times = getPrayerTimes(s.location, now, s.prayerMethod)
  const out = a.enabled
    ? times.filter((p) => NAME[p.key] && a[p.key] !== false).map((p) => ({ key: p.key, name: p.name, time: p.time, adzan: true }))
    : []
  if (isRamadan(now, s.hijriAdjust)) {
    const fajr = times.find((p) => p.key === 'subuh').time
    if (a.enabled && a.tarhim) out.push({ key: 'tarhim', name: 'Tarhim', time: new Date(fajr.getTime() - TARHIM_BEFORE * 60000), fajr })
    if (s.ramadanReminders && s.ramadanReminders.imsakEnabled) {
      out.push({ key: 'imsak', name: 'Imsak', time: new Date(fajr.getTime() - IMSAK_BEFORE * 60000), fajr })
    }
  }
  const r = s.prayerReminders
  if (r && r.enabled) {
    const leadMinutes = Math.max(1, Math.min(60, +r.leadMinutes || 10))
    for (const prayer of times) {
      if (!NAME[prayer.key] || (r.prayers && r.prayers[prayer.key] === false)) continue
      out.push({
        key: `reminder_${prayer.key}`,
        name: prayer.name,
        time: new Date(prayer.time.getTime() - leadMinutes * 60000),
        prayerTime: prayer.time,
        leadMinutes,
        reminder: true
      })
    }
  }
  return out.sort((x, y) => x.time - y.time)
}

// ---------- Pemutar adzan ----------
let audio = null
let nativeAudioPlaying = false
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

export const adzanPlaying = () => isAndroidApp() ? nativeAudioPlaying : !!audio && !audio.paused

export function stopAdzan() {
  if (audio) {
    audio.pause()
    audio.src = ''
    audio = null
  }
  if (isAndroidApp()) {
    nativeAudioPlaying = false
    stopNativeAzan()
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
export async function playAdzan(key, { voice = getSettings().adzan.voice, volume = getSettings().adzan.volume } = {}) {
  if (isAndroidApp()) {
    if (audio) {
      audio.pause()
      audio.src = ''
      audio = null
    }
    nativeAudioPlaying = false
    playingKey = key
    try { pauseQuran() } catch {}
    await stopNativeAzan()
    nativeAudioPlaying = await startNativeAzan(key, voice, volume)
    const state = nativeAudioPlaying ? 'playing' : 'error'
    renderBar(state)
    emit('adzan:state', { playing: nativeAudioPlaying, key })
    return state
  }
  stopAdzan()
  playingKey = key
  try {
    pauseQuran()
  } catch {}
  audio = new Audio(adzanUrl(voice))
  audio.volume = Math.max(0, Math.min(1, Number(volume) || 0))
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
  } else if (ev.reminder) {
    if (notify) showNotification(`Pengingat salat ${ev.name}`, `${ev.leadMinutes} menit lagi masuk waktu salat ${ev.name} (${formatClock(ev.prayerTime)}).`, 'salat-' + ev.key)
  } else if (notify) {
    if (ev.key === 'imsak') showNotification('Imsak', `Waktu imsak telah tiba (${formatClock(ev.time)}). Subuh pukul ${formatClock(ev.fajr)}.`, 'salat-imsak')
    else showNotification('Tarhim', `${TARHIM_BEFORE} menit lagi masuk waktu Subuh (${formatClock(ev.fajr)}). Segera selesaikan sahur.`, 'salat-tarhim')
  }
  return true
}

/** Dipanggil berkala selama aplikasi hidup. */
export function adzanTick(now = new Date()) {
  const s = getSettings()
  // Android alarms are managed by AlarmManager/Receivers; never rely on this JS timer there.
  if (isAndroidApp() || (!s.adzan.enabled && !s.prayerReminders.enabled && !s.ramadanReminders.imsakEnabled) || !s.location) return
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
export const pushSupported = () => !isNativePlatform() && 'serviceWorker' in navigator && 'PushManager' in window && notifSupported()
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
    const prayerReminders = s.prayerReminders || {}
    const ramadanReminders = s.ramadanReminders || {}
    if ((!s.adzan.enabled && !prayerReminders.enabled && !ramadanReminders.imsakEnabled) || !s.location) {
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
    const ramadan = s.ramadanReminders || {}
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
        prefs: {
          prayers: Object.fromEntries(PRAYERS.map(([k2]) => [k2, !!a.enabled && a[k2] !== false])),
          imsak: !!ramadan.imsakEnabled,
          tarhim: !!a.enabled && !!a.tarhim,
          reminders: {
            enabled: !!prayerReminders.enabled,
            leadMinutes: Math.max(1, Math.min(60, +prayerReminders.leadMinutes || 10)),
            prayers: Object.fromEntries(PRAYERS.map(([k2]) => [k2, !prayerReminders.prayers || prayerReminders.prayers[k2] !== false]))
          }
        },
        test
      })
    })
    const j = await res.json().catch(() => ({}))
    return j.ok ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}

/** Mengaktifkan azan dan meminta izin sistem yang diperlukan pada platform masing-masing. */
export async function enableAdzan() {
  const s = getSettings()
  if (!s.location) return { ok: false, reason: 'location' }
  const android = isAndroidApp()
  const perm = await requestNotifPermission()
  let exact = 'unsupported'
  if (android && perm === 'granted') {
    const status = await getNativePrayerStatus()
    if (!status || !status.exactAlarmAllowed) exact = await requestExactAlarmAccess()
    else exact = 'granted'
  }
  saveSettings({ adzan: { enabled: true }, reminders: { prayer: false } })
  if (android) await syncAndroidPrayerNotifications()
  const push = android ? (perm === 'granted' ? 'native' : 'denied') : perm === 'granted' ? await syncPush({ test: true }) : 'denied'
  return { ok: true, push, permission: perm, exact }
}

export async function enablePrayerReminders() {
  if (!getSettings().location) return { ok: false, reason: 'location' }
  const permission = await requestNotifPermission()
  let exact = 'unsupported'
  if (isAndroidApp() && permission === 'granted') {
    const status = await getNativePrayerStatus()
    exact = status && status.exactAlarmAllowed ? 'granted' : await requestExactAlarmAccess()
  }
  saveSettings({ prayerReminders: { enabled: true } })
  if (isAndroidApp()) await syncAndroidPrayerNotifications()
  else if (permission === 'granted') await syncPush()
  return { ok: true, permission, exact }
}

export async function disablePrayerReminders() {
  saveSettings({ prayerReminders: { enabled: false } })
  if (isAndroidApp()) await syncAndroidPrayerNotifications()
  else await syncPush()
}

export async function enableImsakNotifications() {
  if (!getSettings().location) return { ok: false, reason: 'location' }
  const permission = await requestNotifPermission()
  let exact = 'unsupported'
  if (isAndroidApp() && permission === 'granted') {
    const status = await getNativePrayerStatus()
    exact = status && status.exactAlarmAllowed ? 'granted' : await requestExactAlarmAccess()
  }
  saveSettings({ ramadanReminders: { imsakEnabled: true } })
  if (isAndroidApp()) await syncAndroidPrayerNotifications()
  else if (permission === 'granted') await syncPush()
  return { ok: true, permission, exact }
}

export async function disableImsakNotifications() {
  saveSettings({ ramadanReminders: { imsakEnabled: false } })
  if (isAndroidApp()) await syncAndroidPrayerNotifications()
  else await syncPush()
}

export async function disableAdzan() {
  saveSettings({ adzan: { enabled: false } })
  stopAdzan()
  if (isAndroidApp()) await syncAndroidPrayerNotifications()
  else await syncPush()
}

let syncTimer
/** Start platform-specific scheduling and refresh it when a relevant QuranKu setting changes. */
export function initAdzan() {
  const s = getSettings()
  // Migrate the former generic prayer reminder switch without losing the user's existing preference.
  if (s.reminders.prayer && !s.adzan.enabled) saveSettings({ adzan: { enabled: true, sound: false }, reminders: { prayer: false } })
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => handleSwMessage(e.data))
  let last = ''
  const snapshot = () => {
    const x = getSettings()
    let tz = 'Asia/Jakarta'
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz } catch {}
    return JSON.stringify([x.adzan, x.prayerReminders, x.ramadanReminders, x.location, x.prayerMethod, x.hijriAdjust, tz])
  }
  last = snapshot()
  const syncPlatformSchedule = () => isAndroidApp() ? syncAndroidPrayerNotifications() : syncPush()
  on('settings:changed', () => {
    const now = snapshot()
    if (now === last) return
    last = now
    clearTimeout(syncTimer)
    syncTimer = setTimeout(syncPlatformSchedule, 1000)
  })
  if (isAndroidApp()) {
    syncAndroidPrayerNotifications()
    refreshNotificationPermission()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        refreshNotificationPermission()
        syncAndroidPrayerNotifications()
      }
    })
  } else if (getSettings().adzan.enabled || getSettings().prayerReminders.enabled || getSettings().ramadanReminders.imsakEnabled) {
    setTimeout(() => syncPush(), 4000)
  }
  // Dibuka dari pemberitahuan adzan: /?adzan=subuh#/salat
  const key = new URLSearchParams(location.search).get('adzan')
  if (key) {
    history.replaceState(null, '', location.pathname + location.hash)
    if (NAME[key] && getSettings().adzan.enabled) playAdzan(key)
  }
}
