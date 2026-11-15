import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toArabicIndic, toLatinDigits, ayahMarker, qnum, setNumeralMode, ayahRef } from '../src/utils/arabic-numbers.js'
import { juzOf, pageOf, isSajda, juzStart, pageStart, ayahId, fromAyahId, juzList, isPageEnd, TOTAL_PAGES } from '../src/utils/quran-meta.js'
import { validateSurahDetail, validateSurahList, isAyahNo, parseCoord, cleanText } from '../src/utils/validation.js'
import { qiblaBearing, distanceToKaaba } from '../src/services/qibla.js'
import { stripBasmalah } from '../src/api/alqurancloud.js'
import { mapDetail, mapSummary } from '../src/api/equran.js'
import { esc, stripHtml } from '../src/utils/helpers.js'
import { toHijri } from '../src/utils/hijri.js'
import { mapLocalDetail } from '../src/api/local-data.js'
import { SOURCES } from '../src/data/sources.js'
import { existsSync, readFileSync } from 'node:fs'
import { fakeD1 } from './helpers.mjs'
import { ensureSchema } from '../functions/lib/db.js'
import { periodStarts } from '../functions/api/donors.js'
import { parseDonation, onRequestPost } from '../functions/api/trakteer-webhook.js'
import { createRequire } from 'node:module'
const meta = createRequire(import.meta.url)('../src/data/quran-meta.json')

test('angka Arab-Indic', () => {
  assert.equal(toArabicIndic(1), '١')
  assert.equal(toArabicIndic(10), '١٠')
  assert.equal(toArabicIndic(30), '٣٠')
  assert.equal(toArabicIndic(114), '١١٤')
  assert.equal(toArabicIndic(286), '٢٨٦')
  assert.equal(toArabicIndic(1234567890), '١٢٣٤٥٦٧٨٩٠')
  assert.equal(toLatinDigits('٢٨٦'), '286')
  assert.equal(ayahMarker(3), '\uFD3F٣\uFD3E')
  assert.equal(ayahRef(2, 255), '2:255')
  setNumeralMode('latin')
  assert.equal(qnum(114), '114')
  assert.equal(ayahMarker(3), '3')
  setNumeralMode('arabic')
  assert.equal(qnum(114), '١١٤')
})

test('metadata: 114 surah, 6236 ayat, 30 juz, 604 halaman', () => {
  assert.equal(meta.ayahCounts.length, 114)
  assert.equal(meta.ayahCounts.reduce((a, b) => a + b), 6236)
  assert.equal(meta.ayahCounts[0], 7)
  assert.equal(meta.ayahCounts[1], 286)
  assert.equal(meta.ayahCounts[8], 129)
  assert.equal(meta.ayahCounts[113], 6)
  assert.equal(TOTAL_PAGES, 604)
  assert.equal(juzList().length, 30)
})

test('juz, halaman, sajdah', () => {
  assert.deepEqual(juzStart(1), [1, 1])
  assert.deepEqual(juzStart(2), [2, 142])
  assert.deepEqual(juzStart(3), [2, 253])
  assert.deepEqual(juzStart(30), [78, 1])
  assert.equal(juzOf(2, 141), 1)
  assert.equal(juzOf(2, 142), 2)
  assert.equal(juzOf(114, 6), 30)
  assert.equal(pageOf(1, 1), 1)
  assert.equal(pageOf(2, 1), 2)
  assert.equal(pageOf(2, 255), 42)
  assert.equal(pageOf(36, 1), 440)
  assert.equal(pageOf(114, 6), 604)
  assert.deepEqual(pageStart(604), [112, 1])
  assert.ok(isPageEnd(1, 7))
  assert.ok(isPageEnd(114, 6))
  assert.ok(isSajda(32, 15))
  assert.ok(isSajda(96, 19))
  assert.ok(!isSajda(2, 255))
  assert.deepEqual(fromAyahId(ayahId(9, 129)), [9, 129])
  assert.deepEqual(fromAyahId(6236), [114, 6])
})

