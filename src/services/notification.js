// Pengingat lokal (tanpa server push). KETERBATASAN: browser/Android hanya dapat menampilkan
// pengingat ini selama QuranKu terbuka atau masih berjalan di latar belakang. Tidak ada jaminan
// notifikasi muncul ketika aplikasi ditutup sepenuhnya.
import { getSettings } from './storage.js'
import { todayProgress, goalPages } from './progress.js'
import { dateKey, formatClock } from '../utils/format.js'

export const notifSupported = () => 'Notification' in globalThis
export const notifPermission = () => (notifSupported() ? Notification.permission : 'unsupported')

/** Dipanggil HANYA setelah pengguna mengaktifkan fitur pengingat. */
export async function requestNotifPermission() {
  if (!notifSupported()) return 'unsupported'
  if (Notification.permission === 'default') return Notification.requestPermission()
  return Notification.permission
}

export async function showNotification(title, body, tag) {
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
  if (notifPermission() !== 'granted' || (!r.tilawah && !r.goal)) return
  const now = new Date()
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
