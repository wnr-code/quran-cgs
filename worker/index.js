// Entry Cloudflare Workers: menyajikan aplikasi statis (dist/) dan merutekan /api/* ke handler di functions/.
// Handler yang sama juga tetap bisa dipakai sebagai Pages Functions.
import { onRequestGet as quranGet } from '../functions/api/quran/[[path]].js'
import { onRequestGet as donorsGet } from '../functions/api/donors.js'
import { onRequestPost as webhookPost, onRequestGet as webhookGet } from '../functions/api/trakteer-webhook.js'

const json = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })

export default {
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
        return json({ ok: false, error: 'not_found' }, 404)
      }
    } catch (e) {
      return json({ ok: false, error: 'server_error' }, 500)
    }
    return env.ASSETS.fetch(request)
  }
}
