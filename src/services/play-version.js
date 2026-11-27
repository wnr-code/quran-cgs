// Versi QuranKu di Play Store, dipakai bersama oleh halaman Pengaturan dan kotak masuk.
//
// Angka versi di sini adalah versi yang SUDAH tayang di Play (bisa dipasang pengguna), bukan
// versi build web yang sedang berjalan. Dengan begitu pengguna APK tidak diberi tahu "versi
// 1.4.49 tersedia" untuk pembaruan yang sebenarnya baru bisa dipasang setelah AAB diunggah.
import { APP } from '../config.js'
import { isNativePlatform } from './platform.js'

const CACHE_KEY = 'quranku:play-version'
const TTL = 60 * 60 * 1000
// Ingatan singkat di memori (termasuk kegagalan) supaya lonceng notifikasi yang dirender
// berulang tidak memicu permintaan baru setiap kali.
const MEMORY_MS = 5 * 60 * 1000
let memory = { version: null, at: 0 }
const VERSION_RE = /^\d{1,4}(\.\d{1,4}){1,3}$/

/** Bandingkan dua versi bertitik; > 0 bila `left` lebih baru. */
export function compareVersions(left, right) {
  const a = String(left || '').split('.')
  const b = String(right || '').split('.')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number(a[i] || 0)
    const y = Number(b[i] || 0)
    if (x !== y) return x > y ? 1 : -1
  }
  return 0
}

function readCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (raw && typeof raw.version === 'string' && VERSION_RE.test(raw.version) && Date.now() - Number(raw.at) < TTL) return raw.version
  } catch {}
  return null
}

function writeCache(version) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ version, at: Date.now() }))
  } catch {}
}

/**
 * Versi di Play Store, atau `null` bila tidak bisa diketahui (offline, endpoint gagal,
 * atau markup Google berubah). Tidak pernah melempar dan tidak pernah memblokir UI lama.
 */
export async function fetchPlayVersion({ force = false, timeout = 6000 } = {}) {
  if (!force) {
    const cached = readCache()
    if (cached) return cached
    if (Date.now() - memory.at < MEMORY_MS) return memory.version
  }
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null
  try {
    const res = await fetch('/api/play/version', { cache: force ? 'no-store' : 'default', signal: controller ? controller.signal : undefined })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.ok === false || typeof data.version !== 'string' || !VERSION_RE.test(data.version)) {
      memory = { version: null, at: Date.now() }
      return null
    }
    memory = { version: data.version, at: Date.now() }
    writeCache(data.version)
    return data.version
  } catch {
    memory = { version: null, at: Date.now() }
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** `{ version, installed, available }` — `available` true bila Play lebih baru dari yang berjalan. */
export async function checkPlayUpdate({ force = false } = {}) {
  const version = await fetchPlayVersion({ force })
  const installed = APP.version
  return { version, installed, available: !!version && compareVersions(version, installed) > 0 }
}

/** Notifikasi pembaruan hanya relevan untuk APK: PWA memperbarui dirinya dari server. */
export const showsPlayUpdate = () => isNativePlatform()
