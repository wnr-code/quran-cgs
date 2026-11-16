// Android-only native prayer alarm bridge. PWA alarms and Web Push stay in adzan.js/worker.
import { registerPlugin } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { getSettings } from './storage.js'
import { isAndroidApp } from './platform.js'
import { refreshNotificationPermission } from './notification.js'

const NativePrayerNotifications = registerPlugin('PrayerNotifications')
const PRAYERS = ['subuh', 'zuhur', 'asar', 'magrib', 'isya']
const soundChoice = (value) => ['default', 'alarm', 'silent'].includes(value) ? value : 'default'

export function nativePrayerSettings(settings = getSettings()) {
  const a = settings.adzan || {}
  const r = settings.prayerReminders || {}
  const ramadan = settings.ramadanReminders || {}
  const location = settings.location && Number.isFinite(+settings.location.lat) && Number.isFinite(+settings.location.lng)
    ? { lat: +settings.location.lat, lng: +settings.location.lng, name: String(settings.location.name || '').slice(0, 100) }
    : null
  let timezone = 'Asia/Jakarta'
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone } catch {}
  return {
    enabled: !!(a.enabled || r.enabled || ramadan.imsakEnabled),
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
    }
  }
}

export async function syncAndroidPrayerNotifications(settings = getSettings()) {
  if (!isAndroidApp()) return null
  try {
    return await NativePrayerNotifications.sync({ settings: nativePrayerSettings(settings) })
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
