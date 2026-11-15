// Papan donatur infaq. Data berasal dari Cloudflare Pages Function (/api/donors) yang diisi webhook Trakteer.
import { TRAKTEER } from '../config.js'
import { fetchJson } from './http.js'

const clean = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .filter((r) => r && typeof r.name === 'string')
    .map((r) => ({ name: r.name.slice(0, 60), amount: Number(r.amount) || 0, count: Number(r.count) || 1, unit: typeof r.unit === 'string' ? r.unit.slice(0, 30) : '', quantity: Number(r.quantity) || 0, at: Number(r.at) || 0 }))

export async function getDonors() {
  const json = await fetchJson(TRAKTEER.donorsApi, { retries: 0, timeout: 10000 })
  if (!json || json.ok !== true) throw new Error('Respons papan donatur tidak valid')
  return {
    latest: clean(json.latest),
    top: { daily: clean(json.top && json.top.daily), weekly: clean(json.top && json.top.weekly), monthly: clean(json.top && json.top.monthly), all: clean(json.top && json.top.all) },
    totals: { amount: Number(json.totals && json.totals.amount) || 0, count: Number(json.totals && json.totals.count) || 0 },
    updatedAt: Number(json.updatedAt) || Date.now()
  }
}
