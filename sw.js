/* QuranKu Service Worker.
 * Berkas ini adalah templat: saat `npm run build`, plugin di vite.config.js mengisi
 * versi dan daftar precache di bawah ini lalu menuliskannya ke dist/sw.js. */
const VERSION = '__SW_VERSION__'
const PRECACHE = __PRECACHE_LIST__
const SHELL = `quranku-shell-${VERSION}`
// v2: cache lama menyimpan manifest & ikon versi lama selamanya (penyebab ikon PWA tidak ikut berganti).
const RUNTIME = 'quranku-runtime-v2'
const AUDIO = 'quranku-audio-v1'
const KEEP = new Set([SHELL, RUNTIME, AUDIO])
// Alamat yang menyajikan aplikasi yang sama (utama & cadangan). Bila alamat ini mati, berkas diambil dari yang lain.
const MIRRORS = ['https://quran.cgs.my.id', 'https://quran-cgs.appwnr.workers.dev']
const OTHERS = MIRRORS.includes(self.location.origin) ? MIRRORS.filter((m) => m !== self.location.origin) : []
const DEAD = new Set([520, 521, 522, 523, 524, 525, 526, 530])

/** Ambil dari jaringan; bila alamat ini mati, coba alamat lain (respons disalin agar bisa dipakai di origin ini). */
async function fetchWithMirror(request) {
  let res, err
  try {
    res = await fetch(request)
    if (!DEAD.has(res.status)) return res
  } catch (e) {
    err = e
  }
  if (navigator.onLine !== false && request.method === 'GET') {
    const u = new URL(request.url)
    for (const m of OTHERS) {
      try {
        const alt = await fetch(m + u.pathname + u.search, { mode: 'cors', credentials: 'omit', cache: 'no-cache' })
        if (alt.ok) {
          const headers = new Headers(alt.headers)
          return new Response(await alt.blob(), { status: alt.status, statusText: alt.statusText, headers })
        }
      } catch {}
    }
  }
  if (res) return res
  throw err
}

/**
 * Hosting (Cloudflare) mengalihkan /index.html → / dan /x.html → /x. Respons hasil pengalihan TIDAK boleh
 * dipakai untuk menjawab navigasi (peramban menolaknya → halaman kosong), jadi disalin menjadi respons bersih.
 */
async function unredirect(res) {
  if (!res.redirected) return res
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers })
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then(async (cache) => {
      // Satu berkas gagal tidak boleh menggagalkan seluruh instalasi.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(new Request(url, { cache: 'reload' }))
            if (res.ok) await cache.put(url, await unredirect(res))
          } catch {}
        })
      )
      // Langsung aktif tanpa menunggu semua tab ditutup, supaya pembaruan tidak tertahan di versi lama.
      await self.skipWaiting()
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!KEEP.has(key) && key.startsWith('quranku-')) await caches.delete(key)
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})

async function shellFirst(request) {
  const cached = (await caches.match('/index.html', { cacheName: SHELL })) || (await caches.match('/', { cacheName: SHELL }))
  if (cached) return unredirect(cached)
  try {
    return await fetchWithMirror(request)
  } catch {
    return (await caches.match('/offline.html')) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}

/** Manifest & berkas kecil yang harus selalu terbaru: jaringan dulu, cache hanya saat offline. */
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME)
  try {
    const res = await fetch(new Request(request.url, { cache: 'no-cache' }))
    if (res.ok) cache.put(request.url, res.clone())
    return res
  } catch {
    return (await cache.match(request.url)) || Response.error()
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: false })
  if (cached) return unredirect(cached)
  try {
    const res = await fetchWithMirror(request)
    if (res.ok && (res.type === 'basic' || res.type === 'default')) {
      const cache = await caches.open(RUNTIME)
      cache.put(request, await unredirect(res.clone()))
    }
    return res
  } catch (e) {
    if (request.mode === 'navigate') return (await caches.match('/offline.html')) || Response.error()
    return Response.error()
  }
}

