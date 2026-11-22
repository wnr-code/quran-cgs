import { APP } from '../config.js'

/**
 * Return a QuranKu internal path only for links the Android intent filter accepts.
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
