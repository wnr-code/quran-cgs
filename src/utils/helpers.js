import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { Share } from '@capacitor/share'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { NativeImageGallery } from '../services/native-image-gallery.js'

export const $ = (sel, root = document) => root.querySelector(sel)
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel))

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
/** Escape HTML — semua data dari API/pengguna wajib melewati fungsi ini sebelum masuk innerHTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c])
}

/** Buang tag HTML (mis. deskripsi surah dari API) menjadi teks polos. */
export function stripHtml(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim()
}

export function debounce(fn, ms = 250) {
  let t
  return (...a) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...a), ms)
  }
}

export function throttle(fn, ms = 150) {
  let last = 0
  let t
  return (...a) => {
    const now = Date.now()
    const wait = ms - (now - last)
    clearTimeout(t)
    if (wait <= 0) {
      last = now
      fn(...a)
    } else {
      t = setTimeout(() => {
        last = Date.now()
        fn(...a)
      }, wait)
    }
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

/** Event bus sederhana */
const bus = new EventTarget()
export function emit(name, detail) {
  bus.dispatchEvent(new CustomEvent(name, { detail }))
}
export function on(name, fn) {
  const h = (e) => fn(e.detail)
  bus.addEventListener(name, h)
  return () => bus.removeEventListener(name, h)
}

let toastTimer
export function toast(message, ms = 2600) {
  let el = document.getElementById('toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'toast'
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    document.body.appendChild(el)
  }
  el.textContent = message
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), ms)
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {}
    ta.remove()
    return ok
  }
}

/**
 * Apakah tombol "Aplikasi lain" (share sheet sistem) layak ditampilkan?
 *
 * Di APK, navigator.share TIDAK tersedia: WebView Android tidak mengimplementasikan Web Share API
 * (hanya Chrome sebagai peramban yang punya). Karena itu jalur native memakai plugin
 * @capacitor/share, dan keberadaan plugin itulah yang harus diperiksa — bukan navigator.share.
 * Bila plugin tidak terpasang (APK lama), tombolnya disembunyikan agar pengguna tidak menekan
 * tombol yang tidak bisa berbuat apa-apa.
 */
export const canShareText = () =>
  (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Share')) ||
  (typeof navigator !== 'undefined' && typeof navigator.share === 'function')

/** Share pakai Android/iOS share sheet atau Web Share API; tidak pernah diam-diam menyalin teks. */
export async function shareText(title, text, url) {
  const options = { title, text, url }
  try {
    if (Capacitor.isNativePlatform()) {
      if (!Capacitor.isPluginAvailable('Share')) return 'unsupported'
      const { value } = await Share.canShare()
      if (!value) return 'unsupported'
      // Android menggabungkan text + url menjadi satu EXTRA_TEXT (lihat SharePlugin.java).
      // Kirim url terpisah hanya bila tidak ada teks, supaya tautan tidak muncul dua kali.
      const payload = text ? { ...options, url: undefined } : options
      await Share.share({ ...payload, dialogTitle: title })
      return 'shared'
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share(options)
      return 'shared'
    }
    return 'unsupported'
  } catch (e) {
    if (e && (e.name === 'AbortError' || /share canceled/i.test(e.message || ''))) return 'cancelled'
    return 'failed'
  }
}

function cancelledShare(error) {
  return !!error && (error.name === 'AbortError' || /share canceled|user canceled/i.test(error.message || ''))
}

function blobToBase64(blob) {
  if (typeof FileReader === 'undefined') {
    if (typeof blob?.arrayBuffer !== 'function' || typeof btoa !== 'function') {
      return Promise.reject(new Error('Gagal membaca gambar.'))
    }
    return blob.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer)
      const chunks = []
      const chunkSize = 0x8000
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + chunkSize)))
      }
      return btoa(chunks.join(''))
    })
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca gambar.'))
    reader.readAsDataURL(blob)
  })
}

/** Bagikan PNG/JPG melalui Web Share/Capacitor; jika berkas tidak didukung, unduh gambar sebagai fallback. */
export async function shareImage(blob, { filename = 'quranku-ayat.png', title = 'Bagikan ayat', text = '' } = {}) {
  if (!blob || typeof blob.size !== 'number' || blob.size === 0) return 'failed'
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '-')
  const options = { title, text }

  if (Capacitor.isNativePlatform()) {
    try {
      const { value } = await Share.canShare()
      if (value) {
        const data = await blobToBase64(blob)
        const { uri } = await Filesystem.writeFile({
          path: `${Date.now()}-${safeName}`,
          data,
          directory: Directory.Cache
        })
        await Share.share({ ...options, files: [uri], dialogTitle: title })
        return 'shared'
      }
    } catch (error) {
      if (cancelledShare(error)) return 'cancelled'
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof File === 'function') {
    const file = new File([blob], safeName, { type: blob.type || 'image/png' })
    let canShareFiles = typeof navigator.canShare !== 'function'
    try {
      if (typeof navigator.canShare === 'function') canShareFiles = navigator.canShare({ files: [file] })
    } catch {}
    if (canShareFiles) {
      try {
        await navigator.share({ ...options, files: [file] })
        return 'shared'
      } catch (error) {
        if (cancelledShare(error)) return 'cancelled'
      }
    }
  }

  return downloadImage(safeName, blob, blob.type || 'image/png')
}

/** Buka tujuan sosial lewat Custom Tab Capacitor di Android/iOS, tab baru pada web. */
export async function openExternal(url) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url, toolbarColor: '#0b3d2e' })
      return true
    } catch {
      return false
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

/** Laporkan kegagalan saja; dialog share native sendiri menampilkan hasil bagi. */
export function reportShareResult(result) {
  if (result === 'unsupported') toast('Fitur bagikan tidak didukung di perangkat ini; teks tidak disalin otomatis.')
  else if (result === 'failed') toast('Gagal membagikan. Coba lagi.')
}

export function downloadFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Save generated images to Android's public MediaStore; keep normal browser downloads elsewhere. */
export async function downloadImage(filename, content, type = content?.type || 'image/png', options = {}) {
  if (!content || typeof content.size !== 'number' || content.size === 0) return 'failed'
  const mimeType = type || content.type || 'image/png'
  const platform = options.platform ?? Capacitor.getPlatform()

  if (platform === 'android') {
    try {
      const saveToGallery = options.saveToGallery || ((payload) => NativeImageGallery.saveImage(payload))
      const result = await saveToGallery({ filename, mimeType, data: await blobToBase64(content) })
      return result?.saved === true ? 'saved' : 'failed'
    } catch {
      return 'failed'
    }
  }

  try {
    await (options.download || downloadFile)(filename, content, mimeType)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

export const isStandalone = () =>
  Capacitor.isNativePlatform() ||
  (typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) ||
  navigator.standalone === true
