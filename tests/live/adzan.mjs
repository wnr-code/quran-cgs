// Memeriksa rekaman adzan yang dipakai aplikasi terhadap layanan ASLI (cdn.aladhan.com):
// berkas terjangkau, bertipe audio, mendukung Range, berukuran wajar, dan memang tercantum di halaman resmi aladhan.com/play.
import { ADZAN_VOICES, adzanUrl } from '../../src/services/adzan-voices.js'

const get = (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'Mozilla/5.0 QuranKu-live-test', ...(init.headers || {}) } })
let failed = 0
const lines = []
let listed = ''
try {
  listed = await (await get('https://aladhan.com/play')).text()
} catch (e) {
  lines.push('! halaman aladhan.com/play tidak terbaca: ' + e.message)
}
for (const [id, name] of Object.entries(ADZAN_VOICES)) {
  const url = adzanUrl(id)
  try {
    const res = await get(url, { headers: { Range: 'bytes=0-1' } })
    const range = res.headers.get('content-range') || ''
    const len = Number(range.split('/')[1])
    const ok = res.status === 206 && /audio/.test(res.headers.get('content-type') || '') && len > 500000 && len < 12000000
    const official = listed ? listed.includes(url) : null
    if (!ok || official === false) failed++
    lines.push(`${ok && official !== false ? '✓' : '✗'} ${id} ${name}: ${res.status} ${res.headers.get('content-type')} ${(len / 1048576).toFixed(1)} MB${official === null ? '' : official ? ' · tercantum di aladhan.com/play' : ' · TIDAK tercantum'}`)
  } catch (e) {
    failed++
    lines.push(`✗ ${id} ${name}: ${e.message}`)
  }
}
console.log(`::${failed ? 'error' : 'notice'}::${lines.join('%0A')}`)
if (failed) process.exit(1)
