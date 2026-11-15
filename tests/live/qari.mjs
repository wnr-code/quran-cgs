// Memeriksa qari tambahan (src/data/qari-extra.js) terhadap layanan ASLI mp3quran.net:
//  a) API resmi mp3quran: alamat dasar terdaftar, riwayat Hafs, 114 surah;
//  b) berkas audio 001, 002, 114 terjangkau, bertipe audio, dan ukurannya masuk akal
//     (Al-Baqarah jauh lebih besar daripada Al-Fatihah & An-Nas → penomoran berkas = nomor surah).
import { QARI_EXTRA } from '../../src/data/qari-extra.js'

const note = (ok, msg) => console.log(`::${ok ? 'notice' : 'error'}::${ok ? '✓' : '✗'} ${msg}`)
let failed = 0
const fail = (msg) => {
  failed++
  note(false, msg)
}
const get = (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'Mozilla/5.0 QuranKu-live-test', ...(init.headers || {}) } })

let moshafs = null
try {
  const res = await get('https://www.mp3quran.net/api/v3/reciters?language=eng')
  const j = await res.json()
  moshafs = []
  for (const r of j.reciters || []) for (const m of r.moshaf || []) moshafs.push({ reciter: r.name, name: String(m.name || ''), server: String(m.server || '').replace(/\/+$/, ''), total: Number(m.surah_total) })
  note(moshafs.length > 100, `API mp3quran: ${(j.reciters || []).length} qari, ${moshafs.length} mushaf`)
  if (!moshafs.length) moshafs = null
} catch (e) {
  fail('API mp3quran tidak dapat dibaca: ' + e.message)
}

async function size(url) {
  let res = await get(url, { method: 'HEAD' })
  if (!res.ok) res = await get(url, { headers: { Range: 'bytes=0-1' } })
  const range = res.headers.get('content-range')
  const len = range ? Number(range.split('/')[1]) : Number(res.headers.get('content-length'))
  return { status: res.status, type: res.headers.get('content-type') || '', len, ranges: res.headers.get('accept-ranges') || (range ? 'bytes' : ''), cors: res.headers.get('access-control-allow-origin') || '' }
}

// API resmi kini mencantumkan alamat baru (cdn.mp3quran.net/audio/<qari>/<riwayat>), sedangkan data kita memakai
// alamat lama (serverN.mp3quran.net/<folder>). Untuk memastikan identitas tanpa menebak dari nama, berkas dicocokkan
// lewat UKURAN: mushaf di API yang berkas 001 DAN 114-nya berukuran sama persis dengan milik kita adalah rekaman yang sama.
const apiSizes = new Map()
async function apiSize(m, n) {
  const k = m.server + n
  if (!apiSizes.has(k)) apiSizes.set(k, size(`${m.server}/${n}.mp3`).then((s) => (s.status === 200 || s.status === 206 ? s.len : 0)).catch(() => 0))
  return apiSizes.get(k)
}
if (moshafs) {
  const pool = moshafs.filter((m) => /^https:\/\/[a-z0-9.-]*mp3quran\.net\//.test(m.server))
  for (let i = 0; i < pool.length; i += 12) await Promise.all(pool.slice(i, i + 12).map((m) => apiSize(m, '001')))
}
const summary = []
const moved = []
const lines = []

for (const q of QARI_EXTRA) {
  const problems = []
  let api = 'tidak diperiksa'
  if (moshafs) {
    // Cocokkan persis; bila host server di API berbeda (pindah server), cocokkan folder qarinya.
    const path = (u) => u.replace(/^https?:\/\/[^/]+/, '').toLowerCase()
    let m = moshafs.find((x) => x.server === q.base) || moshafs.find((x) => path(x.server) === path(q.base))
    if (!m) {
      const [mine1, mine114] = await Promise.all([size(`${q.base}/001.mp3`), size(`${q.base}/114.mp3`)]).catch(() => [{}, {}])
      const cands = []
      for (const x of moshafs) if (mine1.len > 0 && (await apiSize(x, '001')) === mine1.len) cands.push(x)
      const same = []
      for (const x of cands) if ((await apiSize(x, '114')) === mine114.len) same.push(x)
      if (same.length === 1) m = same[0]
      else if (same.length > 1) problems.push('cocok dengan lebih dari satu mushaf: ' + same.map((x) => x.server).join(', '))
    }
    if (m && m.server !== q.base) moved.push(`${q.id.slice(2)}=${m.server.replace('https://cdn.mp3quran.net/audio/', '')}`)
    if (!m) problems.push(problems.length ? 'tidak dapat dipastikan' : 'tidak ditemukan di API mp3quran (alamat maupun ukuran berkas)')
    else {
      api = `${m.reciter} — ${m.name} (${m.total})`
      if (!/hafs/i.test(m.name)) problems.push('riwayat bukan Hafs: ' + m.name)
      if (m.total !== 114) problems.push('jumlah surah di API: ' + m.total)
      if (/mojawwad|mujawwad/i.test(m.name) !== (q.style === 'mujawwad')) problems.push('jenis bacaan berbeda: ' + m.name)
    }
  }
  let sizes = ''
  try {
    const [a, b, c] = await Promise.all(['001', '002', '114'].map((n) => size(`${q.base}/${n}.mp3`)))
    for (const [n, s] of [['001', a], ['002', b], ['114', c]]) {
      if (s.status !== 200 && s.status !== 206) problems.push(`${n}: HTTP ${s.status}`)
      else if (!/audio|mpeg|octet-stream/i.test(s.type)) problems.push(`${n}: tipe ${s.type}`)
      else if (!(s.len > 50000)) problems.push(`${n}: ukuran ${s.len}`)
    }
    if (!problems.length && !(b.len > a.len * 15 && b.len > c.len * 15)) problems.push(`ukuran tidak wajar 001=${a.len} 002=${b.len} 114=${c.len}`)
    sizes = `001=${(a.len / 1e6).toFixed(1)}MB 002=${(b.len / 1e6).toFixed(1)}MB 114=${(c.len / 1e6).toFixed(2)}MB ranges=${b.ranges || '-'} cors=${b.cors || '-'}`
  } catch (e) {
    problems.push('audio tidak terjangkau: ' + e.message)
  }
  summary.push({ id: q.id, ok: !problems.length })
  lines.push(`${problems.length ? '✗' : '✓'} ${q.id.slice(2)} = ${api}${problems.length ? ' !! ' + problems.join('; ') : ''}`)
  if (problems.length) failed++
  console.log(`${problems.length ? '✗' : '✓'} ${q.name}: ${problems.join('; ')} | API: ${api} | ${sizes}`)
}
// GitHub membatasi jumlah anotasi per langkah, jadi rincian diringkas dalam beberapa baris saja.
for (let i = 0; i < lines.length; i += 7) note(true, 'Rincian: ' + lines.slice(i, i + 7).join(' || '))
if (moved.length) note(true, 'Host berbeda di API: ' + moved.join(' || '))
note(!failed, `Qari tambahan lolos: ${summary.filter((s) => s.ok).length}/${summary.length}`)
process.exit(failed ? 1 : 0)
