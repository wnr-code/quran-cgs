// Alamat cadangan: bila alamat utama mati (DNS/domain/SSL bermasalah atau galat 5xx dari Cloudflare), permintaan
// data aplikasi (/api, /data, /version.json) otomatis diulang ke alamat lain yang menyajikan Worker yang sama.
// Tampilan PWA disimpan Service Worker; di Android Capacitor, tampilan dan /data dibundel di APK.
import { Capacitor } from '@capacitor/core'
import { APP } from '../config.js'

const DEAD = new Set([520, 521, 522, 523, 524, 525, 526, 530])
const PREFER_MS = 3 * 60 * 1000 // setelah beralih, langsung pakai cadangan selama 3 menit sebelum mencoba utama lagi
const PATHS = /^\/(api\/|data\/|version\.json)/

/** Alamat lain selain alamat yang sedang dipakai; kosong bila aplikasi tidak dibuka dari alamat resmi (mis. localhost). */
export function otherMirrors(origin, mirrors = APP.mirrors) {
  return mirrors.includes(origin) ? mirrors.filter((m) => m !== origin) : []
}

/**
 * Membuat fungsi fetch dengan cadangan. `state` menyimpan alamat yang sedang dipilih.
 * Hanya permintaan same-origin ke PATHS yang dialihkan; lainnya diteruskan apa adanya.
 */
export function createFailoverFetch(baseFetch, origin, mirrors = APP.mirrors, { now = () => Date.now(), isOnline = () => true, onSwitch } = {}) {
  const others = otherMirrors(origin, mirrors)
  const state = { active: origin, until: 0 }
  const f = async (input, init) => {
    if (!others.length) return baseFetch(input, init)
    const isReq = typeof Request !== 'undefined' && input instanceof Request
    let url
    try {
      url = new URL(isReq ? input.url : String(input), origin)
    } catch {
      return baseFetch(input, init)
    }
    if (url.origin !== origin || !PATHS.test(url.pathname)) return baseFetch(input, init)
    const rel = url.pathname + url.search
    // Permintaan ke alamat lain bersifat lintas-origin: tanpa kredensial, mode cors.
    const via = (o) => {
      if (o === origin) return baseFetch(isReq ? input.clone() : input, init)
      const opt = isReq ? { method: input.method, headers: input.headers } : { ...(init || {}) }
      return (isReq && !/^(GET|HEAD)$/i.test(input.method) ? input.clone().text() : Promise.resolve(opt.body)).then((body) => baseFetch(o + rel, { ...opt, body, mode: 'cors', credentials: 'omit' }))
    }
    if (state.active !== origin && now() > state.until) state.active = origin
    const order = [state.active, ...[origin, ...others].filter((o) => o !== state.active)]
    let firstErr, firstRes
    for (const o of order) {
      try {
        const res = await via(o)
        if (!DEAD.has(res.status)) {
          if (o !== state.active || (o !== origin && !state.until)) onSwitch && onSwitch(o)
          if (o !== origin) Object.assign(state, { active: o, until: now() + PREFER_MS })
          else Object.assign(state, { active: origin, until: 0 })
          return res
        }
        firstRes ??= res
      } catch (e) {
        if (init && init.signal && init.signal.aborted) throw e
        firstErr ??= e
        if (!isOnline()) throw e // perangkat memang offline: tidak perlu mencoba alamat lain
      }
    }
    if (firstRes) return firstRes
    throw firstErr
  }
  f.state = state
  return f
}

/**
 * In a Capacitor WebView the UI is served from its bundled https://localhost origin, not the production Worker.
 * Keep bundled /data files local, but send same-app API calls to the existing Worker endpoints.
 */
export function createNativeApiFetch(baseFetch, localOrigin, backendOrigin = APP.origin) {
  return (input, init) => {
    const isReq = typeof Request !== 'undefined' && input instanceof Request
    let url
    try {
      url = new URL(isReq ? input.url : String(input), localOrigin)
    } catch {
      return baseFetch(input, init)
    }
    if (url.origin !== localOrigin || !url.pathname.startsWith('/api/')) return baseFetch(input, init)
    const remote = new URL(url.pathname + url.search, backendOrigin).href
    return baseFetch(isReq ? new Request(remote, input.clone()) : remote, init)
  }
}

/** Install once; the PWA's same-origin behavior and mirror failover remain unchanged. */
export function installFetchFailover() {
  if (typeof window === 'undefined' || window.__failover) return
  const native = Capacitor.isNativePlatform()
  const localOrigin = location.origin
  const rawFetch = window.fetch.bind(window)
  const base = native ? createNativeApiFetch(rawFetch, localOrigin) : rawFetch
  const origin = native ? APP.origin : localOrigin
  const f = createFailoverFetch(base, origin, APP.mirrors, {
    isOnline: () => navigator.onLine !== false,
    onSwitch: (o) => document.documentElement.classList.toggle('using-mirror', o !== origin)
  })
  window.__failover = f.state
  window.fetch = f
}