const fakeSurah = (n, count = meta.ayahCounts[n - 1]) => ({
  nomor: n, nama: 'س', namaLatin: 'X', jumlahAyat: meta.ayahCounts[n - 1], tempatTurun: 'Mekah', arti: 'x', deskripsi: '',
  ayat: Array.from({ length: count }, (_, i) => ({ nomorAyat: i + 1, teksArab: 'ا', teksLatin: '', teksIndonesia: '' }))
})

test('validasi menolak data surah yang tidak lengkap/keliru', () => {
  assert.ok(validateSurahDetail(fakeSurah(1), 1))
  assert.ok(!validateSurahDetail(fakeSurah(1, 6), 1), 'jumlah ayat kurang')
  assert.ok(!validateSurahDetail(fakeSurah(2), 1), 'nomor surah tidak cocok')
  const empty = fakeSurah(1)
  empty.ayat[3].teksArab = '  '
  assert.ok(!validateSurahDetail(empty, 1), 'teks Arab kosong')
  const wrongOrder = fakeSurah(1)
  wrongOrder.ayat[2].nomorAyat = 5
  assert.ok(!validateSurahDetail(wrongOrder, 1))
  assert.ok(!validateSurahList([fakeSurah(1)]))
  assert.ok(validateSurahList(Array.from({ length: 114 }, (_, i) => fakeSurah(i + 1))))
  assert.ok(isAyahNo(2, 286))
  assert.ok(!isAyahNo(2, 287))
  assert.ok(!isAyahNo(115, 1))
})

test('pemetaan respons EQuran v2', () => {
  const d = mapDetail({ nomor: 1, nama: 'الفاتحة', namaLatin: 'Al-Fatihah', jumlahAyat: 7, tempatTurun: 'Mekah', arti: 'Pembukaan', deskripsi: 'Surat <i>Al Faatihah</i>', audioFull: { '05': 'https://x/1.mp3', bad: 'javascript:alert(1)' }, ayat: [{ nomorAyat: 1, teksArab: 'بِسْمِ', teksLatin: 'bismi', teksIndonesia: 'Dengan nama', audio: { '01': 'https://x/a.mp3' } }] })
  assert.equal(d.deskripsi, 'Surat Al Faatihah')
  assert.deepEqual(d.audioFull, { '05': 'https://x/1.mp3' })
  assert.equal(d.ayat[0].teksArab, 'بِسْمِ')
  assert.equal(d.source, 'equran')
  assert.equal(mapSummary({ nomor: '2', jumlahAyat: '286' }).jumlahAyat, 286)
})

test('basmalah pada edisi cadangan dipisahkan dengan benar', () => {
  const b = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
  assert.equal(stripBasmalah(`${b} الٓمٓ`, 2, 1), 'الٓمٓ')
  assert.equal(stripBasmalah(b, 1, 1), b, 'Al-Fatihah 1:1 tetap utuh')
  assert.equal(stripBasmalah('بَرَآءَةٌ مِّنَ ٱللَّهِ وَرَسُولِهِۦٓ إِلَى', 9, 1), 'بَرَآءَةٌ مِّنَ ٱللَّهِ وَرَسُولِهِۦٓ إِلَى', 'At-Taubah tidak disentuh')
  assert.equal(stripBasmalah(`${b} x`, 2, 2), `${b} x`, 'hanya ayat 1')
})

test('kiblat', () => {
  const b = qiblaBearing(-6.2088, 106.8456) // Jakarta
  assert.ok(b > 294.5 && b < 296, 'Jakarta ≈ 295°: ' + b)
  assert.ok(distanceToKaaba(21.4225, 39.8262) < 0.01)
  const d = distanceToKaaba(-6.2088, 106.8456)
  assert.ok(d > 7800 && d < 8100, 'jarak Jakarta–Makkah ≈ 7.9 rb km: ' + d)
})