/** Audio yang sudah diunduh manual: layani dari cache, dukung permintaan Range. */
async function audioFromCache(request) {
  const cache = await caches.open(AUDIO)
  const cached = await cache.match(request.url)
  if (!cached) return fetch(request)
  const range = request.headers.get('range')
  if (!range || cached.type === 'opaque') return cached
  const m = /bytes=(\d*)-(\d*)/.exec(range)
  if (!m) return cached
  const buf = await cached.arrayBuffer()
  const size = buf.byteLength
  let start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1])
  let end = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  })
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/data/') || url.pathname === '/sw.js' || url.pathname === '/version.json') return // selalu jaringan (data disimpan aplikasi di IndexedDB)
    if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
      event.respondWith(shellFirst(request))
      return
    }
    if (url.pathname === '/manifest.webmanifest' || url.pathname.startsWith('/.well-known/')) {
      event.respondWith(networkFirst(request))
      return
    }
    event.respondWith(cacheFirst(request))
    return
  }

  // Lintas-origin: hanya audio yang ditangani (dari unduhan manual). Data API dikelola IndexedDB di aplikasi.
  if (request.destination === 'audio' || /\.(mp3|m4a|ogg|opus)(\?|$)/i.test(url.pathname)) {
    event.respondWith(audioFromCache(request).catch(() => Response.error()))
  }
})

// Push dari server (adzan, imsak, tarhim). Bila aplikasi sedang terbuka, halaman diberi tahu agar memutar adzan.
self.addEventListener('push', (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch {}
  const key = String(d.key || 'info')
  const isPrayer = ['subuh', 'zuhur', 'asar', 'magrib', 'isya'].includes(key)
  const title = d.title || 'QuranKu'
  const body = d.body || ''
  const at = Number(d.at) || Date.now()
  const route = isPrayer ? '/salat' : '/notifikasi'
  const inboxItem = { id: `push:${key}:${at}`, type: 'reminder', title, body, route, at }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        tag: 'salat-' + key,
        renotify: true,
        requireInteraction: isPrayer,
        icon: '/icons/icon-192-v2.png',
        badge: '/icons/badge-96-v2.png',
        lang: 'id',
        vibrate: [300, 150, 300, 150, 600],
        timestamp: at,
        data: { url: '/#' + route, route, key, play: isPrayer, at, inboxId: inboxItem.id, inboxItem }
      })
      for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
        c.postMessage({ type: 'quranku:inbox-notification', item: inboxItem })
        if (d.type === 'adzan') c.postMessage({ type: 'adzan', key, at: d.at })
      }
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const isSalat = event.notification.tag && event.notification.tag.startsWith('salat')
  const route = typeof data.route === 'string' && data.route.startsWith('/') && !data.route.startsWith('//')
    ? data.route
    : isSalat ? '/salat' : '/notifikasi'
  const inboxItem = data.inboxItem || (data.inboxId ? { id: data.inboxId, title: event.notification.title, body: event.notification.body, route, at: data.at || event.notification.timestamp } : null)
  const routeQuery = new URLSearchParams(route.includes('?') ? route.slice(route.indexOf('?') + 1) : '')
  if (data.inboxId && inboxItem) routeQuery.set('inboxOpen', JSON.stringify({ inboxId: data.inboxId, item: inboxItem }))
  const routePath = route.split('?')[0]
  const serializedRouteQuery = routeQuery.toString()
  const routeWithQuery = `${routePath}${serializedRouteQuery ? `?${serializedRouteQuery}` : ''}`
  const target = isSalat
    ? (data.play ? `/?adzan=${encodeURIComponent(data.key || '')}#${routeWithQuery}` : `/#${routeWithQuery}`)
    : `/#${routeWithQuery}`
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of all) {
        if (!('focus' in c)) continue
        if ('navigate' in c) {
          try {
            await c.navigate(target)
            await c.focus()
            return c
          } catch {}
        }
        if (data.inboxId) c.postMessage({ type: 'quranku:notification-opened', inboxId: data.inboxId, item: inboxItem, route })
        // Ketukan pemberitahuan adalah interaksi pengguna → halaman boleh memutar adzan.
        if (data.play) c.postMessage({ type: 'adzan', key: data.key, play: true })
        await c.focus()
        return c
      }
      if (self.clients.openWindow) {
        const client = await self.clients.openWindow(target)
        if (client && data.inboxId) client.postMessage({ type: 'quranku:notification-opened', inboxId: data.inboxId, item: inboxItem, route })
        if (client && data.play) client.postMessage({ type: 'adzan', key: data.key, play: true })
        return client
      }
    })()
  )
})
