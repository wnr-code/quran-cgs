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
try {
  const t = await (await get('https://aladhan.com/play')).text()
  for (const m of t.matchAll(/https?:\/\/[^"' ]+\.mp3/g)) out.push('CTX ' + t.slice(Math.max(0, m.index - 260), m.index + m[0].length + 200).replace(/\s+/g, ' '))
} catch (e) {
  out.push('aladhan/play ERR ' + e.message)
}
for (const id of ['ShalawatTarhim', 't1_20210307', 'sholawat-tarhim']) {
  try {
    const j = await (await get('https://archive.org/metadata/' + id)).json()
    out.push(`IA ${id}: uploader=${j.metadata.uploader} date=${j.metadata.publicdate} lic=${j.metadata.licenseurl || '-'} desc=${String(j.metadata.description || '').slice(0, 120)} server=${j.d1} dir=${j.dir} files=` + j.files.filter((f) => /mp3|ogg/i.test(f.name)).map((f) => `${f.name}(${f.length}s,${f.size}b,${f.source})`).join(', '))
  } catch (e) {
    out.push(`IA ${id} ERR ${e.message}`)
  }
}
for (const u of ['https://archive.org/download/ShalawatTarhim/ShalawatTarhim.mp3']) {
  const res = await get(u, { headers: { Range: 'bytes=0-1', Origin: 'https://quran.cgs.my.id' } }).catch((e) => ({ status: 'ERR ' + e.message, headers: new Headers(), url: '' }))
  out.push(`${res.status} ${u} type=${res.headers.get('content-type')} range=${res.headers.get('content-range')} cors=${res.headers.get('access-control-allow-origin')} final=${res.url}`)
}
// Anotasi dibatasi per langkah → gabungkan menjadi beberapa baris panjang.
for (let i = 0; i < out.length; i += 4) console.log('::notice::' + out.slice(i, i + 4).join('%0A'))
