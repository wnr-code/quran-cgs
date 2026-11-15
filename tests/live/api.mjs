// Uji KONTRAK terhadap API SUNGGUHAN (butuh internet): memakai modul adapter & validasi yang sama dengan aplikasi.
// Jalankan: node tests/live/api.mjs   (di CI: workflow "Live API test")
import { createEquran } from '../../src/api/equran.js'
import { alquranCloud, stripBasmalah } from '../../src/api/alqurancloud.js'
import { validateSurahList, validateSurahDetail, validateTafsir } from '../../src/utils/validation.js'
import { API, QARI_AYAH as QARI } from '../../src/config.js'

const out = []
let failed = 0
const gh = !!process.env.GITHUB_ACTIONS
const log = (ok, name, info = '') => {
  if (!ok) failed++
  const line = `${ok ? '✓' : '✗'} ${name}${info ? ' — ' + info : ''}`
  out.push(line)
  console.log(line)
  if (gh) console.log(`::${ok ? 'notice' : 'error'}::${line.replace(/\n/g, ' ')}`)
}
const step = async (name, fn) => {
  try {
    log(true, name, (await fn()) || '')
  } catch (e) {
    log(false, name, String(e && e.message ? e.message : e).slice(0, 300))
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m)
}
const head = async (url, origin = 'https://quran.cgs.my.id') => {
  const r = await fetch(url, { headers: { Range: 'bytes=0-1023', Origin: origin }, signal: AbortSignal.timeout(20000) })
  await r.arrayBuffer()
  return { status: r.status, type: r.headers.get('content-type'), cors: r.headers.get('access-control-allow-origin'), ranges: r.headers.get('accept-ranges') || r.headers.get('content-range') }
}

const eq = createEquran(API.equran)
let s2

await step('EQuran: daftar 114 surah lolos validasi', async () => {
  const list = await eq.list()
  assert(validateSurahList(list), 'validasi daftar gagal')
  return `audioFull qari: ${Object.keys(list[0].audioFull).join(',')}`
})
await step('EQuran: header CORS untuk peramban', async () => {
  const r = await head(`${API.equran}/surat/1`)
  assert(r.status === 200 || r.status === 206, 'status ' + r.status)
  assert(r.cors === '*' || r.cors === 'https://quran.cgs.my.id', 'access-control-allow-origin = ' + r.cors + ' (aplikasi akan memakai proxy /api/quran)')
  return 'ACAO=' + r.cors
})
await step('EQuran: SEMUA 114 surah lolos validasi, total 6236 ayat', async () => {
  let total = 0
  const bad = []
  const queue = Array.from({ length: 114 }, (_, i) => i + 1)
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let n; (n = queue.shift()); ) {
        try {
          const d = await eq.surah(n)
          if (!validateSurahDetail(d, n)) bad.push(n)
          else total += d.ayat.length
          if (n === 2) s2 = d
        } catch (e) {
          bad.push(`${n}(${e.message})`)
        }
      }
    })
  )
  assert(!bad.length, 'gagal: ' + bad.join(', '))
  assert(total === 6236, 'total ' + total)
})
await step('EQuran: basmalah tidak menempel di ayat 1', async () => {
  const a = s2.ayat[0].teksArab
  assert(stripBasmalah(a, 2, 1) === a, '2:1 diawali basmalah: ' + a.slice(0, 60))
  const t9 = (await eq.surah(9)).ayat[0].teksArab
  return `2:1="${a}" · 9:1="${t9.slice(0, 24)}…"`
})
await step('EQuran: audio per ayat tersedia untuk 6 qari', async () => {
  const keys = Object.keys(s2.ayat[0].audio)
  const missing = Object.keys(QARI).filter((k) => !keys.includes(k))
  assert(!missing.length, 'qari tanpa audio: ' + missing.join(',') + ' (ada: ' + keys.join(',') + ')')
  return keys.join(',')
})
await step('EQuran: berkas audio ayat dapat diputar (Range) & CORS untuk unduhan offline', async () => {
  const r = await head(s2.ayat[0].audio['05'])
  assert(r.status === 200 || r.status === 206, 'status ' + r.status)
  assert(/audio|octet/.test(r.type || ''), 'content-type ' + r.type)
  return `status=${r.status} type=${r.type} ACAO=${r.cors} range=${r.ranges}`
})
await step('EQuran: berkas audio surah penuh', async () => {
  const r = await head(s2.audioFull['05'])
  assert(r.status === 200 || r.status === 206, 'status ' + r.status)
  return `status=${r.status} type=${r.type} ACAO=${r.cors} range=${r.ranges}`
})
await step('EQuran: tafsir (surah 1, 2, 114)', async () => {
  for (const n of [1, 2, 114]) assert(validateTafsir(await eq.tafsir(n), n), 'tafsir ' + n + ' tidak valid')
})
await step('Al Quran Cloud: daftar & surah 2, 9, 114 lolos validasi', async () => {
  assert(validateSurahList(await alquranCloud.list()), 'daftar tidak valid')
  for (const n of [2, 9, 114]) assert(validateSurahDetail(await alquranCloud.surah(n), n), 'surah ' + n + ' tidak valid')
  const a = (await alquranCloud.surah(2)).ayat[0].teksArab
  assert(a.length < 14, 'basmalah tidak terpisah: ' + a)
})
await step('Al Quran Cloud: tafsir & CORS & audio', async () => {
  assert(validateTafsir(await alquranCloud.tafsir(1), 1), 'tafsir tidak valid')
  const r = await head(`${API.alquranCloud}/surah/1`)
  const au = await head((await alquranCloud.surah(1)).ayat[0].audio['05'])
  assert(au.status === 200 || au.status === 206, 'audio status ' + au.status)
  return `API ACAO=${r.cors}; audio status=${au.status} ACAO=${au.cors}`
})

console.log(`\n${out.length - failed}/${out.length} lulus`)
process.exit(failed ? 1 : 0)
