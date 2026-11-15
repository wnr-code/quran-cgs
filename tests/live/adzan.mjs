// Penjajakan: sumber audio adzan/tarhim mana yang benar-benar tersedia (status, tipe, ukuran, Range, CORS).
const get = (url, init = {}) => fetch(url, { ...init, redirect: 'follow', signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'Mozilla/5.0 QuranKu-live-test', ...(init.headers || {}) } })
const out = []
async function probe(url) {
  try {
    let res = await get(url, { headers: { Range: 'bytes=0-1', Origin: 'https://quran.cgs.my.id' } })
    const range = res.headers.get('content-range')
    out.push(`${res.status} ${url.replace('https://', '')} type=${res.headers.get('content-type')} len=${range ? range.split('/')[1] : res.headers.get('content-length')} cors=${res.headers.get('access-control-allow-origin') || '-'} final=${res.url === url ? '=' : res.url}`)
  } catch (e) {
    out.push(`ERR ${url} ${e.message}`)
  }
}
const urls = []
for (let i = 1; i <= 14; i++) urls.push(`https://cdn.aladhan.com/audio/adhans/a${i}.mp3`)
for (const n of ['a1', 'a2', 'a4', 'a7', 'a9', 'a11-mishary-rashid-alafasy']) urls.push(`https://cdn.islamic.network/adhans/${n}.mp3`)
for (let i = 1; i <= 6; i++) urls.push(`https://www.islamcan.com/audio/adhan/azan${i}.mp3`)
urls.push('https://download.quranicaudio.com/quran/adhan/adhan_makkah.mp3', 'https://server8.mp3quran.net/afs/Rewayat-Hafs-A-n-Assem/adhan.mp3')
await Promise.all(urls.map(probe))
for (const q of ['tarhim', 'tarhim hussary', 'الترحيم الحصري', 'adzan subuh']) {
  try {
    const r = await get(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}+AND+mediatype%3Aaudio&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=licenseurl&fl%5B%5D=downloads&sort%5B%5D=downloads+desc&rows=8&output=json`)
    const j = await r.json()
    out.push(`IA "${q}": ` + j.response.docs.map((d) => `${d.identifier} [${String(d.title).slice(0, 40)}] dl=${d.downloads} lic=${d.licenseurl || '-'}`).join(' ; '))
  } catch (e) {
    out.push(`IA "${q}" ERR ${e.message}`)
  }
}
try {
  const r = await get('https://aladhan.com/play')
  const t = await r.text()
  out.push('aladhan/play: ' + [...new Set([...t.matchAll(/https?:\/\/[^"' ]+\.mp3/g)].map((m) => m[0]))].slice(0, 30).join(' '))
  out.push('aladhan/play names: ' + [...t.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]{3,60})</g)].slice(0, 30).map((m) => m[1] + '=' + m[2].trim()).join(' | '))
} catch (e) {
  out.push('aladhan/play ERR ' + e.message)
}
// Anotasi dibatasi per langkah → gabungkan menjadi beberapa baris panjang.
for (let i = 0; i < out.length; i += 9) console.log('::notice::' + out.slice(i, i + 9).join('%0A'))
