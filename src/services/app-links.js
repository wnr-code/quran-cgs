import { APP } from '../config.js'

/**
 * Alamat App Link QuranKu. Semua halaman dibuka dari satu alamat tetap
 * (https://quran.cgs.my.id/...) supaya tautan yang dibagikan selalu bisa dibuka
 * di aplikasi; bila domain utama sedang mati, pemindah data memakai cermin
 * https://quran-cgs.appwnr.workers.dev (lihat failover.js).
 */
export const APP_LINK_BASE = APP.origin

/** Alamat App Link untuk jalur internal, mis. '/surah/2/255' → 'https://quran.cgs.my.id/surah/2/255'. */
export function appLinkUrl(path = '/') {
  const clean = '/' + String(path).replace(/^\/+/, '')
  return APP_LINK_BASE + clean
}

/**
 * Jalur internal hanya untuk tautan yang memang diklaim aplikasi.
 * Mendukung bentuk bersih (/surah/2/255), bentuk hash lama (/#/surah/2/255), dan root.
 */
export function appLinkRoute(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) return null
  try {
    const url = new URL(rawUrl)
    if (url.origin !== APP.origin) return null
    if (url.hash.startsWith('#/')) return url.hash.slice(1)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    // Halaman statis (privacy.html, dsb.) tetap dibuka sebagai web.
    if (path !== '/' && /\.[a-z0-9]+$/i.test(path)) return null
    return path
  } catch {
    return null
  }
}

/**
 * Jalur internal dari parameter ?url= (dipakai pembuka.html setelah peramban
 * memaksa tautan kembali ke Android) — hanya untuk alamat milik QuranKu.
 */
export function appLinkRouteFromRedirect(rawUrl, origin = APP.origin) {
  if (typeof rawUrl !== 'string' || !rawUrl) return null
  try {
    return appLinkRoute(new URL(rawUrl, origin).toString())
  } catch {
    return null
  }
}

/**
 * Tautan penolong untuk peramban dalam aplikasi (WhatsApp, Instagram, dsb.).
 * Peramban seperti itu menelan tautan https sehingga aplikasi tidak pernah
 * menerima intent. Tautan ini membuka halaman perantara yang meminta kepada
 * Android untuk membuka aplikasi QuranKu.
 */
export const linkOpenerUrl = (path = '/') => `/buka.html?next=${encodeURIComponent(path)}`

/** True bila halaman sedang tampil di peramban dalam aplikasi (bukan Chrome/Safari biasa). */
export function isInAppBrowser(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|TikTok|musical_ly|Telegram|Twitter|MicroMessenger/i.test(ua) || (/Android/i.test(ua) && /; wv\)/.test(ua))
}

/** Intent Android yang membuka QuranKu bila terpasang, atau Play Store bila belum. */
export const nativeAppIntentUrl = (path = '/', pkg = APP.packageId) => {
  const next = appLinkUrl(path).replace(/^https?:\/\//, '')
  return `intent://${next}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${encodeURIComponent(APP.playStoreUrl)};end`
}
