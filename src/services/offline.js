// Layanan offline: Service Worker, unduhan teks surah, unduhan audio manual, info penyimpanan.
import { getSurah, getTafsir, forgetSurah, clearMemory } from '../api/api-adapter.js'
import { surahRepo, tafsirRepo, audioRepo } from '../database/repositories.js'
import { emit, toast } from '../utils/helpers.js'
import { getAudioState } from './audio.js'
import { APP } from '../config.js'
import { isNativePlatform } from './platform.js'

export const AUDIO_CACHE = 'quranku-audio-v1'

export async function registerServiceWorker() {
  // Capacitor already serves this production bundle from the installed APK; let Android updates replace it.
  if (isNativePlatform() || !('serviceWorker' in navigator) || !import.meta.env.PROD) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    // Versi baru dipasang otomatis: Service Worker baru langsung mengambil alih, lalu halaman dimuat ulang
    // sekali — kecuali pengguna sedang membaca atau memutar murottal (ditunda sampai aplikasi disembunyikan).
    const hadController = !!navigator.serviceWorker.controller
    let reloaded = false
    const busy = () => document.body.classList.contains('reading-mode') || document.body.classList.contains('sheet-open') || getAudioState().playing
    const reload = () => {
      if (reloaded) return
      reloaded = true
      location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return
      if (!busy()) return reload()
      toast('Versi baru QuranKu siap dan akan dipasang saat aplikasi dibuka kembali.', 5000)
      document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && !getAudioState().playing && reload())
    })
    // PWA yang lama terbuka tetap memeriksa versi baru saat kembali ke layar.
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && navigator.onLine && checkForUpdate().catch(() => {}))
    // PWA terpasang sering dibuka dari keadaan tersimpan (tanpa navigasi baru), jadi versi diperiksa sendiri saat mulai.
    setTimeout(() => navigator.onLine && checkForUpdate().catch(() => {}), 3000)
    return reg
  } catch (e) {
    console.warn('[sw] gagal mendaftar', e)
    return null
  }
}

/**
 * Memeriksa versi yang ada di server dan memasangnya bila berbeda dari yang sedang berjalan.
 * Mengembalikan 'latest' | 'updating' | 'offline'. Dipanggil saat aplikasi dibuka dan dari tombol "Periksa pembaruan".
 */
export async function checkForUpdate({ force = false } = {}) {
  // Capacitor assets are bundled in the APK; platform updates come through Android, not the PWA update path.
  if (isNativePlatform() || !import.meta.env.PROD) return 'latest'
  let remote
  try {
    const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) throw new Error(String(res.status))
    remote = await res.json()
  } catch {
    return 'offline'
  }
  const same = remote.version === APP.version && remote.number === APP.build
  if (same && !force) return 'latest'
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
  if (same) {
    if (reg) reg.update().catch(() => {})
    return 'latest'
  }
  // Paling banyak satu kali muat ulang per build, supaya tidak pernah terjadi lingkaran muat ulang.
  const mark = 'qk-update:' + remote.version + ':' + remote.number
  if (!reg) {
    if (!force && sessionStorage.getItem(mark)) return 'latest'
    sessionStorage.setItem(mark, '1')
    location.reload()
    return 'updating'
  }
  await reg.update().catch(() => {})
  // Service Worker baru akan mengambil alih lalu halaman dimuat ulang (lihat controllerchange di atas).
  // Jaring pengaman: bila setelah 20 detik belum berganti (SW tersangkut), buang cache cangkang lalu muat ulang.
  if (force)
    setTimeout(async () => {
      try {
        for (const k of await caches.keys()) if (k.startsWith('quranku-shell-')) await caches.delete(k)
      } catch {}
      location.reload()
    }, 20000)
  return 'updating'
}

