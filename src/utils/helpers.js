import { Capacitor } from '@capacitor/core'

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

export async function shareText(title, text, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'
    }
  }
  const ok = await copyText(url ? `${text}\n${url}` : text)
  return ok ? 'copied' : 'failed'
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

export const isStandalone = () =>
  Capacitor.isNativePlatform() ||
  (typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) ||
  navigator.standalone === true
