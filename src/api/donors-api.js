// Papan Kebaikan infaq (anonim). Data berasal dari server aplikasi (/api/donors).
// Hanya pesan/doa + waktu yang diterima; nama & nominal tidak pernah dikirim server ke publik.
import { INFAQ } from '../config.js'
import { fetchJson } from './http.js'

const cleanDoa = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .filter((r) => r && typeof r.message === 'string' && r.message.trim())
    .map((r) => ({ message: r.message.slice(0, 280), at: Number(r.at) || 0 }))

/** @param {boolean} fresh lewati cache HTTP (dipakai tepat setelah infaq terkonfirmasi) */
export async function getDonors(fresh = false) {
  const json = await fetchJson(INFAQ.donorsApi + (fresh ? `?t=${Date.now()}` : ''), { retries: 0, timeout: 10000 })
  if (!json || json.ok !== true) throw new Error('Respons papan kebaikan tidak valid')
  return {
    doa: cleanDoa(json.doa),
    totals: { count: Number(json.totals && json.totals.count) || 0, doaCount: Number(json.totals && json.totals.doaCount) || 0 },
    updatedAt: Number(json.updatedAt) || Date.now()
  }
}
