import { APP } from '../config.js'

/** Return a QuranKu hash-router path only for links the Android intent filter accepts. */
export function appLinkRoute(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl) return null
  try {
    const url = new URL(rawUrl)
    if (url.origin !== APP.origin || url.pathname !== '/') return null
    return url.hash.startsWith('#/') ? url.hash.slice(1) : '/'
  } catch {
    return null
  }
}
