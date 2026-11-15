// Layanan offline: Service Worker, unduhan teks surah, unduhan audio manual, info penyimpanan.
import { getSurah, getTafsir, forgetSurah, clearMemory } from '../api/api-adapter.js'
import { surahRepo, tafsirRepo, audioRepo } from '../database/repositories.js'
import { emit, toast } from '../utils/helpers.js'

export const AUDIO_CACHE = 'quranku-audio-v1'

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing
      if (!sw) return
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) toast('Versi baru QuranKu siap. Tutup lalu buka kembali aplikasi untuk memperbarui.', 6000)
      })
    })
    return reg
  } catch (e) {
    console.warn('[sw] gagal mendaftar', e)
    return null
  }
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
