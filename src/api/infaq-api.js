// Klien alur infaq (server aplikasi sendiri: /api/infaq/*). Tidak ada kunci pembayaran di sisi peramban.
import { INFAQ } from '../config.js'

async function request(path, { method = 'GET', body, timeout = 20000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(INFAQ.api + path, {
      method,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    })
    const type = res.headers.get('content-type') || ''
    const json = type.includes('json') ? await res.json() : null
    if (!json || typeof json !== 'object') throw Object.assign(new Error('unavailable'), { code: 'unavailable', status: res.status })
    if (!res.ok || json.ok !== true) throw Object.assign(new Error(json.error || 'error'), { code: json.error || 'error', status: res.status })
    return json
  } catch (e) {
    if (e && e.code) throw e
    throw Object.assign(new Error('network'), { code: 'network' })
  } finally {
    clearTimeout(timer)
  }
}

const STATUSES = ['pending', 'paid', 'expired']
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

function cleanIntent(j) {
  if (typeof j.id !== 'string' || !/^[0-9a-f]{32}$/.test(j.id)) throw Object.assign(new Error('invalid'), { code: 'invalid' })
  const mode = j.mode === 'qris' && typeof j.qr === 'string' && /^000201[\x20-\x7E]{40,900}$/.test(j.qr) ? 'qris' : 'redirect'
  const https = (v) => {
    if (mode !== 'redirect' || typeof v !== 'string') return ''
    try {
      const u = new URL(v)
      return u.protocol === 'https:' ? u.href : ''
    } catch {
      return ''
    }
  }
  return { id: j.id, mode, qr: mode === 'qris' ? j.qr : '', url: https(j.url), embedUrl: https(j.embedUrl), amount: num(j.amount), quantity: num(j.quantity), name: String(j.name || '').slice(0, 40), expiresAt: num(j.expiresAt) }
}

export async function getInfaqConfig() {
  const j = await request('/config', { timeout: 10000 })
  return { enabled: j.enabled === true && num(j.unitPrice) > 0, unitPrice: num(j.unitPrice), maxQuantity: num(j.maxQuantity) || 1, direct: j.direct === true }
}

export const createInfaq = async ({ quantity, name, message }) => cleanIntent(await request('/create', { method: 'POST', body: { quantity, name, message }, timeout: 30000 }))

function cleanStatus(j) {
  return {
    status: STATUSES.includes(j.status) ? j.status : 'pending',
    amount: num(j.amount),
    name: String(j.name || '').slice(0, 40),
    claim: j.claim === 'not_found' ? 'not_found' : '',
    donation: j.donation && typeof j.donation === 'object' ? { name: String(j.donation.name || '').slice(0, 60), amount: num(j.donation.amount), at: num(j.donation.at) } : null
  }
}

export const getInfaqStatus = async (id) => cleanStatus(await request('/status?id=' + encodeURIComponent(id), { timeout: 15000 }))
export const claimInfaq = async (id, ref) => cleanStatus(await request('/claim', { method: 'POST', body: { id, ref }, timeout: 25000 }))
