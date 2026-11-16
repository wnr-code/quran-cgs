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

test('migrasi cache Compose: hanya surah lama yang lolos validasi masuk format shared app', async () => {
  const { mapLegacyChapter } = await import('../src/services/legacy-migration.js')
  const legacy = {
    nomor: 1, nama: 'الفاتحة', namaLatin: 'Al-Fatihah', jumlahAyat: 7, tempatTurun: 'Mekah', arti: 'Pembukaan', deskripsi: '',
    ayat: Array.from({ length: 7 }, (_, index) => ({ nomorAyat: index + 1, teksArab: 'ا', teksLatin: '', teksIndonesia: '' }))
  }
  const mapped = mapLegacyChapter(JSON.stringify(legacy), 1)
  assert.ok(validateSurahDetail(mapped, 1))
  assert.equal(mapped.source, 'equran')
  assert.equal(mapLegacyChapter(legacy, 2), null, 'surah yang tidak sesuai dengan nama berkas ditolak')
  assert.equal(mapLegacyChapter('{broken json', 1), null)
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

test('doa wudhu & wirid/doa usai salat: dari Quran NU Online, lengkap, wirid dan doa tidak tercampur', () => {
  const dz = JSON.parse(readFileSync('src/data/dzikir.json', 'utf8'))
  assert.equal(dz.source.url, 'https://quran.nu.or.id/doa')
  for (const k of ['wudhu', 'salat']) assert.match(dz.source.pages[k].url, /^https:\/\/quran\.nu\.or\.id\/doa\/doa-/)
  for (const d of [...dz.wudhu, ...dz.salat]) {
    assert.ok(d.title && d.latin && d.translation && d.section, d.title)
    assert.match(d.arabic, /[\u0600-\u06FF]/)
    assert.match(d.source, /Quran NU Online/)
    assert.ok(['wirid', 'doa', 'niat'].includes(d.kind), d.title)
    for (const l of d.links) assert.ok(l.s >= 1 && l.s <= 114 && l.a >= 1 && l.label)
  }
  // Wudhu: 11 bacaan NU (17 kartu), berurutan.
  assert.deepEqual([...new Set(dz.wudhu.map((d) => d.step))], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  assert.deepEqual([...new Set(dz.wudhu.map((d) => d.section))], ['Sebelum wudhu', 'Saat berwudhu', 'Setelah wudhu'])
  assert.equal(dz.wudhu[0].kind, 'niat')
  // Usai salat: seluruh wirid dulu (langkah 1–13), baru doa (langkah 14) — tidak berselang-seling.
  const kinds = dz.salat.map((d) => d.kind)
  const firstDoa = kinds.indexOf('doa')
  assert.ok(firstDoa > 0)
  assert.ok(kinds.slice(0, firstDoa).every((k) => k === 'wirid'))
  assert.ok(kinds.slice(firstDoa).every((k) => k === 'doa'))
  for (const d of dz.salat) assert.equal(d.section, d.kind === 'wirid' ? 'Wirid' : 'Doa')
  assert.deepEqual([...new Set(dz.salat.filter((d) => d.kind === 'wirid').map((d) => d.step))], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  assert.equal(dz.salat.filter((d) => /33x/.test(d.notes)).length, 3)
  assert.equal(dz.salat.filter((d) => d.kind === 'doa').length, 2)
  assert.match(dz.salat.at(-1).arabic, /رَبَّنَا اٰتِنَا فِي الدُّنْيَا حَسَنَةً/)
  assert.ok(SOURCES.some((g) => g.items.some((i) => i.host === 'quran.nu.or.id')))
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

test('install: peramban dikenali & panduan sesuai', async () => {
  globalThis.location ??= { host: 'quran.cgs.my.id', origin: 'https://quran.cgs.my.id' }
  const { detectBrowser, installGuideHtml } = await import('../src/services/install.js')
  const A = 'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) '
  assert.equal(detectBrowser(A + 'Chrome/126.0 Mobile Safari/537.36').id, 'chrome')
  assert.equal(detectBrowser(A + 'SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36').id, 'samsung')
  assert.equal(detectBrowser(A + 'Chrome/126.0 Mobile Safari/537.36 OPR/83.0').id, 'opera')
  assert.equal(detectBrowser('Mozilla/5.0 (Android 13; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0').id, 'firefox')
  assert.equal(detectBrowser(A + 'Version/4.0 Chrome/112.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.5').id, 'mi')
  assert.equal(detectBrowser('Mozilla/5.0 (Linux; Android 13; SM-A546E; wv) AppleWebKit/537.36 Version/4.0 Chrome/126.0 Mobile Safari/537.36 Instagram 330').id, 'inapp')
  assert.equal(detectBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1').id, 'ios-safari')
  assert.match(installGuideHtml({ id: 'firefox', android: true }), /Firefox[\s\S]*Buka di Chrome/)
  assert.match(installGuideHtml({ id: 'mi', android: true }), /kurang didukung[\s\S]*intent:\/\//)
  assert.doesNotMatch(installGuideHtml({ id: 'chrome', android: true }), /intent:/)
})

test('failover: alamat utama mati → data diambil dari alamat cadangan', async () => {
  const { createFailoverFetch, otherMirrors } = await import('../src/services/failover.js')
  const P = 'https://quran.cgs.my.id', B = 'https://quran-cgs.appwnr.workers.dev'
  assert.deepEqual(otherMirrors(P), [B])
  assert.deepEqual(otherMirrors(B), [P])
  assert.deepEqual(otherMirrors('http://localhost:8787'), [])
  let dead = true, t = 0
  const calls = []
  const base = async (input, init) => {
    const u = String(input)
    calls.push([u, init && init.mode])
    if (!u.startsWith('http') || u.startsWith(P)) {
      if (dead) throw new TypeError('Failed to fetch')
      return new Response('utama')
    }
    if (u.startsWith(B)) return new Response('cadangan')
    return new Response('luar')
  }
  const f = createFailoverFetch(base, P, [P, B], { now: () => t })
  assert.equal(await (await f('/api/donors?x=1')).text(), 'cadangan')
  assert.deepEqual(calls, [['/api/donors?x=1', undefined], [B + '/api/donors?x=1', 'cors']])
  // Selama 3 menit berikutnya langsung ke cadangan (tidak menunggu utama gagal lagi).
  calls.length = 0
  assert.equal(await (await f('/data/surah/1.json')).text(), 'cadangan')
  assert.equal(calls.length, 1)
  // POST membawa body yang sama.
  let sent
  const f2 = createFailoverFetch(async (u, i) => { if (!String(u).startsWith(B)) return new Response('', { status: 522 }); sent = i; return new Response('ok') }, P, [P, B])
  assert.equal(await (await f2('/api/infaq/create', { method: 'POST', body: '{"quantity":1}' })).text(), 'ok')
  assert.equal(sent.body, '{"quantity":1}')
  assert.equal(sent.credentials, 'omit')
  // Utama hidup lagi → kembali ke utama setelah masa tunggu.
  dead = false
  t = 4 * 60 * 1000
  assert.equal(await (await f('/version.json')).text(), 'utama')
  // Permintaan lain (lintas-origin / bukan data) tidak disentuh; perangkat offline tidak mencoba cadangan.
  assert.equal(await (await f('https://equran.id/api/v2/surat')).text(), 'luar')
  dead = true
  const off = createFailoverFetch(base, P, [P, B], { isOnline: () => false })
  await assert.rejects(off('/api/donors'), TypeError)
  // Galat 4xx biasa bukan tanda mati.
  const f3 = createFailoverFetch(async () => new Response('', { status: 404 }), P, [P, B])
  assert.equal((await f3('/api/x')).status, 404)
})

test('Capacitor API routing: API same-app goes to Worker, bundled data and third-party APIs stay local', async () => {
  const { createNativeApiFetch } = await import('../src/services/failover.js')
  const calls = []
  const routed = createNativeApiFetch(async (input, init) => {
    calls.push({ input, init })
    return new Response('ok')
  }, 'https://localhost', 'https://quran.cgs.my.id')

  await routed('/api/infaq/config?source=android')
  assert.equal(calls[0].input, 'https://quran.cgs.my.id/api/infaq/config?source=android')
  await routed('/data/surah/1.json')
  assert.equal(calls[1].input, '/data/surah/1.json', 'bundled Quran data remains on the app origin')
  await routed('https://equran.id/api/v2/surat')
  assert.equal(calls[2].input, 'https://equran.id/api/v2/surat', 'third-party API URLs are unchanged')

  const request = new Request('https://localhost/api/infaq/create', { method: 'POST', body: '{"quantity":1}' })
  await routed(request)
  assert.equal(calls[3].input.url, 'https://quran.cgs.my.id/api/infaq/create')
  assert.equal(calls[3].input.method, 'POST')
  assert.equal(await calls[3].input.text(), '{"quantity":1}')
})

test('notifikasi Android memakai pesan foreground tanpa meminta izin sistem', async () => {
  const { notifSupported, notifPermission, requestNotifPermission } = await import('../src/services/notification.js')
  globalThis.androidBridge = {}
  try {
    assert.equal(notifSupported(), true)
    assert.equal(notifPermission(), 'foreground')
    assert.equal(await requestNotifPermission(), 'foreground')
  } finally {
    delete globalThis.androidBridge
  }
})

test('worker: CORS hanya untuk alamat resmi + preflight', async () => {
  const { default: worker, corsHeaders } = await import('../worker/index.js')
  assert.equal(corsHeaders('https://evil.example'), null)
  assert.equal(corsHeaders('http://localhost'), null)
  assert.equal(corsHeaders('https://localhost:8443'), null)
  assert.ok(corsHeaders('https://localhost'), 'Capacitor Android WebView origin is allowed')
  const env = { ASSETS: { fetch: async () => new Response('aset') } }
  const pre = await worker.fetch(new Request('https://quran-cgs.appwnr.workers.dev/api/infaq/create', { method: 'OPTIONS', headers: { Origin: 'https://quran.cgs.my.id' } }), env, { waitUntil() {} })
  assert.equal(pre.status, 204)
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), 'https://quran.cgs.my.id')
  const nativePreflight = await worker.fetch(new Request('https://quran.cgs.my.id/api/infaq/create', { method: 'OPTIONS', headers: { Origin: 'https://localhost' } }), env, { waitUntil() {} })
  assert.equal(nativePreflight.status, 204)
  assert.equal(nativePreflight.headers.get('Access-Control-Allow-Origin'), 'https://localhost')
  const nf = await worker.fetch(new Request('https://quran-cgs.appwnr.workers.dev/api/tidak-ada', { headers: { Origin: 'https://quran.cgs.my.id' } }), env, { waitUntil() {} })
  assert.equal(nf.status, 404)
  assert.equal(nf.headers.get('Access-Control-Allow-Origin'), 'https://quran.cgs.my.id')
  const bad = await worker.fetch(new Request('https://quran-cgs.appwnr.workers.dev/api/tidak-ada', { headers: { Origin: 'https://evil.example' } }), env, { waitUntil() {} })
  assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null)
})

test('cuplikan tautan: tag Open Graph/Twitter lengkap & gambar 1200×630', async () => {
  const { readFileSync } = await import('node:fs')
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const meta = (k) => (new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`).exec(html) || [])[1]
  for (const k of ['og:type', 'og:site_name', 'og:url', 'og:title', 'og:description', 'og:image', 'og:image:width', 'og:image:height', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) assert.ok(meta(k), 'ada ' + k)
  assert.equal(meta('og:image'), 'https://quran.cgs.my.id/og-image.jpg') // harus alamat lengkap (https), bukan relatif
  assert.equal(meta('twitter:card'), 'summary_large_image')
  assert.ok(meta('og:description').length <= 200)
  JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1])
  const { default: sharp } = await import('sharp')
  const m = await sharp(new URL('../public/og-image.jpg', import.meta.url).pathname).metadata()
  assert.deepEqual([m.width, m.height, m.format], [1200, 630, 'jpeg'])
  assert.ok(readFileSync(new URL('../public/og-image.jpg', import.meta.url)).length < 300 * 1024, 'di bawah 300 KB (batas WhatsApp)')
})

test('bagikan doa: teks lengkap & tautan media sosial', async () => {
  const { doaText, doaUrl, shareLinks } = await import('../src/utils/doa-share.js')
  const p = { title: 'Istighfar', ar: 'أَسْتَغْفِرُ اللهَ', latin: 'Astaghfirullāh', arti: 'Aku memohon ampun kepada Allah.', ref: 'NU Online', tab: 'salat' }
  assert.equal(doaText(p), 'Istighfar\n\nأَسْتَغْفِرُ اللهَ\n\nAstaghfirullāh\n\nArtinya: Aku memohon ampun kepada Allah.\n\n(NU Online)')
  assert.equal(doaText({ title: 'A', ar: 'ب', latin: '', arti: '', ref: '', tab: 'quran' }), 'A\n\nب')
  assert.equal(doaUrl(p, 'https://quran.cgs.my.id'), 'https://quran.cgs.my.id/#/doa/salat')
  const l = shareLinks(p, 'https://quran.cgs.my.id')
  assert.match(l.whatsapp, /^https:\/\/wa\.me\/\?text=Istighfar%0A/)
  assert.ok(decodeURIComponent(l.whatsapp).endsWith('https://quran.cgs.my.id/#/doa/salat'))
  assert.match(l.telegram, /^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Fquran\.cgs\.my\.id%2F%23%2Fdoa%2Fsalat&text=/)
  assert.match(l.facebook, /sharer\.php\?u=https%3A/)
  const long = shareLinks({ ...p, ar: 'ا'.repeat(500) }, 'https://quran.cgs.my.id')
  assert.ok(decodeURIComponent(new URL(long.x).searchParams.get('text')).length <= 200)
})

test('doa harian NU: per kategori, lengkap, tanpa duplikat', () => {
  const nu = JSON.parse(readFileSync('src/data/doa-nu.json', 'utf8'))
  const dz = JSON.parse(readFileSync('src/data/dzikir.json', 'utf8'))
  assert.equal(nu.source.url, 'https://quran.nu.or.id/doa')
  assert.deepEqual(nu.categories.map((c) => [c.slug, c.items.length]), [['doa-keseharian', 19], ['doa-rezeki', 9], ['doa-tolak-bala', 13], ['doa-kesehatan', 5], ['doa-perjalanan', 7], ['doa-ilmu', 9]])
  const ids = new Set()
  const titles = new Set()
  const arabs = new Set([...dz.wudhu, ...dz.salat].map((d) => d.arabic))
  for (const c of nu.categories) {
    assert.ok(c.name && c.icon && c.desc)
    for (const d of c.items) {
      assert.match(d.id, /^[a-z0-9-]+$/)
      assert.ok(!ids.has(d.id) && !titles.has(d.title), 'duplikat: ' + d.title)
      ids.add(d.id)
      titles.add(d.title)
      assert.ok(d.parts.length >= 1)
      for (const x of d.parts) {
        assert.match(x.ar, /[\u0600-\u06FF]/)
        assert.ok(x.latin && x.arti && !/[\u0600-\u06FF]/.test(x.latin), d.title)
        assert.ok(!/[\u200b-\u200f]/.test(x.ar + x.latin + x.arti), 'karakter tak terlihat: ' + d.title)
        // Bacaan yang sama tidak boleh muncul dua kali (di kategori lain maupun di wudhu/usai salat).
        assert.ok(!arabs.has(x.ar), 'bacaan ganda: ' + d.title)
        arabs.add(x.ar)
      }
    }
  }
  assert.equal(ids.size, 62)
  // Sumber data lama (EQuran doa) tidak dipakai lagi.
  assert.ok(!SOURCES.some((g) => g.items.some((i) => /EQuran\.id API Doa/.test(i.name))))
  assert.ok(SOURCES.some((g) => g.items.some((i) => /Font Awesome/.test(i.name))))
})

test('beranda: ikon ucapan sesuai waktu & penyemangat berujukan ayat', async () => {
  const { greeting, greetingIcon } = await import('../src/utils/format.js')
  const at = (h) => new Date(2026, 0, 1, h, 0)
  assert.deepEqual([2, 5, 12, 16, 20].map((h) => greetingIcon(at(h))), ['moon', 'sunrise', 'sun', 'cloud-sun', 'moon'])
  assert.deepEqual([2, 5, 12, 16, 20].map((h) => greeting(at(h))), ['Selamat malam', 'Selamat pagi', 'Selamat siang', 'Selamat sore', 'Selamat malam'])
  const { MUTIARA } = await import('../src/data/mutiara.js')
  const meta = JSON.parse(readFileSync('src/data/quran-meta.json', 'utf8'))
  assert.ok(MUTIARA.length >= 10)
  for (const m of MUTIARA) {
    assert.ok(m.t.length > 15 && m.t.length < 120 && /^QS\. /.test(m.r))
    assert.ok(m.s >= 1 && m.s <= 114 && m.a >= 1)
    assert.ok(m.r.endsWith(': ' + m.a))
  }
  assert.ok(meta)
  const home = readFileSync('src/pages/home.js', 'utf8')
  const styles = readFileSync('src/styles/main.css', 'utf8')
  assert.match(home, /class="salutation"[\s\S]*class="salam"/)
  assert.match(home, /class="greet"[\s\S]*<strong>\$\{esc\(greeting\(now\)\)\}<\/strong>/)
  assert.match(styles, /\.salam\s*\{[^}]*text-align:\s*center/)
})

test('bagikan: tautan Asmaul Husna memakai path', async () => {
  const { doaUrl } = await import('../src/utils/doa-share.js')
  assert.equal(doaUrl({ path: '/asmaul-husna' }, 'https://quran.cgs.my.id'), 'https://quran.cgs.my.id/#/asmaul-husna')
})

test('tema kustom: variabel turunan sah, terbaca, dan tahan masukan rusak', async () => {
  const { deriveTheme, normalizeCustom, contrast, luminance, THEME_PRESETS, CUSTOM_DEFAULT } = await import('../src/utils/theme.js')
  const hex = /^#[0-9a-f]{6}$/
  for (const p of THEME_PRESETS) {
    const t = deriveTheme(p)
    for (const [k, v] of Object.entries(t.vars)) assert.match(v, hex, `${p.id} ${k}`)
    assert.equal(t.base, luminance(p.bg) < 0.18 ? 'dark' : 'light')
    assert.ok(contrast(t.vars['--text'], t.vars['--bg']) >= 7, p.id + ' teks')
    assert.ok(contrast(t.vars['--text'], t.vars['--surface']) >= 7, p.id + ' teks di kartu')
    assert.ok(contrast(t.vars['--primary'], t.vars['--bg']) >= 3, p.id + ' utama')
    assert.ok(contrast(t.vars['--primary-ink'], t.vars['--primary']) >= 4.5, p.id + ' tombol')
    assert.ok(contrast(t.vars['--hero-ink'], t.vars['--hero-2']) >= 4.5, p.id + ' kepala')
    assert.ok(contrast(t.vars['--muted'], t.vars['--bg']) >= 3, p.id + ' redup')
  }
  assert.equal(new Set(THEME_PRESETS.map((p) => p.id)).size, THEME_PRESETS.length)
  // Pilihan ekstrem tetap terbaca: utama = latar.
  for (const c of ['#ffffff', '#000000', '#ffff00', '#7f7f7f']) {
    const t = deriveTheme({ primary: c, accent: c, bg: c })
    assert.ok(contrast(t.vars['--primary'], t.vars['--bg']) >= 3, c)
    assert.ok(contrast(t.vars['--text'], t.vars['--bg']) >= 4.5, c)
    assert.ok(contrast(t.vars['--hero-ink'], t.vars['--hero-2']) >= 4.5, c)
  }
  assert.deepEqual(normalizeCustom({ primary: 'javascript:1', accent: '#ABCDEF', bg: null }), { primary: CUSTOM_DEFAULT.primary, accent: '#abcdef', bg: CUSTOM_DEFAULT.bg })
  assert.deepEqual(normalizeCustom(undefined), CUSTOM_DEFAULT)
})

test('migrasi font Arab lama ke Scheherazade tetap satu kali dan Amiri tetap bisa dipilih', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map([['quranku:settings', JSON.stringify({ arabicFont: 'amiri', theme: 'light' })]])
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key)
    }
  })
  try {
    const loadFresh = () => import(`../src/services/storage.js?font-migration=${Math.random()}`)
    const { getSettings } = await loadFresh()
    assert.equal(getSettings().arabicFont, 'scheherazade')
    assert.equal(getSettings().theme, 'light')
    assert.equal(values.get('quranku:migration:readable-quran-font-v1'), '1')
    values.set('quranku:settings', JSON.stringify({ arabicFont: 'amiri', theme: 'light' }))
    assert.equal((await loadFresh()).getSettings().arabicFont, 'amiri')
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
})

test('preset pembaca mengikuti tema global tanpa menghapus preset mushaf', async () => {
  const { READER_DEFAULTS, DEFAULTS } = await import('../src/services/storage.js')
  const { PRESETS, applyReaderStyle } = await import('../src/components/reading-toolbar.js')
  assert.equal(READER_DEFAULTS.preset, 'theme')
  assert.equal(DEFAULTS.arabicFont, 'scheherazade')
  assert.equal(PRESETS.theme, 'Ikuti tema aplikasi')
  assert.ok(PRESETS.classic && PRESETS.ivory && PRESETS.dark && PRESETS.night)

  const vars = new Map()
  const el = {
    dataset: {},
    classList: { toggle() {} },
    style: {
      setProperty: (name, value) => vars.set(name, value),
      removeProperty: (name) => vars.delete(name)
    }
  }
  applyReaderStyle(el)
  assert.equal(el.dataset.preset, 'theme')
  assert.equal(vars.get('--rd-font'), `${READER_DEFAULTS.fontSize}px`)
  const css = readFileSync('src/styles/reader.css', 'utf8')
  assert.match(css, /\.reader\[data-preset='theme'\][^{]*\{[^}]*--rd-bg:\s*var\(--surface\)/)
})

test('layar pembuka: ada di index.html, salam Arab, dan berkasnya ikut precache', () => {
  const html = readFileSync('index.html', 'utf8')
  assert.match(html, /<div id="splash"/)
  assert.ok(html.normalize('NFC').includes('اَلسَّلَامُ عَلَيْكُمْ'.normalize('NFC')))
  assert.match(html, /<script src="\/splash\.js"><\/script>/)
  assert.match(html, /sp-bye [^;]*8s/) // menutup sendiri bila aplikasi gagal dimuat
  assert.match(readFileSync('vite.config.js', 'utf8'), /p === 'splash\.js'/)
  assert.match(readFileSync('src/app.js', 'utf8'), /hideSplash\(\)/)
})

test('sumber data: halaman terpisah, footer tidak menaut langsung ke situs sumber', async () => {
  const { readFileSync } = await import('node:fs')
  const rd = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  assert.match(rd('app.js'), /addRoute\('\/sumber'/)
  for (const f of ['pages/doa.js', 'pages/asmaul.js']) {
    const foot = rd(f).split('\n').filter((l) => /nuLink =|src-foot/.test(l)).join('\n')
    assert.ok(!/target="_blank"/.test(foot), f)
    assert.match(rd(f), /href=\\?"#\/sumber\\?"/)
  }
  const page = rd('pages/sources.js')
  assert.match(page, /isGithub\(s\.url\)\) return `<a /)
  assert.match(page, /Terima kasih/)
  assert.ok(!/SOURCES/.test(rd('pages/about.js')))
})
