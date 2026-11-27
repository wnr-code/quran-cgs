// Versi QuranKu yang benar-benar ada di Play Store.
//
// Notifikasi "pembaruan tersedia" harus menyebut versi yang bisa dipasang pengguna. Versi build
// web (package.json) biasanya lebih baru daripada rilis Play karena AAB harus diunggah dulu,
// jadi angka dari halaman Play-lah yang dipakai untuk pengguna APK. Halaman Play tidak punya
// API publik, jadi HTML-nya dibaca di sini (bukan di perangkat: CORS + kuota) dan hasilnya
// di-cache 6 jam. Bila Google mengubah markup, endpoint menjawab `ok:false` dan aplikasi
// menyembunyikan baris versi Play tanpa mengganggu apa pun.

const PLAY_ID = 'id.cgs.quranku'
const STORE_PAGE = `https://play.google.com/store/apps/details?id=${PLAY_ID}&hl=id&gl=ID`
const CACHE_KEY = 'https://quran.cgs.my.id/__cache/play-version-v1'
const OK_TTL = 6 * 60 * 60
const FAIL_TTL = 15 * 60
const VERSION_RE = '(\\d{1,4}(?:\\.\\d{1,4}){1,3})'

// Urutan pola: yang paling stabil di halaman Play lebih dulu.
const PATTERNS = [
  new RegExp(`\\[\\[\\[\\s*"${VERSION_RE}"\\s*\\]\\]\\]`), // blob AF_initDataCallback (ds:5)
  new RegExp(`"softwareVersion"\\s*:\\s*"${VERSION_RE}"`),
  new RegExp(`itemprop="softwareVersion"[^>]*content="${VERSION_RE}"`)
]

/** Ambil nomor versi dari HTML halaman Play Store. `null` bila tidak dikenali. */
export function parsePlayVersion(html) {
  if (typeof html !== 'string' || !html) return null
  for (const re of PATTERNS) {
    const match = re.exec(html)
    if (match) return match[1]
  }
  return null
}

const json = (body, ttl) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${ttl}`
    }
  })

export async function onRequestGet() {
  const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null
  const key = cache ? new Request(CACHE_KEY) : null
  if (cache) {
    const hit = await cache.match(key).catch(() => null)
    if (hit) return hit
  }
  let version = null
  try {
    const res = await fetch(STORE_PAGE, {
      headers: { 'Accept-Language': 'id-ID,id;q=0.9,en;q=0.5', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36' },
      cf: { cacheTtl: 1800, cacheEverything: true }
    })
    if (res.ok) version = parsePlayVersion(await res.text())
  } catch {}
  const body = version
    ? { ok: true, version, playUrl: `https://play.google.com/store/apps/details?id=${PLAY_ID}`, checkedAt: new Date().toISOString() }
    : { ok: false, version: null, playUrl: `https://play.google.com/store/apps/details?id=${PLAY_ID}`, checkedAt: new Date().toISOString() }
  const out = json(body, version ? OK_TTL : FAIL_TTL)
  if (cache) await cache.put(key, out.clone()).catch(() => {})
  return out
}
