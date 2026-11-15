// Penghubung ke penyedia pembayaran infaq (Trakteer). Semua kunci dibaca dari secret Worker; tidak pernah dikirim ke peramban.
//
// 1) Public API resmi  — GET /supports : riwayat dukungan yang diterima (dipakai untuk sinkronisasi).
// 2) Jalur checkout TIDAK RESMI — meniru permintaan halaman pembayaran untuk memperoleh QRIS.
//    Bentuk permintaan mengikuti proyek sumber terbuka SazumiVicky/trakteer-payment-api (2024) dan BELUM
//    terverifikasi terhadap layanan saat ini. Bila gagal, pemanggil wajib jatuh ke halaman pembayaran resmi.
import { cleanText, insertDonation, metaGet, metaSet } from './db.js'

const API_BASE = 'https://api.trakteer.id/v1/public'
const SITE = 'https://trakteer.id'
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
const WIB = 7 * 3600 * 1000

export const providerConfig = (env) => {
  const unitPrice = Math.max(0, parseInt(env.INFAQ_UNIT_PRICE, 10) || 0)
  return {
    username: cleanText(env.INFAQ_USERNAME, 60),
    unitPrice,
    hasApi: !!env.TRAKTEER_API_KEY,
    hasDirect: !!(env.TRAKTEER_SESSION && env.TRAKTEER_CSRF_TOKEN && env.TRAKTEER_CREATOR_ID && env.TRAKTEER_UNIT_ID),
    pageUrl: (q) => (env.INFAQ_USERNAME ? `${SITE}/${encodeURIComponent(env.INFAQ_USERNAME)}/tip?quantity=${q}` : '')
  }
}

/** "2025-03-11 13:44:07" (WIB) → epoch ms. */
export function parseWib(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s || ''))
  if (!m) return NaN
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - WIB
}

/** Memetakan satu entri /supports. Mengembalikan null bila bukan transaksi sukses atau tidak punya ID. */
export function mapSupport(s, now = Date.now()) {
  if (!s || typeof s !== 'object') return null
  if (s.status != null && String(s.status).toLowerCase() !== 'success') return null
  const id = cleanText(s.order_id, 100)
  const amount = Math.round(Number(s.amount) || 0)
  const t = parseWib(s.updated_at)
  if (!id || amount <= 0 || !Number.isFinite(t) || t > now + 3600000) return null
  // Dokumentasi menamai kolom nama `creator_name` pada /supports; `supporter_name` dipakai bila tersedia.
  const name = cleanText(s.supporter_name ?? s.creator_name, 60)
  return {
    id,
    name: name || 'Hamba Allah',
    nameUnknown: !name,
    unit: cleanText(s.unit_name, 30),
    quantity: Math.max(1, parseInt(s.quantity, 10) || 1),
    amount,
    type: 'tip',
    created_at: t
  }
}

