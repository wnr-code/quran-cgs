// Browser reminders stay in the PWA. Android requests POST_NOTIFICATIONS through Capacitor;
// prayer, tilawah, target, and calendar alarms are delivered by the native AlarmManager receiver.
import { LocalNotifications } from '@capacitor/local-notifications'
import { isAndroidApp, isNativePlatform } from './platform.js'
import { toast } from '../utils/helpers.js'
import { getSettings } from './storage.js'
import { todayProgress, goalPages } from './progress.js'
import { dateKey, formatClock } from '../utils/format.js'
import { takeDueReminders } from './calendar-notes.js'
import { recordInboxReminder } from './inbox.js'

let androidPermission = 'prompt'

export const notifSupported = () => isNativePlatform() || 'Notification' in globalThis
export const notifPermission = () => {
  if (isAndroidApp()) return androidPermission
  if (isNativePlatform()) return 'unsupported'
  return 'Notification' in globalThis ? Notification.permission : 'unsupported'
}

export async function refreshNotificationPermission() {
  if (!isAndroidApp()) return notifPermission()
  try {
    const result = await LocalNotifications.checkPermissions()
    androidPermission = result.display || 'prompt'
  } catch {
    androidPermission = 'prompt'
  }
  return androidPermission
}

/** Ask the platform for permission only in response to a user action. */
export async function requestNotifPermission() {
  if (isAndroidApp()) {
    try {
      const result = await LocalNotifications.requestPermissions()
      androidPermission = result.display || 'prompt'
    } catch {
      await refreshNotificationPermission()
    }
    return androidPermission
  }
  if (isNativePlatform()) return 'unsupported'
  if (!notifSupported()) return 'unsupported'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

const reminderRoute = (tag) => {
  if (String(tag || '').startsWith('kal-')) return '/kalender'
  if (tag === 'tilawah' || tag === 'goal') return '/target'
  if (['subuh', 'zuhur', 'asar', 'magrib', 'isya', 'imsak'].includes(tag)) return '/salat'
  return '/notifikasi'
}

export async function showNotification(title, body, tag) {
  if (isNativePlatform()) {
    // Native foreground-only notices use a lightweight in-app message; scheduled Android reminders use AlarmManager.
    toast(`${title} · ${body}`, 6000)
    return true
  }
  if (notifPermission() !== 'granted') return false
  const item = {
    id: `web:${String(tag || 'info')}:${Date.now()}`,
    type: 'reminder',
    title: String(title || 'Pengingat QuranKu'),
    body: String(body || ''),
    route: reminderRoute(tag),
    at: Date.now()
  }
  const opts = {
    body,
    tag,
    icon: '/icons/icon-192-v2.png',
    badge: '/icons/badge-96-v2.png',
    lang: 'id',
    data: { inboxId: item.id, inboxItem: item, route: item.route, at: item.at }
  }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (reg) await reg.showNotification(title, opts)
    else new Notification(title, opts)
    recordInboxReminder(item)
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
  // Android delivers these through AlarmManager so the JS fallback cannot duplicate system notifications.
  if (isAndroidApp()) return
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
  if (isAndroidApp()) return
  interval = setInterval(() => tick().catch(() => {}), 30000)
  tick().catch(() => {})
}
