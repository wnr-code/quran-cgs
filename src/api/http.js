import { API } from '../config.js'
import { sleep } from '../utils/helpers.js'

export class ApiError extends Error {
  constructor(message, { status = 0, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.cause = cause
  }
}

/** fetch JSON dengan timeout + retry terbatas. Tidak pernah mengembalikan data yang gagal di-parse. */
export async function fetchJson(url, { timeout = API.timeout, retries = API.retries } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeout)
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      if (!res.ok) {
        const err = new ApiError(`HTTP ${res.status}`, { status: res.status })
        // 4xx (selain 408/429) tidak perlu diulang
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) throw Object.assign(err, { noRetry: true })
        throw err
      }
      const type = res.headers.get('content-type') || ''
      if (!type.includes('json')) throw Object.assign(new ApiError('Respons bukan JSON'), { noRetry: true })
      return await res.json()
    } catch (e) {
      lastErr = e instanceof ApiError ? e : new ApiError(e && e.name === 'AbortError' ? 'Waktu permintaan habis' : 'Jaringan tidak tersedia', { cause: e })
      if (e && e.noRetry) break
      if (attempt < retries) await sleep(600 * (attempt + 1))
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastErr
}