export function watchConnectivity() {
  const apply = () => {
    document.documentElement.classList.toggle('is-offline', !navigator.onLine)
    emit('connectivity', navigator.onLine)
  }
  addEventListener('online', apply)
  addEventListener('offline', apply)
  apply()
}

/** Unduh teks beberapa surah (selektif) ke IndexedDB. onProgress(done, total, nomor, ok) */
export async function downloadSurahs(numbers, { withTafsir = false, onProgress, signal } = {}) {
  let done = 0
  let failed = 0
  for (const n of numbers) {
    if (signal && signal.aborted) break
    let ok = true
    try {
      await getSurah(n)
      if (withTafsir) await getTafsir(n)
    } catch {
      ok = false
      failed++
    }
    done++
    onProgress && onProgress(done, numbers.length, n, ok)
  }
  emit('offline:changed')
  return { done, failed }
}

export async function deleteSurah(n) {
  await surahRepo.delete(n)
  forgetSurah(n)
  emit('offline:changed')
}

export async function clearTextCache() {
  await surahRepo.clear()
  await tafsirRepo.clear()
  clearMemory()
  emit('offline:changed')
}

/** Unduh satu berkas audio secara manual untuk diputar offline. */
export async function downloadAudio(url, info = {}) {
  if (!('caches' in globalThis)) throw new Error('Cache API tidak didukung')
  const cache = await caches.open(AUDIO_CACHE)
  let res
  let opaque = false
  try {
    res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
  } catch {
    // Server audio tanpa CORS: simpan sebagai respons opaque (tetap dapat diputar lewat Service Worker).
    res = await fetch(url, { mode: 'no-cors' })
    opaque = true
  }
  let size = 0
  if (!opaque) {
    const blob = await res.clone().blob()
    size = blob.size
  }
  await cache.put(url, res)
  await audioRepo.put({ url, size, opaque, at: Date.now(), ...info })
  emit('offline:changed')
  return { size, opaque }
}

export async function isAudioDownloaded(url) {
  if (!('caches' in globalThis)) return false
  try {
    return !!(await (await caches.open(AUDIO_CACHE)).match(url))
  } catch {
    return false
  }
}

/** URL yang dapat diputar: blob lokal bila sudah diunduh (non-opaque), selain itu URL asli. */
export async function resolveAudioUrl(url) {
  if (!('caches' in globalThis)) return { src: url, local: false }
  try {
    const res = await (await caches.open(AUDIO_CACHE)).match(url)
    if (res && res.type !== 'opaque') return { src: URL.createObjectURL(await res.blob()), local: true, blob: true }
    if (res) return { src: url, local: true }
  } catch {}
  return { src: url, local: false }
}

export async function deleteAudio(url) {
  try {
    await (await caches.open(AUDIO_CACHE)).delete(url)
  } catch {}
  await audioRepo.delete(url)
  emit('offline:changed')
}

export async function clearAudio() {
  try {
    await caches.delete(AUDIO_CACHE)
  } catch {}
  await audioRepo.clear()
  emit('offline:changed')
}

/** Hapus cache aplikasi (aset) — akan diunduh ulang saat online. */
export async function clearAppCache() {
  if (!('caches' in globalThis)) return
  for (const k of await caches.keys()) if (k !== AUDIO_CACHE) await caches.delete(k)
}

export async function storageInfo() {
  const info = { usage: 0, quota: 0, persisted: false, surahs: 0, tafsir: 0, audio: 0 }
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate()
      info.usage = e.usage || 0
      info.quota = e.quota || 0
    }
    if (navigator.storage && navigator.storage.persisted) info.persisted = await navigator.storage.persisted()
  } catch {}
  info.surahs = (await surahRepo.keys()).length
  info.tafsir = (await tafsirRepo.keys()).length
  info.audio = (await audioRepo.all()).length
  return info
}

export async function requestPersistence() {
  try {
    return !!(navigator.storage && navigator.storage.persist && (await navigator.storage.persist()))
  } catch {
    return false
  }
}
