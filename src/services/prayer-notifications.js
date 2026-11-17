// Android-only native prayer alarm bridge. PWA alarms and Web Push stay in adzan.js/worker.
import { LocalNotifications } from '@capacitor/local-notifications'
import { NativePrayerNotifications } from './native-prayer-plugin.js'
import { getSettings } from './storage.js'
import { todayProgress, goalPages } from './progress.js'
import { reminderEntries } from './calendar-notes.js'
import { isAndroidApp } from './platform.js'
import { refreshNotificationPermission, requestNotifPermission } from './notification.js'

const PRAYERS = ['subuh', 'zuhur', 'asar', 'magrib', 'isya']
const soundChoice = (value) => ['default', 'alarm', 'silent'].includes(value) ? value : 'default'

export function isFutureCalendarReminder(reminder, now = Date.now()) {
  if (!reminder || !/^\d{4}-\d{2}-\d{2}$/.test(reminder.date || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time || '')) return false
  const [year, month, day] = reminder.date.split('-').map(Number)
  const [hour, minute] = reminder.time.split(':').map(Number)
  const at = new Date(0)
  at.setFullYear(year, month - 1, day)
  at.setHours(hour, minute, 0, 0)
  return at.getFullYear() === year && at.getMonth() === month - 1 && at.getDate() === day
    && at.getHours() === hour && at.getMinutes() === minute && at.getTime() > now
}

export function nativePrayerSettings(settings = getSettings()) {
  const a = settings.adzan || {}
  const r = settings.prayerReminders || {}
  const ramadan = settings.ramadanReminders || {}
  const reminders = settings.reminders || {}
  const location = settings.location && Number.isFinite(+settings.location.lat) && Number.isFinite(+settings.location.lng)
    ? { lat: +settings.location.lat, lng: +settings.location.lng, name: String(settings.location.name || '').slice(0, 100) }
    : null
  let timezone = 'Asia/Jakarta'
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone } catch {}
  return {
    enabled: !!(a.enabled || r.enabled || ramadan.imsakEnabled || reminders.tilawah || reminders.goal),
    location,
    method: ['kemenag', 'mwl', 'ummalqura', 'egypt', 'singapore'].includes(settings.prayerMethod) ? settings.prayerMethod : 'kemenag',
    timezone,
    hijriAdjust: Math.max(-2, Math.min(2, Number(settings.hijriAdjust) || 0)),
    adzan: {
      enabled: !!a.enabled,
      sound: a.sound !== false,
      voice: String(a.voice || 'a9'),
      volume: Math.max(0, Math.min(1, Number.isFinite(+a.volume) ? +a.volume : 1)),
      notificationSound: soundChoice(a.notificationSound),
      vibration: a.vibration !== false,
      subuh: a.subuh !== false,
      zuhur: a.zuhur !== false,
      asar: a.asar !== false,
      magrib: a.magrib !== false,
      isya: a.isya !== false,
      imsak: a.imsak !== false,
      imsakSound: soundChoice(a.imsakSound),
      imsakVibration: a.imsakVibration !== false && a.vibration !== false,
      tarhim: a.tarhim !== false,
      tarhimSound: soundChoice(a.tarhimSound),
      tarhimVibration: a.tarhimVibration !== false && a.vibration !== false
    },
    prayerReminders: {
      enabled: !!r.enabled,
      leadMinutes: Math.max(1, Math.min(60, Number(r.leadMinutes) || 10)),
      prayers: Object.fromEntries(PRAYERS.map((key) => [key, !r.prayers || r.prayers[key] !== false])),
      sound: soundChoice(r.sound),
      vibration: r.vibration !== false
    },
    ramadanReminders: {
      imsakEnabled: !!ramadan.imsakEnabled,
      imsakSound: soundChoice(ramadan.imsakSound),
      vibration: ramadan.vibration !== false
    },
    readingReminders: {
      tilawahEnabled: !!reminders.tilawah,
      tilawahTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(reminders.tilawahTime || '') ? reminders.tilawahTime : '18:30',
      goalEnabled: !!reminders.goal,
      goalTime: '20:30',
      targetPages: goalPages(settings.goal),
      currentProgressDate: '',
      currentProgressPages: 0
    },
    calendarReminders: []
  }
}

export async function syncAndroidPrayerNotifications(settings = getSettings()) {
  if (!isAndroidApp()) return null
  try {
    const payload = nativePrayerSettings(settings)
    const progress = await todayProgress().catch(() => ({ date: '', pages: 0 }))
    payload.readingReminders.currentProgressDate = progress.date
    payload.readingReminders.currentProgressPages = progress.pages
    payload.calendarReminders = reminderEntries()
    payload.enabled = payload.enabled || payload.calendarReminders.some((reminder) => isFutureCalendarReminder(reminder))
    return await NativePrayerNotifications.sync({ settings: payload })
  } catch (error) {
    console.warn('[QuranKu] Jadwal alarm Android gagal disinkronkan', error)
    return null
  }
}

export async function getNativePrayerStatus() {
  if (!isAndroidApp()) return null
  const [native, notifications, exact] = await Promise.all([
    NativePrayerNotifications.getStatus().catch(() => ({})),
    LocalNotifications.checkPermissions().catch(() => ({ display: 'prompt' })),
    LocalNotifications.checkExactNotificationSetting().catch(() => ({ exact_alarm: 'prompt' }))
  ])
  await refreshNotificationPermission()
  return {
    ...native,
    notificationPermission: notifications.display || 'prompt',
    notificationsAllowed: native.notificationsAllowed ?? notifications.display === 'granted',
    exactAlarmAllowed: native.exactAlarmAllowed ?? exact.exact_alarm === 'granted',
    exactAlarmPermission: exact.exact_alarm || (native.exactAlarmAllowed ? 'granted' : 'denied')
  }
}

/** Request notification permission and, when needed, open Android's exact-alarm access screen. */
export async function requestAndroidReminderPermissions() {
  if (!isAndroidApp()) return { notificationPermission: 'unsupported', exactAlarmPermission: 'unsupported' }
  const notificationPermission = await requestNotifPermission()
  if (notificationPermission !== 'granted') return { notificationPermission, exactAlarmPermission: 'unsupported' }
  const status = await getNativePrayerStatus()
  const exactAlarmPermission = status && status.exactAlarmAllowed ? 'granted' : await requestExactAlarmAccess()
  return { notificationPermission, exactAlarmPermission }
}

export async function requestExactAlarmAccess() {
  if (!isAndroidApp()) return 'unsupported'
  try {
    const result = await LocalNotifications.changeExactNotificationSetting()
    return result.exact_alarm || 'prompt'
  } catch {
    try {
      await NativePrayerNotifications.openExactAlarmSettings()
      return 'prompt'
    } catch {
      return 'denied'
    }
  }
}

export async function openAndroidNotificationSettings() {
  if (!isAndroidApp()) return
  await NativePrayerNotifications.openNotificationSettings()
}

export async function startNativeAzan(key, voice, volume) {
  if (!isAndroidApp()) return false
  try {
    await NativePrayerNotifications.playAzan({ key, voice, volume })
    return true
  } catch {
    return false
  }
}

export async function stopNativeAzan() {
  if (!isAndroidApp()) return
  try { await NativePrayerNotifications.stopPlayback() } catch {}
}
