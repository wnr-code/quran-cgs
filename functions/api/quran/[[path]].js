// Proxy opsional ke EQuran.id API v2 (dipakai klien hanya bila akses langsung gagal, mis. CORS).
// Hanya meneruskan GET ke path yang dikenal; hasil di-cache di edge Cloudflare.
const ALLOWED = /^(surat|surat\/\d{1,3}|tafsir\/\d{1,3})$/

export async function onRequestGet({ params, request, waitUntil }) {
  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '')
  if (!ALLOWED.test(path)) return json({ code: 400, message: 'Bad request' }, 400)
  const cache = caches.default
  const key = new Request(new URL(request.url).toString(), { method: 'GET' })
  const hit = await cache.match(key)
  if (hit) return hit
  let upstream
  try {
    upstream = await fetch(`https://equran.id/api/v2/${path}`, { headers: { Accept: 'application/json' }, cf: { cacheTtl: 86400, cacheEverything: true } })
  } catch {
    return json({ code: 502, message: 'Upstream unreachable' }, 502)
  }
  if (!upstream.ok) return json({ code: upstream.status, message: 'Upstream error' }, 502)
  const res = new Response(upstream.body, {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' }
  })
  waitUntil(cache.put(key, res.clone()))
  return res
}

const json = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
