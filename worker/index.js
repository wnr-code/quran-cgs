// Entry Cloudflare Workers: menyajikan aplikasi statis (dist/) dan merutekan /api/* ke handler di functions/.
// Handler yang sama juga tetap bisa dipakai sebagai Pages Functions.
import { onRequestGet as quranGet } from '../functions/api/quran/[[path]].js'
import { onRequestGet as donorsGet } from '../functions/api/donors.js'
import { onConfig, onCreate, onStatus, onClaim, onDiag } from '../functions/api/infaq.js'
import { syncSupports } from '../functions/lib/provider.js'
import { ensureSchema } from '../functions/lib/db.js'
import { onKey, onSubscribe, onUnsubscribe } from '../functions/api/push.js'
import { pushDue } from '../functions/lib/adzan.js'
import { onRequestPost as webhookPost, onRequestGet as webhookGet } from '../functions/api/trakteer-webhook.js'

const json = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })

const app = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const p = url.pathname.replace(/\/+$/, '')
    const m = request.method
    const base = { request, env, waitUntil: (pr) => ctx.waitUntil(pr) }
    try {
      if (p.startsWith('/api/')) {
        if (p.startsWith('/api/quran/')) {
          if (m !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405)
          return await quranGet({ ...base, params: { path: p.slice('/api/quran/'.length).split('/') } })
        }
        if (p === '/api/donors') {
          if (m !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405)
          return await donorsGet({ ...base, params: {} })
        }
        if (p === '/api/trakteer-webhook') {
          if (m === 'POST') return await webhookPost({ ...base, params: {} })
          if (m === 'GET') return await webhookGet({ ...base, params: {} })
          return json({ ok: false, error: 'method_not_allowed' }, 405)
        }
        const infaq = { 'GET /api/infaq/config': onConfig, 'POST /api/infaq/create': onCreate, 'GET /api/infaq/status': onStatus, 'POST /api/infaq/claim': onClaim, 'GET /api/infaq/diag': onDiag }[`${m} ${p}`]
        if (infaq) return await infaq({ ...base, params: {} })
        const push = { 'GET /api/push/key': onKey, 'POST /api/push/subscribe': onSubscribe, 'POST /api/push/unsubscribe': onUnsubscribe }[`${m} ${p}`]
        if (push) return await push({ ...base, params: {} })
        return json({ ok: false, error: 'not_found' }, 404)
      }
    } catch (e) {
      return json({ ok: false, error: 'server_error' }, 500)
    }
    return env.ASSETS.fetch(request)
  },

  // Cron tiap menit: (1) push adzan/imsak/tarhim yang jatuh tempo; (2) tiap 15 menit menarik riwayat dukungan
  // dari Public API agar donasi yang webhook-nya terlewat tetap tercatat.
  async scheduled(event, env, ctx) {
    if (!env.DB) return
    ctx.waitUntil(
      ensureSchema(env.DB).then(async () => {
        await pushDue(env, new Date(event.scheduledTime || Date.now())).catch(() => {})
        if (env.TRAKTEER_API_KEY && new Date(event.scheduledTime || Date.now()).getUTCMinutes() % 15 === 0) await syncSupports(env, { minInterval: 60000 })
      })
    )
  }
}

// Situs utama/cadangan serta Capacitor's fixed https://localhost WebView origin may call the public app APIs.
const ALLOWED_ORIGINS = new Set(['https://quran.cgs.my.id', 'https://quran-cgs.appwnr.workers.dev', 'https://localhost'])
export const corsHeaders = (origin) =>
  ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : null

export default {
  async fetch(request, env, ctx) {
    const cors = new URL(request.url).pathname.startsWith('/api/') && corsHeaders(request.headers.get('Origin') || '')
    if (cors && request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const res = await app.fetch(request, env, ctx)
    if (!cors) return res
    const out = new Response(res.body, res)
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v)
    return out
  },
  scheduled: (event, env, ctx) => app.scheduled(event, env, ctx)
}