test('sanitasi', () => {
  assert.equal(esc('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;')
  assert.equal(stripHtml('a<br>b <b>c</b>'), 'a\nb c')
  assert.equal(cleanText('  hi\u0000 '), 'hi')
  assert.deepEqual(parseCoord('-6,97', '108.48'), { lat: -6.97, lng: 108.48 })
  assert.equal(parseCoord('91', '0'), null)
})

test('hijriah (Umm al-Qura)', () => {
  const h = toHijri(new Date(2025, 2, 31)) // 1 Syawal 1446 (Umm al-Qura: 30 Mar 2025)
  assert.ok(h && h.year === 1446 && h.month === 10)
})

test('infaq: periode WIB & webhook Trakteer', async () => {
  const now = Date.UTC(2026, 10, 14, 18, 30) // Minggu 15 Nov 2026 01:30 WIB
  const p = periodStarts(now)
  assert.equal(p.daily, Date.UTC(2026, 10, 14, 17, 0))
  assert.equal(p.weekly, Date.UTC(2026, 10, 8, 17, 0)) // Senin 9 Nov 00:00 WIB
  assert.equal(p.monthly, Date.UTC(2026, 9, 31, 17, 0))
  const d = parseDonation({ transaction_id: 'abc', supporter_name: ' <b>Budi</b> ', unit: 'Kopi', quantity: 2, price: 10000, created_at: 'x' }, 1000)
  assert.deepEqual({ name: d.name, amount: d.amount, quantity: d.quantity, created_at: d.created_at }, { name: 'bBudi/b', amount: 10000, quantity: 2, created_at: 1000 })
  assert.equal(parseDonation({}), null)
  const env = { TRAKTEER_WEBHOOK_TOKEN: 'rahasia', DB: fakeD1() }
  await ensureSchema(env.DB)
  const rows = () => env.DB._db.prepare('SELECT * FROM donations').all()
  const req = (token, body) => new Request('https://x/api/trakteer-webhook', { method: 'POST', headers: { 'X-Webhook-Token': token }, body })
  assert.equal((await onRequestPost({ request: req('salah', '{}'), env })).status, 401)
  assert.equal((await onRequestPost({ request: req('rahasia', 'bukan json'), env })).status, 400)
  assert.equal((await onRequestPost({ request: req('rahasia', '{}'), env })).status, 400)
  assert.equal(rows().length, 0)
  const ok = await onRequestPost({ request: req('rahasia', JSON.stringify({ transaction_id: 't1', supporter_name: 'Aisyah', price: 25000, quantity: 5, unit: 'Kopi' })), env })
  assert.equal(ok.status, 200)
  assert.equal(rows()[0].name, 'Aisyah')
  assert.equal(rows()[0].amount, 25000)
  assert.equal(rows()[0].source, 'webhook')
  assert.equal((await onRequestPost({ request: req('rahasia', '{}'), env: {} })).status, 503)
})

test('data lokal (cadangan terakhir): 114 surah lolos validasi yang sama dengan API', { skip: !existsSync('public/data/surah/1.json') && 'jalankan npm run gen:local' }, () => {
  let total = 0
  for (let n = 1; n <= 114; n++) {
    const d = mapLocalDetail(JSON.parse(readFileSync(`public/data/surah/${n}.json`, 'utf8')))
    assert.ok(validateSurahDetail(d, n), 'surah ' + n)
    assert.equal(d.source, 'lokal')
    total += d.ayat.length
  }
  assert.equal(total, 6236)
  // Basmalah tidak menempel di ayat 1 (ditampilkan terpisah oleh reader)
  const baqarah = mapLocalDetail(JSON.parse(readFileSync('public/data/surah/2.json', 'utf8')))
  assert.ok(baqarah.ayat[0].teksArab.length < 12)
})

test('daftar sumber data lengkap & tautan aman', () => {
  const items = SOURCES.flatMap((g) => g.items)
  assert.ok(items.length >= 12)
  for (const s of items) {
    assert.ok(s.name && s.use)
    if (s.url) assert.match(s.url, /^https:\/\//)
  }
  for (const name of ['EQuran.id API v2', 'Al Quran Cloud API', 'quran-meta', 'Amiri Quran']) assert.ok(items.some((s) => s.name === name), name)
})

test('qari tambahan: daftar valid, id unik, alamat audio surah berpola benar', async () => {
  const { QARI_EXTRA } = await import('../src/data/qari-extra.js')
  const { QARI, QARI_AYAH, QARI_SURAH } = await import('../src/config.js')
  assert.ok(QARI_EXTRA.length >= 20)
  assert.equal(new Set(QARI_EXTRA.map((q) => q.id)).size, QARI_EXTRA.length)
  assert.equal(new Set(QARI_EXTRA.map((q) => q.base)).size, QARI_EXTRA.length)
  for (const q of QARI_EXTRA) {
    assert.match(q.id, /^x-[a-z0-9-]+$/)
    assert.ok(!QARI_AYAH[q.id])
    assert.match(q.base, /^https:\/\/server\d{1,2}\.mp3quran\.net\/[\w\-\/]+$/)
    assert.match(q.alt, /^https:\/\/cdn\.mp3quran\.net\/audio\/[\w-]+\/r\d$/)
    assert.ok(['murattal', 'mujawwad'].includes(q.style))
    assert.ok(q.name.length > 3 && !/^(syekh|qari)\s/i.test(q.name))
  }
  assert.equal(Object.keys(QARI).length, 6 + QARI_EXTRA.length)
  assert.equal(QARI_SURAH['x-mahir-al-muaiqly'].base, 'https://server12.mp3quran.net/maher')
})

test('ayat pilihan: rujukan sah, unik, dan berganti setiap hari', async () => {
  const { AYAT_PILIHAN, ayatHariIni, dayKey } = await import('../src/data/ayat-pilihan.js')
  assert.ok(AYAT_PILIHAN.length >= 90)
  const keys = AYAT_PILIHAN.map(([s, a]) => `${s}:${a}`)
  assert.equal(new Set(keys).size, keys.length, 'tidak ada ayat ganda')
  for (const [s, a] of AYAT_PILIHAN) assert.ok(s >= 1 && s <= 114 && a >= 1 && a <= meta.ayahCounts[s - 1], `${s}:${a}`)
  // Setiap hari berbeda dari kemarin, dan satu putaran penuh memunculkan semua ayat tepat sekali.
  const seen = new Set()
  let prev = null
  for (let d = 0; d < AYAT_PILIHAN.length; d++) {
    const k = ayatHariIni(new Date(2026, 0, 1 + d)).join(':')
    assert.notEqual(k, prev)
    seen.add(k)
    prev = k
  }
  assert.equal(seen.size, AYAT_PILIHAN.length)
  // Stabil sepanjang hari yang sama (jam berbeda), berganti tepat tengah malam waktu perangkat.
  assert.deepEqual(ayatHariIni(new Date(2026, 10, 14, 0, 1)), ayatHariIni(new Date(2026, 10, 14, 23, 59)))
  assert.notDeepEqual(ayatHariIni(new Date(2026, 10, 14, 23, 59)), ayatHariIni(new Date(2026, 10, 15, 0, 1)))
  assert.notDeepEqual(ayatHariIni(new Date(2026, 10, 14), 1), ayatHariIni(new Date(2026, 10, 14), 0))
  assert.notEqual(dayKey(new Date(2026, 10, 14)), dayKey(new Date(2026, 10, 15)))
})

test('qari: tidak ada yang ganda (id, nama, alamat audio)', async () => {
  const { QARI, QARI_AYAH, QARI_SURAH } = await import('../src/config.js').catch(() => ({}))
  const { QARI_EXTRA } = await import('../src/data/qari-extra.js')
  const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/\b(al|as|asy|ash|bin|el)\b/g, '').replace(/[^a-z]/g, '')
  const names = [...(QARI_AYAH ? Object.values(QARI_AYAH) : []), ...QARI_EXTRA.map((q) => q.name)].map(norm)
  assert.equal(new Set(names).size, names.length, 'nama qari ganda')
  assert.equal(new Set(QARI_EXTRA.map((q) => q.id)).size, QARI_EXTRA.length)
  assert.equal(new Set(QARI_EXTRA.map((q) => q.base)).size, QARI_EXTRA.length, 'alamat audio ganda')
  if (QARI) assert.equal(Object.keys(QARI).length, Object.keys(QARI_AYAH).length + Object.keys(QARI_SURAH).length)
})

test('doa wudhu & wirid setelah salat: lengkap, berhuruf Arab, bersumber', () => {
  const dz = JSON.parse(readFileSync('src/data/dzikir.json', 'utf8'))
  assert.equal(dz.source.name, 'fitrahive/dua-dhikr')
  assert.match(dz.source.commit, /^[0-9a-f]{40}$/)
  assert.equal(dz.wudhu.length, 2)
  assert.ok(dz.salat.length >= 10)
  for (const d of [...dz.wudhu, ...dz.salat]) {
    assert.ok(d.title && d.translation, d.title)
    assert.match(d.arabic, /[\u0600-\u06FF]/)
  }
  assert.ok(SOURCES.some((g) => g.items.some((i) => i.name === 'fitrahive/dua-dhikr')))
})

test('ikon: manifest menunjuk berkas berversi yang benar-benar ada', () => {
  const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
  const srcs = [...m.icons, ...m.shortcuts.flatMap((s) => s.icons)].map((i) => i.src)
  for (const src of srcs) {
    assert.match(src, /-v\d+\.png$/, src)
    assert.ok(existsSync('public' + src), src)
  }
  const html = readFileSync('index.html', 'utf8')
  for (const [, href] of html.matchAll(/href="(\/icons\/[^"]+)"/g)) assert.ok(existsSync('public' + href), href)
})

test('Asmaul Husna v2: 99 nama lengkap dengan makna, faedah, dan rujukan ayat yang sah', async () => {
  const { readFileSync } = await import('node:fs')
  const data = JSON.parse(readFileSync(new URL('../src/data/asmaul-husna.json', import.meta.url), 'utf8'))
  const { SURAH_AYAH_COUNT } = await import('../src/utils/quran-meta.js').then((m) => ({ SURAH_AYAH_COUNT: m.ayahCounts }))
  assert.match(data.source, /v2/)
  assert.equal(data.items.length, 99)
  let linked = 0
  data.items.forEach((x, i) => {
    assert.equal(x.id, i + 1)
    for (const k of ['arab', 'latin', 'arti', 'makna', 'amalan']) assert.ok(typeof x[k] === 'string' && x[k].trim().length > 2, `#${x.id} ${k}`)
    assert.ok(x.ref.length >= 1, `#${x.id} rujukan`)
    for (const r of x.ref) {
      assert.ok(r.t.length > 3)
      if (r.s === undefined) continue
      linked++
      assert.ok(r.s >= 1 && r.s <= 114 && r.a >= 1, `#${x.id} ${r.t}`)
      if (SURAH_AYAH_COUNT) assert.ok(r.a <= SURAH_AYAH_COUNT[r.s - 1], `#${x.id} ${r.t} melebihi jumlah ayat`)
    }
  })
  assert.equal(linked, 101)
})

test('Tanda (stabilo): dibulatkan ke kata utuh, digabung, dihapus sebagian, HTML aman', async () => {
  const { snapToWords, addRange, subtractRange, isCovered } = await import('../src/services/highlight.js')
  const t = 'satu dua tiga empat'
  assert.deepEqual(snapToWords(t, 6, 7), [5, 8]) // tengah kata "dua"
  assert.deepEqual(snapToWords(t, 4, 9), [5, 8]) // spasi di tepi dibuang
  assert.deepEqual(snapToWords(t, 6, 11), [5, 13]) // dua kata
  assert.equal(snapToWords(t, 4, 5), null) // hanya spasi
  assert.deepEqual(addRange([[0, 4]], [5, 8]), [[0, 8]]) // bersebelahan (dipisah satu spasi) → satu
  assert.deepEqual(addRange([[0, 4]], [9, 13]), [[0, 4], [9, 13]])
  assert.deepEqual(addRange([[9, 13], [0, 4]], [3, 10]), [[0, 13]])
  assert.deepEqual(subtractRange([[0, 13]], [5, 8]), [[0, 5], [8, 13]])
  assert.equal(isCovered([[0, 8]], [5, 8]), true)
  assert.equal(isCovered([[0, 4]], [5, 8]), false)
})
