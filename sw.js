/* QuranKu Service Worker.
 * Berkas ini adalah templat: saat `npm run build`, plugin di vite.config.js mengisi
 * versi dan daftar precache di bawah ini lalu menuliskannya ke dist/sw.js. */
const VERSION = '__SW_VERSION__'
const PRECACHE = __PRECACHE_LIST__
const SHELL = `quranku-shell-${VERSION}`
const RUNTIME = 'quranku-runtime-v1'
const AUDIO = 'quranku-audio-v1'
const KEEP = new Set([SHELL, RUNTIME, AUDIO])

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
    return await fetch(request)
  } catch {
    return (await caches.match('/offline.html')) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: false })
  if (cached) return unredirect(cached)
  try {
    const res = await fetch(request)
    if (res.ok && res.type === 'basic') {
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
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/data/') || url.pathname === '/sw.js') return // selalu jaringan (data disimpan aplikasi di IndexedDB)
    if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
      event.respondWith(shellFirst(request))
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.tag && event.notification.tag.startsWith('salat') ? '/#/salat' : '/#/'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of all) if ('focus' in c) return c.focus()
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })()
  )
})
