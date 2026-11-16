// Web notifications are used by the PWA. Capacitor Android has no native notification plugin,
// so the shared reminder loop falls back to in-app toasts while the app is open.
import { isNativePlatform } from './platform.js'
import { toast } from '../utils/helpers.js'
import { getSettings } from './storage.js'
import { todayProgress, goalPages } from './progress.js'
import { dateKey, formatClock } from '../utils/format.js'
import { takeDueReminders } from './calendar-notes.js'

export const notifSupported = () => isNativePlatform() || 'Notification' in globalThis
export const notifPermission = () => {
  if (isNativePlatform()) return 'foreground'
  return 'Notification' in globalThis ? Notification.permission : 'unsupported'
}

/** Ask only in a browser; the native shell deliberately uses foreground-only in-app messages. */
export async function requestNotifPermission() {
  if (isNativePlatform()) return 'foreground'
  if (!notifSupported()) return 'unsupported'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

export async function showNotification(title, body, tag) {
  if (isNativePlatform()) {
    toast(`${title} · ${body}`, 6000)
    return true
  }
  if (notifPermission() !== 'granted') return false
  const opts = { body, tag, icon: '/icons/icon-192-v2.png', badge: '/icons/badge-96-v2.png', lang: 'id' }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (reg) await reg.showNotification(title, opts)
    else new Notification(title, opts)
    return true
  } catch {
    return false
  }
}

const fired = new Set()
const fireOnce = (key, title, body) => {
  const k = `${dateKey()}|${key}`
  if (fired.has(k) || sessionStorage.getItem('qk-n:' + k)) return
  fired.add(k)
  try {
    sessionStorage.setItem('qk-n:' + k, '1')
  } catch {}
  showNotification(title, body, key)
}

async function tick() {
  const s = getSettings()
  const r = s.reminders
  if (!isNativePlatform() && notifPermission() !== 'granted') return
  const now = new Date()
  // Calendar reminders and reading goals surface as in-app toasts on Android while it is open.
  for (const n of takeDueReminders(now)) showNotification('Pengingat kalender', n.text, 'kal-' + n.id)
  if (!r.tilawah && !r.goal) return
  const hm = formatClock(now)
  if (r.tilawah && hm === r.tilawahTime) fireOnce('tilawah', 'Waktunya tilawah', 'Luangkan waktu sejenak untuk membaca Al-Qur’an hari ini.')
  if (r.goal && hm === '20:30') {
    const p = await todayProgress()
    const target = goalPages(s.goal)
    if (p.pages < target) fireOnce('goal', 'Target tilawah hari ini', `Baru ${p.pages} dari ${target} halaman. Yuk lanjutkan bacaan.`)
  }
}

let interval
export function startReminderLoop() {
  clearInterval(interval)
  interval = setInterval(() => tick().catch(() => {}), 30000)
  tick().catch(() => {})
}