/** Menarik riwayat dukungan dari Public API ke D1. Dibatasi agar tidak membanjiri API. */
export async function syncSupports(env, { minInterval = 20000, fetchImpl = fetch } = {}) {
  if (!env.TRAKTEER_API_KEY || !env.DB) return { ok: false, reason: 'not_configured' }
  const last = await metaGet(env.DB, 'sync_at')
  if (last && Date.now() - last.at < minInterval) return { ok: true, skipped: true }
  await metaSet(env.DB, 'sync_at', 'run')
  let res
  try {
    res = await fetchImpl(`${API_BASE}/supports?include=order_id,is_guest`, {
      headers: { key: env.TRAKTEER_API_KEY, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      signal: AbortSignal.timeout(10000)
    })
  } catch (e) {
    await metaSet(env.DB, 'sync_result', 'network_error')
    return { ok: false, reason: 'network_error' }
  }
  if (!res.ok) {
    await metaSet(env.DB, 'sync_result', 'http_' + res.status)
    return { ok: false, reason: 'http_' + res.status }
  }
  let list
  try {
    const body = await res.json()
    list = body && body.result && Array.isArray(body.result.data) ? body.result.data : null
  } catch {
    list = null
  }
  if (!list) {
    await metaSet(env.DB, 'sync_result', 'bad_format')
    return { ok: false, reason: 'bad_format' }
  }
  let added = 0
  for (const raw of list) {
    const d = mapSupport(raw)
    if (d && (await insertDonation(env.DB, d, 'api'))) added++
  }
  await metaSet(env.DB, 'sync_result', `ok:${list.length}:${added}`)
  return { ok: true, total: list.length, added }
}

/** Mencari string QRIS (EMV, diawali 000201) dan petunjuk lain di dalam respons apa pun bentuknya. */
export function extractPayment(value) {
  const out = { qr: '', ref: '', expiresAt: 0 }
  const seen = new Set()
  const walk = (v, key = '', depth = 0) => {
    if (depth > 6 || v == null) return
    if (typeof v === 'string') {
      const s = v.trim()
      if (!out.qr && /^000201[\x20-\x7E]{40,900}$/.test(s)) out.qr = s
      else if (!out.ref && /^(order_id|transaction_id|external_id|reference_id|ref|id)$/i.test(key) && /^[\w-]{6,100}$/.test(s)) out.ref = s
      else if (!out.expiresAt && /expir/i.test(key)) {
        const t = Date.parse(s)
        if (Number.isFinite(t)) out.expiresAt = t
      }
      return
    }
    if (typeof v !== 'object' || seen.has(v)) return
    seen.add(v)
    for (const [k, x] of Object.entries(v)) walk(x, k, depth + 1)
  }
  walk(value)
  return out
}

/**
 * Jalur tidak resmi: meminta QRIS langsung ke halaman pembayaran.
 * Selalu mengembalikan objek { ok, ... } dan tidak pernah melempar; diagnosis ringkas (tanpa rahasia) disimpan di meta.
 */
export async function createDirectQris(env, { quantity, name, message }, fetchImpl = fetch) {
  const cfg = providerConfig(env)
  if (!cfg.hasDirect) return { ok: false, reason: 'not_configured' }
  const diag = { at: Date.now(), step: 'checkout' }
  try {
    const res = await fetchImpl(`${SITE}/pay/xendit/qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: `trakteer-sess=${env.TRAKTEER_SESSION}`,
        Origin: SITE,
        Referer: `${SITE}/${encodeURIComponent(cfg.username)}`,
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': env.TRAKTEER_CSRF_TOKEN
      },
      body: JSON.stringify({
        form: 'create-tip',
        creator_id: env.TRAKTEER_CREATOR_ID,
        unit_id: env.TRAKTEER_UNIT_ID,
        quantity,
        payment_method: 'qris',
        display_name: name,
        support_message: message || '',
        ...(env.TRAKTEER_SUPPORTER_ID ? { supporter_id: env.TRAKTEER_SUPPORTER_ID } : {}),
        times: 'once'
      }),
      redirect: 'manual',
      signal: AbortSignal.timeout(12000)
    })
    diag.status = res.status
    diag.type = res.headers.get('content-type') || ''
    const raw = await res.text()
    diag.length = raw.length
    let body = null
    try {
      body = JSON.parse(raw)
    } catch {
      diag.note = 'bukan JSON'
    }
    if (body && typeof body === 'object') diag.keys = Object.keys(body).slice(0, 20)
    const found = body ? extractPayment(body) : { qr: '' }
    diag.qr = !!found.qr
    await metaSet(env.DB, 'direct_diag', JSON.stringify(diag))
    if (!res.ok || !found.qr) return { ok: false, reason: res.ok ? 'no_qr' : 'http_' + res.status }
    return { ok: true, qr: found.qr, ref: found.ref, expiresAt: found.expiresAt }
  } catch (e) {
    diag.note = 'gagal: ' + String(e && e.name ? e.name : e).slice(0, 40)
    try {
      await metaSet(env.DB, 'direct_diag', JSON.stringify(diag))
    } catch {}
    return { ok: false, reason: 'network_error' }
  }
}
