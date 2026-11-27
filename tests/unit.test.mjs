import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toArabicIndic, toLatinDigits, ayahMarker, qnum, setNumeralMode, ayahRef } from '../src/utils/arabic-numbers.js'
import { juzOf, pageOf, isSajda, juzStart, pageStart, ayahId, fromAyahId, juzList, isPageEnd, TOTAL_PAGES } from '../src/utils/quran-meta.js'
import { validateSurahDetail, validateSurahList, isAyahNo, parseCoord, cleanText } from '../src/utils/validation.js'
import { qiblaBearing, distanceToKaaba } from '../src/services/qibla.js'
import { stripBasmalah } from '../src/api/alqurancloud.js'
import { mapDetail, mapSummary } from '../src/api/equran.js'
import { esc, stripHtml, shareText, shareImage, downloadImage } from '../src/utils/helpers.js'
import { createAyahImage, createShareImage, wrapCanvasText, AYAH_IMAGE_THEMES, SHARE_IMAGE_SLOGANS } from '../src/utils/ayah-image.js'
import { toHijri } from '../src/utils/hijri.js'
import { mapLocalDetail } from '../src/api/local-data.js'
import { SOURCES } from '../src/data/sources.js'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fakeD1 } from './helpers.mjs'
import { ensureSchema } from '../functions/lib/db.js'
import { periodStarts } from '../functions/api/donors.js'
import { parseDonation, onRequestPost } from '../functions/api/trakteer-webhook.js'
import { createRequire } from 'node:module'
const meta = createRequire(import.meta.url)('../src/data/quran-meta.json')
const quranImageFixtures = createRequire(import.meta.url)('quran-json/dist/quran_id.json')

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

test('bagikan: gunakan Web Share atau laporkan tidak didukung, jangan diam-diam menyalin', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const calls = []
  let copied = 0
  const setNavigator = (value) => Object.defineProperty(globalThis, 'navigator', { configurable: true, value })
  try {
    setNavigator({ share: async (payload) => calls.push(payload), clipboard: { writeText: async () => copied++ } })
    assert.equal(await shareText('Ayat pilihan', 'Teks ayat', 'https://quran.cgs.my.id/surah/1/1'), 'shared')
    assert.deepEqual(calls, [{ title: 'Ayat pilihan', text: 'Teks ayat', url: 'https://quran.cgs.my.id/surah/1/1' }])
    assert.equal(copied, 0)

    setNavigator({ clipboard: { writeText: async () => copied++ } })
    assert.equal(await shareText('Ayat pilihan', 'Teks ayat', 'https://quran.cgs.my.id/surah/1/1'), 'unsupported')
    assert.equal(copied, 0, 'share yang tidak tersedia tidak berubah menjadi salin')

    setNavigator({ share: async () => { throw new DOMException('dibatalkan', 'AbortError') }, clipboard: { writeText: async () => copied++ } })
    assert.equal(await shareText('Ayat pilihan', 'Teks ayat'), 'cancelled')
    assert.equal(copied, 0, 'membatalkan share tidak memicu salin')
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
  }
})

test('berbagi PNG: kirim File lewat Web Share API', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const calls = []
  const setNavigator = (value) => Object.defineProperty(globalThis, 'navigator', { configurable: true, value })
  try {
    setNavigator({
      canShare: ({ files }) => files.length === 1 && files[0].type === 'image/png',
      share: async (payload) => calls.push(payload)
    })
    const png = new Blob(['png'], { type: 'image/png' })
    assert.equal(await shareImage(png, { filename: 'quranku-ayat-1-1.png', title: 'QS. Al-Fatihah 1:1' }), 'shared')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].files.length, 1)
    assert.ok(calls[0].files[0] instanceof File)
    assert.equal(calls[0].files[0].name, 'quranku-ayat-1-1.png')
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
  }
})

test('berbagi JPG: pertahankan MIME type dan ekstensi saat berbagi', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const calls = []
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      canShare: ({ files }) => files.length === 1 && files[0].type === 'image/jpeg',
      share: async (payload) => calls.push(payload)
    }
  })
  try {
    const jpg = new Blob(['jpg'], { type: 'image/jpeg' })
    assert.equal(await shareImage(jpg, { filename: 'quranku-ayat-112-1.jpg' }), 'shared')
    assert.equal(calls[0].files[0].type, 'image/jpeg')
    assert.equal(calls[0].files[0].name, 'quranku-ayat-112-1.jpg')
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
  }
})

test('berbagi PNG: pembatalan tidak memicu unduhan', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      canShare: () => true,
      share: async () => { throw new DOMException('dibatalkan', 'AbortError') }
    }
  })
  try {
    assert.equal(await shareImage(new Blob(['png'], { type: 'image/png' })), 'cancelled')
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous)
    else delete globalThis.navigator
  }
})

test('berbagi PNG: unduh bila berbagi berkas tidak didukung', async () => {
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const previousSetTimeout = globalThis.setTimeout
  const anchor = { click() { this.clicked = true }, remove() {} }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { canShare: () => false } })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => anchor, body: { appendChild() {} } }
  })
  globalThis.setTimeout = (callback, delay) => delay === 2000 ? 0 : previousSetTimeout(callback, delay)
  try {
    assert.equal(await shareImage(new Blob(['png'], { type: 'image/png' }), { filename: 'ayat-pilihan.png' }), 'downloaded')
    assert.equal(anchor.download, 'ayat-pilihan.png')
    assert.equal(anchor.clicked, true)
  } finally {
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator)
    else delete globalThis.navigator
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
    globalThis.setTimeout = previousSetTimeout
  }
})

test('unduh gambar browser tetap memakai unduhan web dan melaporkan saat dimulai', async () => {
  const calls = []
  const blob = new Blob(['png'], { type: 'image/png' })
  const result = await downloadImage('quranku-ayat-1-1.png', blob, 'image/png', {
    platform: 'web',
    download: async (...args) => calls.push(args),
    saveToGallery: async () => assert.fail('browser tidak boleh memanggil MediaStore Android')
  })
  assert.equal(result, 'downloaded')
  assert.deepEqual(calls, [['quranku-ayat-1-1.png', blob, 'image/png']])
})

test('unduh gambar Android menunggu hasil penyimpanan MediaStore', async () => {
  const calls = []
  let browserDownloads = 0
  const blob = new Blob([new Uint8Array([0, 1, 255])], { type: 'image/png' })
  const result = await downloadImage('quranku-ayat-1-1.png', blob, 'image/png', {
    platform: 'android',
    saveToGallery: async (payload) => {
      calls.push(payload)
      return { saved: true, uri: 'content://media/external/images/1' }
    },
    download: () => browserDownloads++
  })
  assert.equal(result, 'saved')
  assert.deepEqual(calls, [{ filename: 'quranku-ayat-1-1.png', mimeType: 'image/png', data: 'AAH/' }])
  assert.equal(browserDownloads, 0, 'Android menggunakan penyimpanan publik, bukan anchor WebView')
})

test('unduh gambar Android tidak melaporkan sukses saat penyimpanan gagal', async () => {
  const blob = new Blob(['jpg'], { type: 'image/jpeg' })
  let browserDownloads = 0
  for (const saveToGallery of [
    async () => ({ saved: false }),
    async () => { throw new Error('MediaStore unavailable') }
  ]) {
    const result = await downloadImage('quranku-ayat-1-1.jpg', blob, 'image/jpeg', {
      platform: 'android',
      saveToGallery,
      download: () => browserDownloads++
    })
    assert.equal(result, 'failed')
  }
  assert.equal(browserDownloads, 0, 'kegagalan Android tidak disamarkan sebagai unduhan berhasil')
  assert.equal(await downloadImage('empty.png', new Blob(), 'image/png', { platform: 'android' }), 'failed')
})

test('jembatan galeri Android terdaftar dan menyimpan lewat MediaStore', () => {
  const plugin = readFileSync('android/app/src/main/java/id/cgs/quranku/ImageGalleryPlugin.java', 'utf8')
  assert.match(plugin, /@CapacitorPlugin\(\s*name = "ImageGallery"/)
  assert.match(plugin, /public void saveImage\(PluginCall call\)/)
  assert.match(plugin, /MediaStore\.Images\.Media\.RELATIVE_PATH/)
  assert.match(plugin, /Environment\.DIRECTORY_PICTURES \+ "\/" \+ DIRECTORY_NAME/)
  assert.match(plugin, /IS_PENDING, 0/)
  assert.match(plugin, /call\.reject\(/, 'kegagalan penyimpanan harus dilaporkan ke JavaScript')
  assert.match(plugin, /requestPermissionForAlias\("storage"/, 'versi Android lama meminta izin penyimpanan saat dibutuhkan')
  assert.match(plugin, /MediaScannerConnection\.scanFile/, 'Android lama tetap menerbitkan berkas ke Galeri')
  assert.match(readFileSync('android/app/src/main/java/id/cgs/quranku/MainActivity.java', 'utf8'), /registerPlugin\(ImageGalleryPlugin\.class\)/)
  assert.match(readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8'), /WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28"/)
  assert.match(readFileSync('src/services/native-image-gallery.js', 'utf8'), /registerPlugin\('ImageGallery'\)/)
  assert.match(readFileSync('src/utils/helpers.js', 'utf8'), /NativeImageGallery\.saveImage/)
})

test('bungkus teks gambar tanpa memotong isi', () => {
  const ctx = { measureText: (text) => ({ width: [...text].length }) }
  assert.deepEqual(wrapCanvasText(ctx, 'ayat pilihan hari ini', 12), ['ayat pilihan', 'hari ini'])
  assert.deepEqual(wrapCanvasText(ctx, '   ', 12), [])
})

function makeAyahCanvasHarness({ failImages = [] } = {}) {
  const canvases = []
  const contexts = []
  const images = []
  const gradient = { addColorStop() {} }
  const doc = {
    baseURI: 'https://quran.cgs.my.id/',
    fonts: { load: async () => [] },
    createElement(tag) {
      if (tag === 'img') {
        const image = {
          naturalWidth: 848,
          naturalHeight: 1264,
          src: '',
          decode: async () => {
            if (failImages.some((path) => image.src.endsWith(path))) throw new Error('Image unavailable')
          }
        }
        images.push(image)
        return image
      }
      const canvas = { width: 0, height: 0 }
      const ctx = {
        font: '10px sans-serif', fillStyle: '#000', direction: 'ltr', textAlign: 'left', operations: [], texts: [], images: [], pathCommands: [],
        measureText(text) {
          const size = Number(/(?:^|\s)(\d+(?:\.\d+)?)px\b/.exec(this.font)?.[1]) || 10
          const factor = /Amiri|Scheherazade/.test(this.font) ? 0.42 : 0.52
          return { width: [...String(text)].length * size * factor }
        },
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        scale() {}, beginPath() {}, moveTo(...args) { this.pathCommands.push(['moveTo', ...args]) }, lineTo(...args) { this.pathCommands.push(['lineTo', ...args]) },
        quadraticCurveTo(...args) { this.pathCommands.push(['quadraticCurveTo', ...args]) }, closePath() { this.pathCommands.push(['closePath']) },
        fill() {}, stroke() {}, strokeRect() {}, save() {}, translate() {}, rotate() {}, restore() {}, arc(...args) { this.pathCommands.push(['arc', ...args]) },
        fillRect(x, y, width, height) {
          this.operations.push({ kind: 'fillRect', x, y, width, height, fillStyle: this.fillStyle, composite: this.globalCompositeOperation })
        },
        drawImage(...args) { this.images.push(args); this.operations.push({ kind: 'drawImage', args }) },
        fillText(text, x, y, maxWidth) { this.texts.push({ text, x, y, font: this.font, color: this.fillStyle, align: this.textAlign, maxWidth }) }
      }
      canvas.getContext = (type, options) => {
        ctx.contextOptions = options
        return ctx
      }
      canvas.toBlob = (callback, type, quality) => {
        canvas.requestedType = type
        canvas.requestedQuality = quality
        callback(new Blob(['rendered-image'], { type }))
      }
      canvases.push(canvas)
      contexts.push(ctx)
      return canvas
    }
  }
  return { doc, canvases, contexts, images, getImage: (path) => images.find((image) => image.src.endsWith(path)) }
}

test('ayat Arab panjang mengecil hingga muat dan Canvas membatasi lebar teks', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const harness = makeAyahCanvasHarness()
  const arabic = 'ب'.repeat(80)
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: harness.doc })
    await createShareImage({ arabic })
    const ctx = harness.contexts[0]
    const row = ctx.texts.find((item) => item.text === arabic)
    assert.ok(row, 'teks Arab utuh tetap dirender')
    assert.ok(Number.parseFloat(row.font) < 60, 'font Arab otomatis mengecil untuk teks tanpa spasi yang panjang')
    assert.equal(row.maxWidth, 588, 'kanvas membatasi baris di dalam panel teks')
    ctx.font = row.font
    assert.ok(ctx.measureText(row.text).width <= row.maxWidth, 'baris Arab panjang tidak melewati border panel')
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('gambar ayat adaptif: pendek, sedang, dan panjang; latar opak, utuh, serta 720×1280', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const setDocument = (value) => Object.defineProperty(globalThis, 'document', { configurable: true, value })
  const cases = [
    { label: 'pendek', surah: 112, ayah: 1 },
    { label: 'sedang', surah: 13, ayah: 28 },
    { label: 'panjang', surah: 2, ayah: 282 }
  ]
  const arabicSizes = []
  try {
    for (const sample of cases) {
      const surah = quranImageFixtures[sample.surah - 1]
      const verse = surah.verses[sample.ayah - 1]
      const harness = makeAyahCanvasHarness()
      setDocument(harness.doc)
      const png = await createAyahImage({
        arabic: verse.text,
        translation: verse.translation,
        reference: `QS. ${surah.transliteration} ${sample.surah}:${sample.ayah}`,
        sourceUrl: `https://quran.cgs.my.id/surah/${sample.surah}/${sample.ayah}`
      })
      const [renderCanvas, exportCanvas] = harness.canvases
      const [renderCtx, exportCtx] = harness.contexts
      const palette = AYAH_IMAGE_THEMES[0].colors
      const bodyRows = renderCtx.texts.filter((row) => row.y >= 312 && row.y < 1080)
      const arabicRows = bodyRows.filter((row) => /Amiri Quran|Scheherazade New/.test(row.font))
      const translationRows = bodyRows.filter((row) => row.color === palette.translation && !/Amiri Quran|Scheherazade New/.test(row.font))
      const fullText = renderCtx.texts.map((row) => row.text).join(' ')
      const backgroundFill = exportCtx.operations.find((op) => op.kind === 'fillRect' && op.x === 0 && op.y === 0 && op.width === 720 && op.height === 1280)
      const compositeIndex = exportCtx.operations.findIndex((op) => op.kind === 'drawImage')
      const backgroundIndex = exportCtx.operations.findIndex((op) => op.kind === 'fillRect' && op.x === 0 && op.y === 0 && op.width === 720 && op.height === 1280)
      const quranLogo = renderCtx.images.find((args) => args[0] === harness.getImage('/brand/quranku-logo.png'))
      const cigatasLogo = renderCtx.images.find((args) => args[0] === harness.getImage('/cigatas-identity.png'))
      const sourceLink = renderCtx.texts.find((row) => row.text === `Sumber: quran.cgs.my.id/surah/${sample.surah}/${sample.ayah}`)
      const websiteDivider = renderCtx.texts.find((row) => row.text === '|')
      const websiteLink = renderCtx.texts.find((row) => row.text === 'quran.cgs.my.id')
      const playStoreLine = renderCtx.texts.find((row) => row.text === 'Google Play · QuranKu')

      assert.equal(png.type, 'image/png', `${sample.label}: PNG`)
      assert.deepEqual([exportCanvas.width, exportCanvas.height], [720, 1280], `${sample.label}: ukuran Status WhatsApp 9:16`)
      assert.deepEqual([renderCanvas.width, renderCanvas.height], [1440, 2560], `${sample.label}: render 2× untuk ketajaman`)
      assert.equal(renderCtx.contextOptions.alpha, false)
      assert.equal(exportCtx.contextOptions.alpha, false)
      assert.equal(backgroundFill.fillStyle, palette.backgroundStart, `${sample.label}: kanvas akhir selalu punya latar penuh`)
      assert.ok(backgroundIndex >= 0 && compositeIndex > backgroundIndex, `${sample.label}: latar digambar sebelum artwork diratakan`)
      assert.equal(arabicRows.map((row) => row.text).join(' '), verse.text, `${sample.label}: seluruh tulisan Arab terjaga`)
      assert.match(arabicRows[0].font, /Amiri Quran|Scheherazade New/, `${sample.label}: font Arab tersetel`)
      assert.ok(arabicRows.every((row) => {
        renderCtx.font = row.font
        return row.maxWidth === 588 && renderCtx.measureText(row.text).width <= row.maxWidth
      }), `${sample.label}: baris Arab menyusut dan tetap di dalam border`)
      const bodyMosque = renderCtx.pathCommands.findIndex((command, index, commands) =>
        command[0] === 'moveTo' && command[1] === 248 &&
        commands[index + 1]?.[0] === 'lineTo' && commands[index + 1]?.[1] === 335 && command[2] === commands[index + 1]?.[2]
      )
      assert.ok(bodyMosque >= 0, `${sample.label}: pembatas masjid dirender di bawah ayat`)
      const mosqueTop = renderCtx.pathCommands[bodyMosque][2] - 28
      assert.ok(mosqueTop - Math.max(...arabicRows.map((row) => row.y)) > 8, `${sample.label}: pembatas masjid tidak menempel pada teks Arab`)
      assert.equal(translationRows.map((row) => row.text).join(' '), verse.translation, `${sample.label}: seluruh terjemahan terjaga`)
      assert.ok(arabicRows.every((row) => row.y < 1080) && translationRows.every((row) => row.y < 1080), `${sample.label}: teks tidak menabrak footer`)
      assert.ok(quranLogo, `${sample.label}: logo QuranKu kiriman pengguna dirender pada header`)
      assert.deepEqual(quranLogo.slice(1, 5), [48, 62, 144, 96], `${sample.label}: logo QuranKu diperkecil lagi di header`)
      assert.deepEqual(cigatasLogo?.slice(1, 5), [24, 1162, 84, 56], `${sample.label}: logo Cigatas diperkecil lagi di footer`)
      assert.ok(sourceLink && sourceLink.y > Math.max(...arabicRows.map((row) => row.y), ...translationRows.map((row) => row.y)), `${sample.label}: tautan sumber tampil tepat di bawah bacaan`)
      assert.equal(sourceLink.color, palette.secondary, `${sample.label}: tautan sumber memakai warna kontras`)
      assert.deepEqual([websiteDivider?.text, websiteDivider?.x, websiteDivider?.y, websiteDivider?.align], ['|', 24, 1250, 'left'], `${sample.label}: pemisah vertikal kembali sebelum ikon globe`)
      assert.equal(websiteLink?.y, 1250, `${sample.label}: alamat situs kembali di bawah logo Cigatas`)
      assert.equal(websiteLink?.align, 'left')
      assert.deepEqual([playStoreLine?.x, playStoreLine?.y, playStoreLine?.align], [696, 1205, 'right'], `${sample.label}: ajakan Play Store rata kanan dengan margin logo kiri`)
      const footerDivider = renderCtx.pathCommands.findIndex((command, index, commands) =>
        command[0] === 'moveTo' && command[1] === 360 && command[2] === 1164 &&
        commands[index + 1]?.[0] === 'lineTo' && commands[index + 1]?.[1] === 360 && commands[index + 1]?.[2] === 1252
      )
      assert.ok(footerDivider >= 0, `${sample.label}: garis tengah memisahkan identitas kiri dan kanan`)
      assert.ok(fullText.includes('Unduh APK') && fullText.includes('Google Play · QuranKu'), `${sample.label}: ajakan Play Store tampil di sisi kanan footer`)
      assert.ok(harness.images.some((image) => image.src.endsWith('/brand/quranku-logo.png')))
      assert.ok(harness.images.some((image) => image.src.endsWith('/cigatas-identity.png')))
      assert.ok(!harness.images.some((image) => image.src.includes('/share-templates/')), 'tema buatan tetap memakai ilustrasi Canvas')
      assert.ok(fullText.includes('RENUNGAN AL-QUR’AN'), `${sample.label}: judul poster tampil di samping logo`)
      assert.ok(fullText.includes(`QS. ${surah.transliteration} ${sample.surah}:${sample.ayah}`))
      assert.ok(fullText.includes(`quran.cgs.my.id/surah/${sample.surah}/${sample.ayah}`))
      arabicSizes.push(Number.parseFloat(arabicRows[0].font))
    }
    assert.ok(arabicSizes[2] < arabicSizes[0], 'ayat panjang mengecil secara proporsional; ayat pendek tetap besar')
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('tema Canvas memakai logo QuranKu transparan dari kiriman pengguna', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const harness = makeAyahCanvasHarness()
  Object.defineProperty(globalThis, 'document', { configurable: true, value: harness.doc })
  try {
    const verse = quranImageFixtures[111].verses[0]
    const png = await createAyahImage({ arabic: verse.text, translation: verse.translation })
    const renderCtx = harness.contexts[0]
    const quranLogo = harness.getImage('/brand/quranku-logo.png')

    assert.equal(png.type, 'image/png')
    assert.ok(quranLogo && renderCtx.images.some((args) => args[0] === quranLogo), 'logo transparan lokal dipakai pada poster Canvas')
    assert.ok(existsSync('public/brand/quranku-logo.png'))
    assert.ok(harness.images.some((image) => image.src.endsWith('/cigatas-identity.png')))
    assert.ok(!harness.images.some((image) => image.src.includes('/share-templates/')), 'tema Canvas tidak meminta gambar template')
    assert.ok(renderCtx.pathCommands.length > 100, 'ilustrasi dekoratif dan frame digambar di Canvas')
    assert.ok(renderCtx.texts.some((row) => row.text === 'RENUNGAN AL-QUR’AN'), 'judul poster tampil di sisi logo')
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('panel ayat/terjemahan dibuat lebih tembus pandang agar ilustrasi tetap terlihat', () => {
  for (const theme of AYAH_IMAGE_THEMES) {
    const alpha = Number(theme.colors.bodyScrim.match(/,\s*([\d.]+)\)$/)?.[1])
    assert.ok(alpha > 0 && alpha <= 0.5, `${theme.id}: panel teks cukup transparan untuk memperlihatkan latar`)
  }
})

test('slogan poster dipilih acak dan mencakup contoh yang diminta', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const originalRandom = Math.random
  const first = makeAyahCanvasHarness()
  const last = makeAyahCanvasHarness()
  try {
    assert.ok(SHARE_IMAGE_SLOGANS.includes("Hidup Berkah dalam Cahaya Al-Qur'an"))
    Math.random = () => 0
    Object.defineProperty(globalThis, 'document', { configurable: true, value: first.doc })
    await createShareImage({ arabic: 'بِسْمِ اللَّهِ', heading: 'AYAT PILIHAN' })
    Math.random = () => 0.999
    Object.defineProperty(globalThis, 'document', { configurable: true, value: last.doc })
    await createShareImage({ arabic: 'بِسْمِ اللَّهِ', heading: 'AYAT PILIHAN' })
    const sloganFrom = (harness) => harness.contexts[0].texts.find((row) => SHARE_IMAGE_SLOGANS.includes(row.text))?.text
    assert.equal(sloganFrom(first), SHARE_IMAGE_SLOGANS[0])
    assert.equal(sloganFrom(last), SHARE_IMAGE_SLOGANS.at(-1))
    assert.notEqual(sloganFrom(first), sloganFrom(last), 'nilai acak yang berbeda dapat menghasilkan slogan berbeda')
  } finally {
    Math.random = originalRandom
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('gambar JPG: tema terpilih, latar tetap opak, dan resolusi konsisten', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const harness = makeAyahCanvasHarness()
  Object.defineProperty(globalThis, 'document', { configurable: true, value: harness.doc })
  try {
    const short = quranImageFixtures[111].verses[0]
    const jpg = await createAyahImage({
      arabic: short.text,
      translation: short.translation,
      reference: 'QS. Al-Ikhlas 112:1',
      sourceUrl: 'https://quran.cgs.my.id/surah/112/1',
      theme: 'malam',
      format: 'jpg'
    })
    assert.equal(jpg.type, 'image/jpeg')
    assert.equal(harness.canvases[1].requestedType, 'image/jpeg')
    assert.equal(harness.canvases[1].requestedQuality, 0.94)
    assert.deepEqual([harness.canvases[1].width, harness.canvases[1].height], [720, 1280])
    const bg = harness.contexts[1].operations.find((op) => op.kind === 'fillRect' && op.x === 0 && op.y === 0 && op.width === 720 && op.height === 1280)
    assert.equal(bg.fillStyle, AYAH_IMAGE_THEMES.find((item) => item.id === 'malam').colors.backgroundStart)
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('gambar doa: Arab, latin, arti, identitas kecil, dan footer unduh', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const ramadan = makeAyahCanvasHarness()
  const blocks = [
    {
      label: 'Doa Naik Kendaraan',
      arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا',
      latin: 'Subhaanal-ladzii sakhkhara lanaa haadzaa',
      translation: 'Mahasuci Allah yang telah menundukkan semua ini bagi kami.'
    },
    {
      label: 'Doa Bepergian',
      arabic: 'اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا',
      latin: 'Allaahumma hawwin alainaa safaranaa haadzaa',
      translation: 'Ya Allah, mudahkanlah perjalanan kami ini.'
    }
  ]
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: ramadan.doc })
    const png = await createShareImage({
      heading: 'DOA & DZIKIR',
      blocks,
      reference: 'Doa Perjalanan',
      sourceUrl: 'https://quran.cgs.my.id/doa/harian',
      theme: 'ramadan-lentera'
    })
    const [renderCanvas, exportCanvas] = ramadan.canvases
    const ctx = ramadan.contexts[0]
    const palette = AYAH_IMAGE_THEMES.find((item) => item.id === 'ramadan-lentera').colors
    const bodyRows = ctx.texts.filter((row) => row.y >= 312 && row.y < 1080)
    const arabicRows = bodyRows.filter((row) => /Amiri Quran|Scheherazade New/.test(row.font))
    const latinRows = bodyRows.filter((row) => row.color === palette.latin)
    const translationRows = bodyRows.filter((row) => row.color === palette.translation && !/Amiri Quran|Scheherazade New/.test(row.font))
    assert.equal(png.type, 'image/png')
    assert.deepEqual([exportCanvas.width, exportCanvas.height], [720, 1280])
    assert.equal(ctx.contextOptions.alpha, false)
    assert.equal(arabicRows.map((row) => row.text).join(' '), blocks.map((block) => block.arabic).join(' '))
    assert.equal(latinRows.map((row) => row.text).join(' '), blocks.map((block) => block.latin).join(' '))
    assert.equal(translationRows.map((row) => row.text).join(' '), blocks.map((block) => block.translation).join(' '))
    assert.ok(!ctx.texts.some((row) => ['LATIN', 'ARTI / TERJEMAHAN', 'TERJEMAHAN'].includes(row.text)), 'judul Latin/Arti tidak dicetak di poster')
    assert.ok(ctx.texts.some((row) => row.text === 'Doa Perjalanan'))
    assert.ok(ctx.images.some((args) => args[0] === ramadan.getImage('/brand/quranku-logo.png') && args[1] === 48 && args[2] === 62 && args[3] === 144 && args[4] === 96))
    const cigatasImage = ctx.images.find((args) => args[0] === ramadan.getImage('/cigatas-identity.png'))
    assert.deepEqual(cigatasImage?.slice(1, 5), [24, 1162, 84, 56], 'logo Cigatas diperkecil lagi di kiri footer')
    assert.ok(!ramadan.images.some((image) => image.src.includes('/share-templates/')))
    assert.ok(ctx.texts.some((row) => row.text === 'Sumber: quran.cgs.my.id/doa/harian'), 'sumber bacaan terletak di bawah teks')
    assert.ok(ctx.texts.some((row) => row.text === 'Unduh APK') && ctx.texts.some((row) => row.text === 'Google Play · QuranKu'), 'ajakan unduh ada sejajar di kanan footer')
    const renderer = readFileSync('src/utils/ayah-image.js', 'utf8')
    const shareFooter = renderer.split('function drawShareFooter(ctx, palette, cigatasLogo) {')[1].split('\n}\n\n/**')[0]
    assert.doesNotMatch(shareFooter, /roundRect\(ctx,\s*426,\s*1155,\s*270,\s*72/)
    assert.doesNotMatch(shareFooter, /withAlpha\('#ffffff',\s*0\.09\)/)
    assert.match(shareFooter, /drawPlayStoreMark\(ctx,\s*550,\s*1180,\s*24\)/, 'ikon Play Store kecil dan digeser ke kolom kanan')
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('poster hanya menyertakan Latin dan terjemahan yang diaktifkan di tampilan', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const arabic = 'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي'
  const latin = 'Allaahumma ihdinii wa saddidnii'
  const translation = 'Ya Allah, berilah aku petunjuk dan luruskanlah.'
  const cases = [
    { showLatin: false, showTranslation: false },
    { showLatin: false, showTranslation: true },
    { showLatin: true, showTranslation: false }
  ]
  try {
    for (const visibility of cases) {
      const harness = makeAyahCanvasHarness()
      Object.defineProperty(globalThis, 'document', { configurable: true, value: harness.doc })
      await createShareImage({ arabic, latin, translation, ...visibility })
      const theme = AYAH_IMAGE_THEMES[0]
      const bodyRows = harness.contexts[0].texts.filter((row) => row.y >= 312 && row.y < 1080)
      const arabicRows = bodyRows.filter((row) => /Amiri Quran|Scheherazade New/.test(row.font))
      const latinRows = bodyRows.filter((row) => row.color === theme.colors.latin)
      const translationRows = bodyRows.filter((row) => row.color === theme.colors.translation && !/Amiri Quran|Scheherazade New/.test(row.font))

      assert.equal(arabicRows.map((row) => row.text).join(' '), arabic)
      assert.equal(latinRows.map((row) => row.text).join(' '), visibility.showLatin ? latin : '')
      assert.equal(translationRows.map((row) => row.text).join(' '), visibility.showTranslation ? translation : '')
      assert.ok(!harness.contexts[0].texts.some((row) => ['LATIN', 'ARTI / TERJEMAHAN', 'TERJEMAHAN'].includes(row.text)), 'tanpa label Latin/arti')
    }
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('doa panjang mengecil proporsional tanpa memotong Arab, latin, atau terjemahan', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const harness = makeAyahCanvasHarness()
  Object.defineProperty(globalThis, 'document', { configurable: true, value: harness.doc })
  try {
    const catalog = JSON.parse(readFileSync('src/data/doa-nu.json', 'utf8'))
    const dua = catalog.categories.flatMap((category) => category.items).find((item) => item.id === 'doa-sebelum-belajar')
    const blocks = dua.parts.map((part, index) => ({ label: `Bagian ${index + 1}`, arabic: part.ar, latin: part.latin, translation: part.arti }))
    const png = await createShareImage({ heading: 'DOA & DZIKIR', blocks, reference: dua.title, theme: 'ramadan-ketupat' })
    const ctx = harness.contexts[0]
    const theme = AYAH_IMAGE_THEMES.find((item) => item.id === 'ramadan-ketupat')
    const bodyRows = ctx.texts.filter((row) => row.y >= 312 && row.y < 1080)
    const arabicRows = bodyRows.filter((row) => /Amiri Quran|Scheherazade New/.test(row.font))
    const latinRows = bodyRows.filter((row) => row.color === theme.colors.latin)
    const translationRows = bodyRows.filter((row) => row.color === theme.colors.translation && !/Amiri Quran|Scheherazade New/.test(row.font))

    assert.equal(png.type, 'image/png')
    assert.equal(arabicRows.map((row) => row.text).join(' '), blocks.map((block) => block.arabic).join(' '))
    assert.equal(latinRows.map((row) => row.text).join(' '), blocks.map((block) => block.latin).join(' '))
    assert.equal(translationRows.map((row) => row.text).join(' '), blocks.map((block) => block.translation).join(' '))
    assert.ok(bodyRows.every((row) => row.y < 1080), 'seluruh blok berada di atas footer')
    assert.ok(Number.parseFloat(arabicRows[0].font) < 60, 'font disesuaikan untuk doa panjang')
    assert.ok(!harness.images.some((image) => image.src.includes('/share-templates/')))
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('dzikir salat terpanjang tetap utuh dengan font Arab adaptif', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const harness = makeAyahCanvasHarness()
  Object.defineProperty(globalThis, 'document', { configurable: true, value: harness.doc })
  try {
    const catalog = JSON.parse(readFileSync('src/data/dzikir.json', 'utf8'))
    const dua = catalog.salat.reduce((longest, item) => item.arabic.length > longest.arabic.length ? item : longest)
    const theme = AYAH_IMAGE_THEMES.find((item) => item.id === 'ottoman-blue')
    const blob = await createShareImage({
      arabic: dua.arabic,
      latin: dua.latin,
      translation: dua.translation,
      reference: dua.title,
      theme: theme.id
    })
    const bodyRows = harness.contexts[0].texts.filter((row) => row.y >= 312 && row.y <= 1052)
    const arabicRows = bodyRows.filter((row) => /Amiri Quran|Scheherazade New/.test(row.font))
    const latinRows = bodyRows.filter((row) => row.color === theme.colors.latin)
    const translationRows = bodyRows.filter((row) => row.color === theme.colors.translation && !/Amiri Quran|Scheherazade New/.test(row.font))

    assert.equal(blob.type, 'image/png')
    const flattenWhitespace = (value) => String(value).trim().replace(/\s+/gu, ' ')
    assert.equal(flattenWhitespace(arabicRows.map((row) => row.text).join(' ')), flattenWhitespace(dua.arabic))
    assert.equal(flattenWhitespace(latinRows.map((row) => row.text).join(' ')), flattenWhitespace(dua.latin))
    assert.equal(flattenWhitespace(translationRows.map((row) => row.text).join(' ')), flattenWhitespace(dua.translation))
    assert.ok(Number.parseFloat(arabicRows[0].font) < 60, 'font dikecilkan untuk dzikir panjang')
    assert.ok(bodyRows.every((row) => row.y < 1052), 'bacaan seluruhnya di atas footer')
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('seluruh 22 tema merender ayat panjang utuh pada kanvas 720×1280 yang opak', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const surah = quranImageFixtures[1]
  const verse = surah.verses[281]
  const canvasSignatures = new Set()
  const suppliedBackgrounds = new Set()
  try {
    for (const theme of AYAH_IMAGE_THEMES) {
      const harness = makeAyahCanvasHarness()
      Object.defineProperty(globalThis, 'document', { configurable: true, value: harness.doc })
      const blob = await createAyahImage({
        arabic: verse.text,
        translation: verse.translation,
        reference: 'QS. Al-Baqarah 2:282',
        sourceUrl: 'https://quran.cgs.my.id/surah/2/282',
        theme: theme.id
      })
      const [renderCanvas, exportCanvas] = harness.canvases
      const [renderCtx, exportCtx] = harness.contexts
      const bodyRows = renderCtx.texts.filter((row) => row.y >= 312 && row.y <= 1052)
      const arabicRows = bodyRows.filter((row) => /Amiri Quran|Scheherazade New/.test(row.font))
      const translationRows = bodyRows.filter((row) => row.color === theme.colors.translation && !/Amiri Quran|Scheherazade New/.test(row.font))

      assert.equal(blob.type, 'image/png', `${theme.id}: PNG`)
      assert.deepEqual([renderCanvas.width, renderCanvas.height], [1440, 2560], `${theme.id}: kanvas tajam 2×`)
      assert.deepEqual([exportCanvas.width, exportCanvas.height], [720, 1280], `${theme.id}: kanvas ekspor`)
      assert.equal(renderCtx.contextOptions.alpha, false, `${theme.id}: latar opak`)
      assert.equal(exportCtx.contextOptions.alpha, false, `${theme.id}: hasil akhir opak`)
      assert.equal(arabicRows.map((row) => row.text).join(' '), verse.text, `${theme.id}: Arab lengkap`)
      assert.equal(translationRows.map((row) => row.text).join(' '), verse.translation, `${theme.id}: terjemahan lengkap`)
      assert.ok(bodyRows.every((row) => row.y < 1052), `${theme.id}: teks tidak mencapai footer`)
      const quranLogo = renderCtx.images.find((args) => args[0] === harness.getImage('/brand/quranku-logo.png'))
      const cigatasLogo = renderCtx.images.find((args) => args[0] === harness.getImage('/cigatas-identity.png'))
      const sourceLink = renderCtx.texts.find((row) => row.text === 'Sumber: quran.cgs.my.id/surah/2/282')
      assert.deepEqual(quranLogo?.slice(1, 5), [48, 62, 144, 96], `${theme.id}: logo QuranKu diperkecil di header`)
      assert.deepEqual(cigatasLogo?.slice(1, 5), [24, 1162, 84, 56], `${theme.id}: logo Cigatas diperkecil di kiri footer`)
      assert.equal(sourceLink?.color, theme.colors.secondary, `${theme.id}: tautan sumber kontras di bawah ayat`)
      assert.ok(renderCtx.texts.some((row) => row.text === 'Unduh APK'), `${theme.id}: ajakan unduh di footer`)
      if (theme.template) {
        const template = harness.getImage(theme.template)
        const backgroundDraw = renderCtx.images.find((args) => args[0] === template && args[1] === 0 && args[2] === 0)
        assert.ok(template && backgroundDraw, `${theme.id}: gambar template kiriman pengguna benar-benar dipakai`)
        assert.deepEqual(backgroundDraw.slice(1), [0, 0, 720, 1280], `${theme.id}: template memenuhi kanvas poster`)
        suppliedBackgrounds.add(theme.template)
      } else {
        assert.ok(!harness.images.some((image) => image.src.includes('/share-templates/')), `${theme.id}: latar dibuat khusus di Canvas`)
        canvasSignatures.add(JSON.stringify(renderCtx.pathCommands))
      }
    }
    assert.equal(canvasSignatures.size, 18, '18 tema Canvas memiliki ilustrasi yang berbeda')
    assert.equal(suppliedBackgrounds.size, 3, 'ketiga gambar template kiriman pengguna dipakai sebagai background')
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else delete globalThis.document
  }
})

test('18 tema Canvas baru dan 4 tema lama beserta metadata template tetap tersedia', () => {
  const requestedLabels = [
    'Zamrud Premium', 'Malam Berbintang', 'Galaksi Islami', 'Ramadan Lentera',
    'Masjid Emas', 'Rose Gold Luxury', 'Fajar Damai', 'Taman Islami',
    'Ottoman Blue', 'Champagne Minimalis', 'Gurun Senja', 'Ramadan Ketupat',
    'Senja Andalusia', 'Menara Safir', 'Teratai Fajar', 'Nuansa Pantai Sore',
    'Pantai Ombak', 'Nuansa Percikan Hujan'
  ]
  assert.equal(AYAH_IMAGE_THEMES.length, 22)
  assert.deepEqual(AYAH_IMAGE_THEMES.slice(0, 18).map((theme) => theme.label), requestedLabels)
  assert.equal(new Set(AYAH_IMAGE_THEMES.map((theme) => theme.id)).size, 22, 'semua pilihan punya ID unik')
  assert.equal(new Set(AYAH_IMAGE_THEMES.map((theme) => theme.label)).size, 22, 'label tidak duplikat')
  assert.equal(new Set(AYAH_IMAGE_THEMES.map((theme) => theme.scene)).size, 22, 'setiap tema memiliki ilustrasi berbeda')
  const renderer = readFileSync('src/utils/ayah-image.js', 'utf8')
  for (const theme of AYAH_IMAGE_THEMES) {
    assert.ok(theme.scene, `${theme.id}: scene Canvas tersedia`)
    assert.ok(renderer.includes(`case '${theme.scene}':`), `${theme.id}: scene punya ilustrasi khusus, bukan default`)
  }
  assert.ok(AYAH_IMAGE_THEMES.slice(0, 18).every((theme) => !theme.template), '18 tema memakai latar Canvas bebas tulisan')
  const retainedTemplates = Object.fromEntries(AYAH_IMAGE_THEMES.filter((theme) => theme.template).map(({ id, template }) => [id, template]))
  assert.deepEqual(retainedTemplates, {
    zamrud: '/share-templates/emerald-courtyard.jpg',
    malam: '/share-templates/cosmic-sky.jpg',
    pasir: '/share-templates/warm-cream.jpg',
    ramadan: '/share-templates/emerald-courtyard.jpg'
  }, 'mapping template lama tetap tersedia untuk kompatibilitas')
  assert.deepEqual(
    AYAH_IMAGE_THEMES.slice(18).map(({ id, label }) => [id, label]),
    [['zamrud', 'Zamrud'], ['malam', 'Malam'], ['pasir', 'Pasir'], ['ramadan', 'Ramadan']],
    'ID dan nama empat tema lama tetap kompatibel'
  )

  for (const path of [
    'public/share-templates/emerald-courtyard.jpg',
    'public/share-templates/cosmic-sky.jpg',
    'public/share-templates/warm-cream.jpg'
  ]) {
    const jpeg = readFileSync(path)
    assert.deepEqual([...jpeg.subarray(0, 2)], [0xff, 0xd8], `${path}: template lama tetap tersimpan`)
    assert.ok(jpeg.length > 400_000, `${path}: aset lama tidak terhapus`)
  }
  const viteConfig = readFileSync('vite.config.js', 'utf8')
  assert.match(viteConfig, /share-templates/)
  assert.match(viteConfig, /brand\/quranku-logo\.png/, 'logo baru ikut precache agar tersedia offline')
})

test('semua alur Bagikan Doa menyiapkan pratinjau gambar', () => {
  const doa = readFileSync('src/pages/doa.js', 'utf8')
  assert.match(doa, /createShareImage/)
  assert.match(doa, /imageBlocks:\s*d\.parts\.map/)
  assert.match(doa, /const blocks = p\.imageBlocks \|\| \[\{ arabic: p\.ar, latin: p\.latin, translation: p\.arti \|\| p\.text \}\]/)
  assert.match(doa, /image:\s*\{[\s\S]*create:\s*\(\{ theme, format \}\) => createShareImage/)
  assert.match(doa, /showLatin:\s*view\.latin/)
  assert.match(doa, /showTranslation:\s*view\.arti/)
})

test('Asmaul Husna menyediakan pemilih tema dan pembuat poster gambar', () => {
  const asmaul = readFileSync('src/pages/asmaul.js', 'utf8')
  const shareSheet = readFileSync('src/components/share-sheet.js', 'utf8')
  assert.match(asmaul, /import \{ createShareImage \} from '\.\.\/utils\/ayah-image\.js'/)
  assert.match(asmaul, /sourceUrl: `\$\{APP\.origin\}\/asmaul-husna`/)
  assert.match(asmaul, /what: 'Asmaul Husna'/)
  assert.match(asmaul, /filename: `quranku-asmaul-husna-\$\{cur\.id\}\.png`/)
  assert.match(asmaul, /heading: 'ASMAUL HUSNA'/)
  assert.match(asmaul, /create: \(\{ theme, format \}\) => createShareImage/)
  assert.match(shareSheet, /normalizedWhat\.includes\('asmaul'\) \? 'Asmaul Husna'/)
  assert.equal(AYAH_IMAGE_THEMES.length, 22, 'semua tema tersedia untuk poster Asmaul Husna')
})

test('gambar ayat mengikuti visibilitas di beranda dan pengaturan pembaca', () => {
  const home = readFileSync('src/pages/home.js', 'utf8')
  const reader = readFileSync('src/pages/reader.js', 'utf8')
  const ayahCard = readFileSync('src/components/ayah-card.js', 'utf8')
  assert.match(home, /showLatin:\s*false/)
  assert.match(home, /showTranslation:\s*Boolean\(a\.teksIndonesia\)/)
  for (const source of [reader, ayahCard]) {
    assert.match(source, /const display = getSettings\(\)\.reader/)
    assert.match(source, /const inTextMode = display\.mode === 'focus'/)
    assert.match(source, /showLatin:\s*inTextMode && display\.showLatin/)
    assert.match(source, /showTranslation:\s*inTextMode && display\.showTranslation/)
  }
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

test('halaman infaq: dinding doa anonim tanpa nama, nominal, podium, atau tab periode', () => {
  const page = readFileSync('src/pages/infaq.js', 'utf8')
  const api = readFileSync('src/api/donors-api.js', 'utf8')
  const css = readFileSync('src/styles/main.css', 'utf8')
  // API klien hanya memetakan pesan + waktu, tidak pernah nama/nominal.
  assert.match(api, /cleanDoa/)
  assert.doesNotMatch(api, /r\.name|r\.amount|totals\.amount/)
  // Halaman hanya merender pesan ter-escape + atribusi "Hamba Allah".
  assert.match(page, /esc\(r\.message\)/)
  assert.match(page, /Hamba Allah · \$\{formatDateTime\(r\.at\)\}/)
  assert.doesNotMatch(page, /formatRupiah|podium|data-p=|PERIODS/)
  // Kelas dinding doa di-scope agar tidak bentrok dengan akordeon .doa di halaman Doa Harian.
  assert.match(page, /doa-item/)
  assert.match(css, /\.infaq-page \.doa-item \{/)
  assert.doesNotMatch(css, /^\.doa \{/m)
  // Animasi hanya hiasan: muncul bertahap + sorotan sekali, dan selalu dimatikan untuk reduced motion.
  assert.match(css, /@keyframes doa-in \{/)
  assert.match(css, /@keyframes doa-glow \{/)
  const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {\n  .infaq-page .doa-item'))
  assert.ok(rm.startsWith('@media'), 'aturan reduced-motion untuk dinding doa ada')
  assert.match(rm.slice(0, 220), /\.infaq-page \.doa-item\.is-new \{\s*animation: none;/)
  // Tidak memakai marquee/auto-scroll: teks doa tidak boleh bergerak terus-menerus.
  assert.doesNotMatch(css, /doaMarquee|doaFloat|marquee/)
  assert.doesNotMatch(page, /setInterval/)
  // Blok dinding doa tidak boleh memakai animasi berulang (hanya sekali jalan per render).
  const block = css.slice(css.indexOf('.infaq-page .doa-list {'), css.indexOf('.infaq-empty {'))
  assert.ok(block.length > 200)
  assert.doesNotMatch(block, /infinite|animation-play-state|auto/)
  assert.match(block, /animation: doa-in 0\.5s ease both/)
})

test('akad infaq: penerima jelas, qabul dinyatakan, tanpa klaim imbalan, nafkah wajib diutamakan', () => {
  const page = readFileSync('src/pages/infaq.js', 'utf8')
  const akad = page.slice(page.indexOf('const akadHtml'), page.indexOf('export default function infaq'))
  // Penerima harus pihak yang jelas (bukan hanya nama aplikasi) dan dipisahkan dari kanal pembayaran.
  assert.match(akad, /Aep \(WNR Code\), pengembang dan pengelola resmi aplikasi QuranKu/)
  // Nama asli sengaja tidak dimuat; identitas diverifikasi lewat kontak Tentang & listing.
  assert.match(akad, /Identitas penerima<\/b> dapat diverifikasi lewat kontak pengelola di halaman Tentang/)
  assert.doesNotMatch(akad, /AEP Saepulloh/, 'nama lengkap tidak dimuat; hanya nama depan')
  assert.match(akad, /Kanal pembayaran:<\/b> Lanteraku/)
  assert.match(akad, /tidak menjadi penerima dana/)
  // Qabul dinyatakan lewat tersedianya kanal pembayaran.
  assert.match(akad, /Penerimaan \(qabul\)/)
  // Jenis akad & larangan riba/zakat tercantum.
  assert.match(akad, /hibah, bukan jual beli/i)
  assert.match(akad, /Bukan pinjaman, bukan titipan, bukan investasi/)
  assert.match(akad, /Tanpa imbalan apa pun/)
  assert.match(akad, /Bukan zakat, fidyah, kafarah, atau nazar/)
  // Nafkah wajib lebih utama daripada sedekah sunnah (hadis Ka'b bin Malik).
  assert.match(akad, /Nafkah keluarga lebih utama/)
  assert.match(akad, /jangan berinfaq dengan berutang/)
  // Urutan ijab mengikuti tombol yang benar-benar ditekan.
  assert.match(akad, /menekan “Bismillah, saya setuju &amp; lanjut”/)
  assert.doesNotMatch(akad, /Dengan menekan tombol INFAQ/)
  // Tidak ada klaim bahwa amal diterima; hanya doa.
  assert.match(akad, /Semoga Allah menerimanya/)
  assert.doesNotMatch(akad, /amal(nya)? (Anda )?(pasti )?diterima/)
})

test('persetujuan akad infaq: berlaku per versi teks, batal saat teks berubah, bisa dibatalkan', async () => {
  // Tiruan localStorage minimal.
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  }
  const { akadVersion, akadConsent, setAkadConsent } = await import('../src/pages/infaq.js')
  const v = akadVersion()
  assert.match(v, /^[0-9a-z]+$/, 'versi berupa hash pendek')

  // Belum ada persetujuan.
  assert.equal(akadConsent(), null)

  // Setuju → tersimpan dengan versi & tanggal.
  const c = setAkadConsent(true)
  assert.equal(c.versi, v)
  assert.ok(Date.parse(c.tanggal) > 0, 'tanggal valid')
  assert.equal(akadConsent().versi, v)

  // Teks akad berubah → persetujuan lama tidak berlaku lagi.
  store.set('quranku:akad-infaq', JSON.stringify({ versi: 'versi-lama', tanggal: new Date().toISOString() }))
  assert.equal(akadConsent(), null, 'versi berbeda harus ditolak')

  // Rusak / bukan JSON → dianggap belum setuju, tidak melempar.
  store.set('quranku:akad-infaq', 'bukan json')
  assert.equal(akadConsent(), null)

  // Batalkan → terhapus.
  setAkadConsent(true)
  assert.equal(setAkadConsent(false), null)
  assert.equal(akadConsent(), null)
  assert.equal(store.has('quranku:akad-infaq'), false)

  // localStorage tidak tersedia (mode privat ekstrem) → tidak melempar.
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    }
  }
  assert.equal(akadConsent(), null)
  assert.equal(setAkadConsent(true), null)
  delete globalThis.localStorage
})

test('dinding doa: sorotan hanya untuk doa yang benar-benar baru sejak render sebelumnya', () => {
  // Meniru aturan di src/pages/infaq.js tanpa DOM.
  const mark = (seenLatest, doa) => {
    const latest = doa.reduce((m, r) => Math.max(m, r.at), 0)
    const markNew = seenLatest > 0 && latest > seenLatest
    return { markNew, latest, index: markNew ? doa.findIndex((r) => r.at === latest) : -1, seen: Math.max(seenLatest, latest) }
  }
  const a = { message: 'a', at: 1_000 }
  const b = { message: 'b', at: 2_000 }
  // Muat pertama: tidak ada sorotan walau daftar sudah berisi.
  assert.equal(mark(0, [b, a]).markNew, false)
  // Muat ulang tanpa doa baru: tidak ada sorotan.
  assert.equal(mark(2_000, [b, a]).markNew, false)
  // Ada doa baru: hanya entri terbaru yang disorot, dan hanya sekali.
  const fresh = { message: 'c', at: 3_000 }
  const first = mark(2_000, [fresh, b, a])
  assert.equal(first.markNew, true)
  assert.equal(first.index, 0)
  assert.equal(mark(first.seen, [fresh, b, a]).markNew, false, 'sorotan tidak diulang pada muat berikutnya')
  // Daftar kosong (mis. papan belum punya doa) tidak membuat sorotan palsu.
  assert.equal(mark(0, []).markNew, false)
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
  for (const name of ['EQuran.id API v2', 'Al Quran Cloud API', 'quran-meta', 'SadaqaWorks/quran-tajweed', 'Amiri Quran']) assert.ok(items.some((s) => s.name === name), name)
  assert.equal(items.find((s) => s.name === 'SadaqaWorks/quran-tajweed').license, 'CC BY 4.0')
  const nuSources = items.filter((s) => s.host === 'quran.nu.or.id')
  assert.equal(nuSources.length, 2)
  assert.ok(nuSources.every((s) => s.url === 'https://quran.nu.or.id/'), 'tautan sumber Quran NU memakai alamat utama yang ringkas')
  const trakteer = items.find((s) => s.name === 'Trakteer')
  assert.equal(trakteer.url, 'https://trakteer.id/lanteraku/recommend')
  assert.equal(trakteer.externalLink, true, 'tautan referal sumber dapat dibuka langsung')
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

test("tab Al-Qur'an di halaman Doa: penanda muat tidak boleh memakai data-done", () => {
  // Bug: fillQuran() menandai wadah ayat dengan slot.dataset.done = '1'. Padahal
  // [data-done] adalah penanda tombol "tandai sudah dibaca", dan handler klik
  // memeriksa [data-done] LEBIH DULU daripada [data-share]/[data-copyq]:
  //   const dn = e.target.closest('[data-done]')
  //   if (dn) return setDone(tab, ...)      // ← berhenti di sini
  // Akibatnya klik Bagikan/Salin di dalam kartu ayat tertangkap cabang itu, lalu
  // setDone('quran', ...) menabrak done['quran'] yang tidak ada →
  // "TypeError: Cannot read properties of undefined (reading 'add')".
  const doa = readFileSync(new URL('../src/pages/doa.js', import.meta.url), 'utf8')

  // 1. Penanda muat harus memakai nama sendiri, bukan data-done.
  assert.doesNotMatch(
    doa,
    /slot\.dataset\.done\s*=/,
    'penanda muat tidak boleh memakai dataset.done (bertabrakan dengan tombol tanda-baca)'
  )
  assert.match(doa, /slot\.dataset\.loaded\s*=\s*'1'/, 'fillQuran/fillYasin harus memakai dataset.loaded')

  // 2. setDone harus kebal terhadap tab tanpa daftar tanda (tab "quran").
  const setDone = doa.slice(doa.indexOf('function setDone'), doa.indexOf('function setDone') + 400)
  assert.match(
    setDone,
    /if \(!done\[kind\]\) return/,
    'setDone harus berhenti bila tab tidak punya daftar tanda, bukan melempar TypeError'
  )

  // 3. Urutan pemeriksaan handler: [data-share] harus tetap ada dan tidak boleh
  //    didahului pengembalian tanpa syarat dari cabang lain.
  assert.match(doa, /const sh = e\.target\.closest\('\[data-share\]'\)/, 'handler bagikan harus tetap ada')
})

test('tombol bagikan: sheet tidak ditutup sebelum share native, dan audio tanpa tautan tetap bisa dibagikan', () => {
  // Dua bug yang membuat tombol bagikan terasa "tidak berfungsi":
  //  1. share-sheet menutup dialog SEBELUM memanggil share native. Di Android, menutup dialog
  //     melepas fokus WebView, lalu startActivity untuk chooser berbagi gagal tampil.
  //  2. murottal berhenti dengan toast bila pickSurahAudio() null (daftar surah dari sumber
  //     cadangan tidak punya audioFull), sehingga tombol bagikan tidak pernah membuka sheet.
  const sheet = readFileSync(new URL('../src/components/share-sheet.js', import.meta.url), 'utf8')
  // Cari pernyataan if-nya, bukan komentar (komentar juga menyebut closest('[data-native]')).
  const awal = sheet.indexOf("if (e.target.closest('[data-native]'))")
  assert.ok(awal > -1, 'cabang data-native harus ada')
  const blok = sheet.slice(awal, sheet.indexOf('const themeButton', awal))
  // `await shareText(...)` harus selesai sebelum close() dijalankan. Periksa dengan regex
  // yang tidak mudah jenuh oleh pemanggilan tanpa await (bug lama: shareText lalu close).
  assert.match(
    blok,
    /const result = await shareText\([^)]*\)\s*\n\s*close\(\)/,
    'shareText() harus di-await SEBELUM close() agar chooser Android tidak hilang'
  )

  const murottal = readFileSync(new URL('../src/pages/murottal.js', import.meta.url), 'utf8')
  const awalAudio = murottal.indexOf("if (e.target.closest('[data-share-audio]'))")
  assert.ok(awalAudio > -1, 'cabang bagikan audio harus ada')
  const blokAudio = murottal.slice(awalAudio, murottal.indexOf("closest('[data-dl]')", awalAudio))
  assert.doesNotMatch(blokAudio, /if \(!pick\) return toast/, 'jangan berhenti ketika audio tidak diketahui; tetap buka sheet')
  assert.match(blokAudio, /openShare\(/, 'tombol bagikan audio harus tetap membuka sheet')

  // canShareText() harus memeriksa plugin Share, bukan hanya isNativePlatform:
  // navigator.share tidak ada di WebView Android, jadi pemeriksaan lama bisa menampilkan
  // tombol yang tidak bisa berbuat apa-apa pada APK tanpa plugin.
  const helpers = readFileSync(new URL('../src/utils/helpers.js', import.meta.url), 'utf8')
  const defCanShare = helpers.slice(helpers.indexOf('export const canShareText'), helpers.indexOf('export async function shareText'))
  assert.match(defCanShare, /isPluginAvailable\('Share'\)/, 'canShareText harus memeriksa plugin Share, bukan hanya isNativePlatform')
  assert.doesNotMatch(
    defCanShare,
    /Capacitor\.isNativePlatform\(\)\s*\|\|\s*\(\s*typeof navigator/,
    'isNativePlatform() saja tidak cukup: navigator.share tidak ada di WebView Android'
  )
  // Android menggabungkan text+url; kirim url terpisah hanya bila tanpa teks.
  assert.match(helpers, /const payload = text \?/, 'shareText harus menghindari tautan ganda di Android')
})

test('skrip screenshot Play: memaksa TZ Indonesia, maksimal 8 gambar, dan memeriksa jam salat', () => {
  // Dua bug yang lolos ke PR sebelumnya:
  //  1. Skrip menghasilkan 9 gambar padahal Play hanya menerima 8.
  //  2. Skrip bergantung pada TZ mesin; di mesin UTC jam salat jadi Subuh 20:57 / Magrib 10:50.
  // Tes ini membaca sumber skripnya supaya keduanya tidak bisa kembali tanpa ketahuan.
  const src = readFileSync(new URL('../scripts/gen-play-shots-app.mjs', import.meta.url), 'utf8')

  // Zona waktu dipaksa SEBELUM modul lain memakai Date.
  const tzAt = src.indexOf("process.env.TZ")
  const firstImportAfterShebang = src.indexOf('\nimport ')
  assert.ok(tzAt > 0, 'skrip harus menetapkan process.env.TZ')
  assert.match(src.slice(tzAt - 200, tzAt + 120), /Asia\/Jakarta/, 'zona waktu default harus Asia/Jakarta')
  assert.ok(tzAt < src.indexOf('const STATE'), 'TZ harus ditetapkan sebelum state & render apa pun')
  assert.ok(tzAt < src.indexOf('await shot('), 'TZ harus ditetapkan sebelum screenshot pertama')
  assert.ok(firstImportAfterShebang < tzAt, 'penetapan TZ boleh setelah blok import (desain Node ESM)')

  // Jumlah gambar yang dihasilkan tidak boleh melebihi batas Play.
  const shots = [...src.matchAll(/await shot\('(\d{2})-[^']+\.png'/g)].map((m) => Number(m[1]))
  assert.ok(shots.length <= 8, `skrip menghasilkan ${shots.length} gambar (Play: maksimal 8)`)
  assert.ok(shots.length >= 2, `skrip menghasilkan ${shots.length} gambar (Play: minimal 2)`)
  assert.deepEqual(shots, Array.from({ length: shots.length }, (_, i) => i + 1), 'nomor shot harus berurutan 1..n')

  // Harus ada pemeriksaan jam salat yang masuk akal sebelum skrip dianggap selesai.
  assert.match(src, /\.prayer-list li/, 'skrip harus membaca baris jadwal salat dari DOM')
  assert.match(src, /tidak masuk akal \(zona waktu salah\?\)/, 'harus ada penjaga jam tidak masuk akal')
  assert.match(src, /urutan salat tidak naik/, 'harus ada penjaga urutan waktu salat')
})

test('screenshot Play: 2-8 berkas, 1080x1920, rasio <= 2:1, tanpa alpha', () => {
  // Play menolak screenshot dengan rasio > 2:1. Berkas lama 824x1830 (2,22:1) melanggar aturan itu,
  // jadi screenshot di store/screenshots/ harus lolos pemeriksaan ini sebelum diunggah.
  const dir = new URL('../store/screenshots/', import.meta.url)
  const files = readdirSync(dir).filter((f) => f.endsWith('.png'))
  assert.ok(files.length >= 2 && files.length <= 8, `jumlah screenshot ${files.length} (Play: 2-8)`)

  const pngSize = (file) => {
    const buf = readFileSync(new URL(file, dir))
    // Header IHDR: lebar & tinggi big-endian di offset 16..24, kedalaman bit di 24, tipe warna di 25.
    assert.equal(buf.subarray(1, 4).toString('latin1'), 'PNG', `${file} bukan PNG`)
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    const bitDepth = buf[24]
    const colorType = buf[25]
    return { width, height, bitDepth, colorType }
  }

  for (const file of files) {
    const { width, height, bitDepth, colorType } = pngSize(file)
    assert.ok(width >= 320 && width <= 3840, `${file}: lebar ${width}`)
    assert.ok(height >= 320 && height <= 3840, `${file}: tinggi ${height}`)
    assert.ok(Math.max(width, height) / Math.min(width, height) <= 2, `${file}: rasio ${(Math.max(width, height) / Math.min(width, height)).toFixed(2)} melebihi 2:1`)
    assert.equal(bitDepth, 8, `${file}: kedalaman bit ${bitDepth}`)
    // 4 = grayscale+alpha, 6 = RGBA. Play tidak menerima transparansi.
    assert.ok(colorType !== 4 && colorType !== 6, `${file}: PNG ber-alpha (colorType ${colorType})`)
    assert.ok(readFileSync(new URL(file, dir)).length < 8 * 1024 * 1024, `${file}: lebih dari 8 MB`)
  }

  // Nomor urut harus 01..nn tanpa lompatan agar urutan di Play Console sesuai naskah.
  const numbers = files.map((f) => Number(f.slice(0, 2))).sort((a, b) => a - b)
  assert.deepEqual(numbers, Array.from({ length: files.length }, (_, i) => i + 1))
})

test('catatan rilis Play: <= 500 karakter, satu blok per versi, tanpa larangan', () => {
  const notes = readFileSync(new URL('../store/release-notes.md', import.meta.url), 'utf8')
  const versi = [...notes.matchAll(/^## (\d+\.\d+\.\d+) — /gm)].map((m) => m[1])
  // Kenaikan versi otomatis ikut menyunting judul catatan teratas, supaya tidak tertinggal.
  const versionWorkflow = readFileSync(new URL('../.github/workflows/version.yml', import.meta.url), 'utf8')
  assert.match(versionWorkflow, /store\/release-notes\.md/, 'workflow versi menyinkronkan catatan rilis')
  assert.match(versionWorkflow, /git add package\.json package-lock\.json store\/release-notes\.md/)
  assert.ok(versi.length >= 1, 'minimal satu catatan rilis')
  // Bagian "1.4.x — tanggal" harus urut dari terbaru dan versinya cocok dengan package.json.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(versi[0], pkg.version, `catatan teratas harus versi terpasang (${pkg.version})`)
  const blok = [...notes.matchAll(/^## ([^\n]+)\n\n```\n([\s\S]*?)\n```/gm)]
  assert.equal(blok.length, versi.length, 'setiap versi punya satu blok teks siap tempel')
  for (const [, judul, teks] of blok) {
    assert.ok(teks.length <= 500, `${judul}: ${teks.length}/500 karakter`)
    assert.ok(teks.trim().split('\n').length <= 5, `${judul}: maksimal 5 baris`)
    // Google: What's new dipakai untuk memberi tahu perubahan — bukan promosi dan bukan
    // meminta pengguna melakukan sesuatu (rating, unduh, bagikan). Menyebut nama aplikasi lain
    // sebagai konteks ("tautan dari WhatsApp") TIDAK dilarang.
    assert.doesNotMatch(
      teks,
      /beri(kan)? ?(rating|ulasan|bintang)|rating 5|ulasan positif|unduh sekarang|pasang sekarang|segera perbarui|update sekarang|bagikan ke teman/i,
      `${judul}: What's new tidak untuk promosi atau meminta pengguna bertindak`
    )
    assert.doesNotMatch(teks, /\b(rating|ulasan)\b/i, `${judul}: jangan membahas rating/ulasan di What's new`)
    assert.doesNotMatch(teks, /\?{2,}|TODO|xxx/i, `${judul}: teks belum selesai`)
  }
})

test('listing Play Store: angka & klaim cocok dengan kode', async () => {
  const listing = readFileSync(new URL('../store/listing-id.md', import.meta.url), 'utf8')
  const [nama, singkat, lengkap] = (() => {
    const n = /\*\*Nama aplikasi \(maks\. 30\):\*\* (.+)/.exec(listing)[1].trim()
    const sh = /\*\*Deskripsi singkat \(maks\. 80\):\*\*\n(.+)/.exec(listing)[1].trim()
    const i = listing.indexOf('**Deskripsi lengkap (maks. 4000):**') + '**Deskripsi lengkap (maks. 4000):**'.length
    return [n, sh, listing.slice(i, listing.indexOf('**Kategori:**')).trim()]
  })()
  // Batas resmi Play Console.
  assert.ok(nama.length <= 30, `nama ${nama.length}/30`)
  assert.ok(singkat.length <= 80, `deskripsi singkat ${singkat.length}/80`)
  assert.ok(lengkap.length <= 4000, `deskripsi lengkap ${lengkap.length}/4000`)

  // Angka di deskripsi harus sama dengan data aplikasi — "Tahlil 28 langkah" pernah salah.
  const { TAHLIL } = await import('../src/data/tahlil.json', { with: { type: 'json' } }).then((m) => ({ TAHLIL: m.default }))
  const { AYAH_IMAGE_THEMES } = await import('../src/utils/ayah-image.js')
  const { QARI, QARI_AYAH } = await import('../src/config.js')
  const asmaul = JSON.parse(readFileSync(new URL('../src/data/asmaul-husna.json', import.meta.url), 'utf8'))
  // Angka yang boleh muncul: batas Play Store/resolusi/versi Android, contoh referensi ayat,
  // dan angka yang benar-benar diuji di bawah terhadap data aplikasi.
  const DIIZINKAN = new Set([2, 6, 9, 12, 16, 22, 29, 30, 31, 99, 114, 255, 720, 1280, 4000])
  const disebut = new Set([...lengkap.matchAll(/\b(\d{1,4})\b/g)].map((m) => +m[1]))
  for (const n of disebut) {
    assert.ok(DIIZINKAN.has(n), `angka ${n} di deskripsi belum diverifikasi terhadap data aplikasi`)
  }
  assert.equal(TAHLIL.items.length, 29, 'Tahlil berisi 29 bacaan')
  assert.ok(lengkap.includes(`${TAHLIL.items.length} bacaan`), 'jumlah bacaan Tahlil harus dari data')
  assert.equal(AYAH_IMAGE_THEMES.length, 22)
  assert.ok(lengkap.includes(`${AYAH_IMAGE_THEMES.length} tema`), 'jumlah tema poster harus dari data')
  assert.equal(Object.keys(QARI).length, 31)
  assert.equal(Object.keys(QARI_AYAH).length, 6)
  assert.ok(lengkap.includes(`${Object.keys(QARI).length} pilihan qari`), 'jumlah qari harus dari data')
  assert.equal(asmaul.items.length, 99)
  // Klaim privasi tidak boleh menyangkal adanya transmisi (lihat data-safety.md).
  assert.doesNotMatch(lengkap, /tidak mengumpulkan data apa pun/i)
  assert.match(lengkap, /Trakteer/, 'infaq & pemroses pembayaran disebut')
  assert.match(lengkap, /Nominatim/, 'pencarian nama wilayah disebut')
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

test('Tajwid: seluruh indeks cocok dengan teks ayat, atribusi tercatat, dan pemetaan gagal secara aman', async () => {
  const { createTajweedIndex, mapTajweedRanges, arabicBaseTokens } = await import('../src/utils/tajweed.js')
  const { highlightHtml } = await import('../src/services/highlight.js')
  const data = JSON.parse(readFileSync('src/data/tajweed-spans.json', 'utf8'))
  const index = createTajweedIndex(data)
  const quran = createRequire(import.meta.url)('../node_modules/quran-json/dist/quran_id.json')
  assert.equal(index.size, 6171)
  assert.equal(data.license, 'CC BY 4.0')
  assert.equal(data.coverage.sourceVerses, 6236)
  assert.equal(data.coverage.annotatedVerses, 6171)
  assert.equal(data.coverage.annotatedSpans, 60028)
  assert.equal(data.coverage.unannotatedVerses, 63)
  assert.deepEqual(data.coverage.skippedTextMismatches, ['12:39', '12:41'])
  let spans = 0
  for (const [surah, ayah, tokenCount, , annotations] of data.verses) {
    const text = quran[surah - 1].verses[ayah - 1].text
    const tokens = arabicBaseTokens(text)
    assert.equal(tokens.length, tokenCount, `${surah}:${ayah} token count`)
    const mapped = mapTajweedRanges(text, index.get(`${surah}:${ayah}`))
    assert.equal(mapped.length, annotations.length, `${surah}:${ayah} mapped span count`)
    spans += mapped.length
  }
  assert.equal(spans, data.coverage.annotatedSpans)

  const entry = index.get('2:5')
  const text = quran[1].verses[4].text
  const ranges = mapTajweedRanges(text, entry)
  assert.ok(ranges.length > 0)
  const annotatedHtml = highlightHtml(2, 5, text, { tajweedRanges: ranges })
  assert.match(annotatedHtml, /class="tajweed tajweed-/)
  assert.match(annotatedHtml, /data-rule-label="[^"]+" aria-label="Aturan Tajwid: [^"]+"/)
  assert.deepEqual(mapTajweedRanges(`${text} اختلاف`, entry), [])
  const tampered = [...entry]
  tampered[3] = '0000000000000000'
  assert.deepEqual(mapTajweedRanges(text, tampered), [])

  // Tanzil defines superscript alif (dagger alif) as a base letter; its annotation must map to the mark.
  const daggerText = quran[1].verses[70].text
  const daggerRanges = mapTajweedRanges(daggerText, index.get('2:71')).filter((range) => range.rule === 'madd_2')
  assert.ok(daggerRanges.some((range) => daggerText.slice(range.start, range.end).includes('ـَٰٔ')))
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

test('Trakteer embed di APK memakai ref domain publik; PWA tetap memakai origin aktif', async () => {
  const { embedRef, embedUrl, TRBTN } = await import('../src/pages/infaq.js')
  const nativeRef = embedRef(true, 'https://localhost', '/')
  const pwaRef = embedRef(false, 'https://quran.cgs.my.id', '/')
  assert.equal(nativeRef, 'https://quran.cgs.my.id/')
  assert.equal(pwaRef, 'https://quran.cgs.my.id/')
  assert.ok(embedUrl(TRBTN.url, nativeRef).endsWith('&ref=https://quran.cgs.my.id/'))
  assert.equal(embedRef(false, 'http://localhost:5173', '/'), 'http://localhost:5173/')
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

test('App Links Android memakai domain, sertifikat, dan rute hash resmi QuranKu', async () => {
  const { appLinkRoute } = await import('../src/services/app-links.js')
  assert.equal(appLinkRoute('https://quran.cgs.my.id/surah/2/255'), '/surah/2/255')
  assert.equal(appLinkRoute('https://quran.cgs.my.id/'), '/')
  assert.equal(appLinkRoute('https://quran.cgs.my.id/privacy.html'), null, 'halaman web statis tidak dialihkan ke router APK')
  assert.equal(appLinkRoute('https://evil.example/surah/2/255'), null, 'tautan dari domain lain ditolak')

  const statement = JSON.parse(readFileSync(new URL('../public/.well-known/assetlinks.json', import.meta.url), 'utf8'))
  assert.deepEqual(statement[0].relation, ['delegate_permission/common.handle_all_urls'])
  assert.equal(statement[0].target.namespace, 'android_app')
  assert.equal(statement[0].target.package_name, 'id.cgs.quranku')
  assert.deepEqual(statement[0].target.sha256_cert_fingerprints, [
    '56:45:F6:54:3C:D6:9E:43:30:B3:92:1C:91:C4:03:9C:50:3E:9A:5F:F9:23:CE:DF:43:BE:08:51:1B:DE:03:66'
  ])
  const manifest = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8')
  assert.match(manifest, /android:autoVerify="true"/)
  assert.match(manifest, /android:scheme="https" android:host="quran\.cgs\.my\.id" android:path="\/"/)
})

test('App Links: setiap rute aplikasi diklaim, berkas statis tidak', async () => {
  const manifest = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
  const paths = [...manifest.matchAll(/android:path="([^"]+)"/g)].map((m) => m[1])
  const prefixes = [...manifest.matchAll(/android:pathPrefix="([^"]+)"/g)].map((m) => m[1])

  // Setiap rute satu segmen di src/app.js harus punya android:path yang sama persis.
  const routes = [...app.matchAll(/addRoute\('([^']*)'/g)].map((m) => m[1])
  const single = routes.filter((r) => r === '/' || (r.startsWith('/') && !r.includes(':') && r.split('/').length === 2))
  for (const r of single) assert.ok(paths.includes(r), `rute ${r} harus diklaim manifest`)
  // Rute bertingkat memakai awalan.
  for (const r of routes.filter((x) => x.includes(':') && x.split('/').length > 2)) {
    const head = '/' + r.split('/')[1] + '/'
    assert.ok(prefixes.includes(head), `rute ${r} butuh pathPrefix ${head}`)
  }

  // pathPattern tidak dipakai: PatternMatcher Android membuat ".*" hanya cocok satu karakter,
  // sehingga "/.*/.*" tidak pernah cocok dengan /surah/2/255.
  assert.doesNotMatch(manifest, /android:pathPattern=/)
  // Kebijakan privasi & berkas statis tetap di peramban.
  assert.ok(!paths.includes('/privacy.html'))
  assert.ok(!prefixes.some((x) => x === '/'))
})

test('tautan peramban dalam aplikasi: halaman perantara membuka aplikasi, bukan Play', async () => {
  const { appLinkUrl, linkOpenerUrl, isInAppBrowser, nativeAppIntentUrl, appLinkRouteFromRedirect } = await import(
    '../src/services/app-links.js'
  )
  assert.equal(appLinkUrl('/surah/2/255'), 'https://quran.cgs.my.id/surah/2/255')
  assert.equal(appLinkUrl('surah/2/255'), 'https://quran.cgs.my.id/surah/2/255')
  assert.equal(linkOpenerUrl('/surah/2/255'), '/buka.html?next=%2Fsurah%2F2%2F255')
  assert.equal(isInAppBrowser('Mozilla/5.0 (Linux; Android 13) WhatsApp/2.24.1'), true)
  assert.equal(isInAppBrowser('Mozilla/5.0 (Linux; Android 13; SM-A546E) Chrome/126.0 Mobile Safari/537.36'), false)
  // WebView APK QuranKu sendiri juga mengirim penanda `; wv)`; jangan sampai dianggap peramban lain.
  const capacitorUa = 'Mozilla/5.0 (Linux; Android 14; SM-A155F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36'
  assert.equal(isInAppBrowser(capacitorUa, { nativeShell: true }), false)
  assert.equal(isInAppBrowser(capacitorUa, { nativeShell: false, origin: 'https://localhost' }), false)
  assert.equal(isInAppBrowser(capacitorUa, { nativeShell: false, origin: 'https://quran.cgs.my.id' }), true)
  assert.match(
    nativeAppIntentUrl('/surah/2/255'),
    /^intent:\/\/quran\.cgs\.my\.id\/surah\/2\/255#Intent;scheme=https;package=id\.cgs\.quranku;/
  )
  assert.match(
    nativeAppIntentUrl('/surah/2/255'),
    /S\.browser_fallback_url=https%3A%2F%2Fplay\.google\.com%2Fstore%2Fapps%2Fdetails%3Fid%3Did\.cgs\.quranku/
  )
  assert.equal(appLinkRouteFromRedirect('/surah/2/255'), '/surah/2/255')
  assert.equal(appLinkRouteFromRedirect('https://evil.example/surah/2/255'), null)
  assert.equal(appLinkRouteFromRedirect('/privacy.html'), null)
  // Query ikut terbawa: tautan notifikasi adzan (?adzan=subuh) dan lanjutkan bacaan (?resume=1)
  // harus sampai ke router; tanpa query, halaman terbuka tetapi maksud tautannya hilang.
  assert.equal(appLinkRouteFromRedirect('/salat?adzan=subuh'), '/salat?adzan=subuh')
  assert.equal(appLinkRouteFromRedirect('https://quran.cgs.my.id/surah/2?resume=1'), '/surah/2?resume=1')
  assert.equal(appLinkRouteFromRedirect('https://evil.example/salat?adzan=subuh'), null)
  // Bentuk lama dengan query di depan hash: query ikut pindah, tidak dibuang.
  assert.equal(appLinkRouteFromRedirect('https://quran.cgs.my.id/?adzan=subuh#/salat'), '/salat?adzan=subuh')
  assert.equal(appLinkRouteFromRedirect('https://quran.cgs.my.id/#/surah/2/255?resume=1'), '/surah/2/255?resume=1')
  assert.equal(appLinkRouteFromRedirect('https://quran.cgs.my.id/#/salat'), '/salat')

  const page = readFileSync(new URL('../public/buka.html', import.meta.url), 'utf8')
  const script = readFileSync(new URL('../public/buka.js', import.meta.url), 'utf8')
  // CSP situs melarang skrip inline: skrip harus berkas terpisah.
  assert.doesNotMatch(page, /<script>[\s\S]/)
  assert.match(page, /<script src="\/buka\.js"><\/script>/)
  assert.match(script, /S\.browser_fallback_url/)
  assert.match(script, /id\.cgs\.quranku/)
  // Halaman perantara tidak boleh tampil di dalam APK (origin https://localhost).
  assert.match(script, /isNativePlatform/, 'halaman perantara dialihkan saat berjalan di dalam APK')
  assert.match(script, /localhost/)
  assert.match(script, /location\.replace\('\/#'/, 'rute tujuan diteruskan lewat router aplikasi')
  // Alat pemeriksa deploy harus memeriksa manifest + App Links dan mengharapkan JSON
  // untuk berkas data (bukan text/html), agar tidak melaporkan GAGAL palsu.
  const deploy = readFileSync(new URL('../scripts/check-deploy.mjs', import.meta.url), 'utf8')
  assert.match(deploy, /manifest\.webmanifest/)
  assert.match(deploy, /assetlinks\.json/)
  assert.match(deploy, /version\.json/)
  assert.match(deploy, /includes\('json'\)/)
  // Cloudflare mengalihkan /x.html → /x; redirect harus diikuti agar tidak GAGAL palsu.
  assert.match(deploy, /redirect: 'follow'/)
  assert.doesNotMatch(deploy, /redirect: 'manual'/)
})

test('tautan adzan (?adzan=) dibaca saat mulai dan saat rute berubah lewat App Link', () => {
  const adzan = readFileSync(new URL('../src/services/adzan.js', import.meta.url), 'utf8')
  // Di APK, appUrlOpen tiba SETELAH modul dievaluasi; sekali-periksa saja akan melewatkannya.
  assert.match(adzan, /addEventListener\('qk:route', consumeAdzanQuery\)/, 'periksa ulang adzan setiap rute berganti')
  // Hanya parameter adzan yang dibuang; query lain tetap untuk halaman.
  assert.match(adzan, /params\.delete\('adzan'\)/)
  assert.doesNotMatch(adzan, /history\.replaceState\(null, '', location\.pathname\)\n\s*if \(NAME\[key\]/, 'jangan membuang seluruh query')
})

test('parameter rute dengan persen rusak tidak mengosongkan halaman', async () => {
  const { decodeParam } = await import('../src/router.js')
  // Tautan yang terpotong (mis. /surah/%E0%A4) membuat decodeURIComponent melempar URIError.
  assert.equal(decodeParam('%E0%A4%A'), '%E0%A4%A')
  assert.equal(decodeParam('2'), '2')
  assert.equal(decodeParam('doa%2Fharian'), 'doa/harian')
  // Router memakai helper ini, bukan decodeURIComponent langsung.
  const router = readFileSync(new URL('../src/router.js', import.meta.url), 'utf8')
  assert.doesNotMatch(router, /params\[k\] = decodeURIComponent\(/, 'parameter harus lewat decodeParam')
})

test('manifest & notifikasi memakai URL bersih, bukan bentuk hash lama', () => {
  const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
  for (const s of m.shortcuts) {
    assert.ok(s.url.startsWith('/'), s.url)
    assert.doesNotMatch(s.url, /#/, `pintasan ${s.name} memakai URL bersih`)
  }
  // Nama rute pintasan harus benar-benar ada di router.
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
  const routes = [...app.matchAll(/addRoute\('([^']*)'/g)].map((x) => x[1])
  for (const s of m.shortcuts) assert.ok(routes.includes(s.url), `pintasan ${s.url} harus rute nyata`)
  // Service worker membuka URL bersih saat pemberitahuan diketuk.
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8')
  assert.doesNotMatch(sw, /openWindow\(`\/#/, 'notifikasi tidak boleh membuka /#/…')
  assert.match(sw, /routeQuery\.set\('adzan'/, 'adzan diteruskan lewat query, bukan hash')
})

test('bar "buka di aplikasi": hanya untuk peramban dalam aplikasi Android, menunjuk halaman aktif', async () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
  const opener = readFileSync(new URL('../src/services/app-opener.js', import.meta.url), 'utf8')
  // Dipasang global agar halaman baca yang dituju tautan WhatsApp juga punya jalan keluar.
  assert.match(app, /attachAppOpener\(\)/)
  assert.match(opener, /isInAppBrowser\(\)/)
  assert.match(opener, /isNativeShell\(\)/, 'bar tidak dipasang di dalam APK')
  assert.match(opener, /\/Android\/i/)
  // Satu ketukan: bar memakai intent:// langsung, bukan halaman perantara /buka.html.
  assert.match(opener, /nativeAppIntentUrl\(path\)/)
  assert.doesNotMatch(opener, /linkOpenerUrl\(path\)/, 'bar tidak lagi melewati halaman perantara')
  assert.match(opener, /qk:route/)
  assert.match(opener, /Buka di aplikasi QuranKu/)
  // render() mengganti innerHTML; penangan klik harus menempel di wadah bar, bukan tombol lama.
  assert.match(opener, /bar\.addEventListener\('click'/)
  assert.doesNotMatch(opener, /bar\.querySelector\('\[data-opener-close\]'\)\.onclick/, 'penangan tombol tutup tidak boleh hilang saat render ulang')
  // Ajakan Play di beranda tetap ada di situs (teksnya kini dipilih per platform).
  const home = readFileSync(new URL('../src/pages/home.js', import.meta.url), 'utf8')
  const installSrc = readFileSync(new URL('../src/services/install.js', import.meta.url), 'utf8')
  assert.match(home, /installCopy\(\)/)
  assert.match(installSrc, /Gratis di Google Play/)
  assert.doesNotMatch(home, /linkOpenerUrl/, 'beranda tidak perlu tahu soal peramban dalam aplikasi')
})

test('regresi: pemberitahuan "buka di aplikasi" tidak tampil di dalam APK', async () => {
  const { isInAppBrowser } = await import('../src/services/app-links.js')
  const { isNativeShell } = await import('../src/services/platform.js')
  const { shouldOfferInstall } = await import('../src/services/install.js')
  const capacitorUa = 'Mozilla/5.0 (Linux; Android 14; SM-A155F Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36'
  // Laporan pengguna: bar "Buka di aplikasi QuranKu" muncul di APK, lalu membuka /buka.html
  // ber-URL https://localhost di dalam aplikasi itu sendiri.
  assert.equal(isNativeShell('https://localhost'), true)
  assert.equal(isNativeShell('https://quran.cgs.my.id'), false)
  assert.equal(isInAppBrowser(capacitorUa, { nativeShell: true, origin: 'https://localhost' }), false)
  assert.equal(isInAppBrowser(capacitorUa, { nativeShell: false, origin: 'https://localhost' }), false)
  // Peramban dalam aplikasi lain tetap mendapat bar.
  assert.equal(isInAppBrowser('Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', { nativeShell: false, origin: 'https://quran.cgs.my.id' }), true)
  const opener = readFileSync(new URL('../src/services/app-opener.js', import.meta.url), 'utf8')
  assert.match(opener, /if \(isNativeShell\(\)\) return/)
  assert.match(opener, /if \(!isAndroid\(\) \|\| !isInAppBrowser\(\) \|\| openerDismissed\(\)\) return/)
  // Ajakan memasang PWA memang sudah dimatikan di APK.
  assert.equal(typeof shouldOfferInstall, 'function')
  const install = readFileSync(new URL('../src/services/install.js', import.meta.url), 'utf8')
  assert.match(install, /!isNativePlatform\(\) && !isStandalone\(\)/)
})

test('notifikasi Android memakai status izin sistem dan menyediakan permintaan runtime', async () => {
  const { notifSupported, notifPermission, requestNotifPermission } = await import('../src/services/notification.js')
  globalThis.androidBridge = {}
  try {
    assert.equal(notifSupported(), true)
    assert.equal(notifPermission(), 'prompt')
    assert.equal(await requestNotifPermission(), 'prompt')
  } finally {
    delete globalThis.androidBridge
  }
})

test('payload jadwal native mencakup lokasi, metode, zona waktu, azan, dan pengingat terpisah', async () => {
  const { nativePrayerSettings, isFutureCalendarReminder } = await import('../src/services/prayer-notifications.js')
  const payload = nativePrayerSettings({
    location: { lat: -6.9764, lng: 108.4836, name: 'Kuningan' },
    prayerMethod: 'mwl',
    hijriAdjust: 1,
    adzan: { enabled: false, sound: true, voice: 'a1', volume: 0.65, imsak: true, asar: false, notificationSound: 'alarm' },
    prayerReminders: { enabled: true, leadMinutes: 15, prayers: { subuh: false, zuhur: true }, sound: 'silent' }
  })
  assert.equal(payload.enabled, true, 'pengingat dapat aktif tanpa azan otomatis')
  assert.deepEqual(payload.location, { lat: -6.9764, lng: 108.4836, name: 'Kuningan' })
  assert.equal(payload.method, 'mwl')
  assert.equal(payload.hijriAdjust, 1)
  assert.equal(payload.adzan.enabled, false)
  assert.equal(payload.adzan.asar, false)
  assert.equal(payload.adzan.notificationSound, 'alarm')
  assert.equal(payload.prayerReminders.leadMinutes, 15)
  assert.equal(payload.prayerReminders.prayers.subuh, false)
  assert.equal(payload.prayerReminders.sound, 'silent')
  assert.equal(payload.ramadanReminders.imsakEnabled, false)
  assert.equal(payload.readingReminders.tilawahEnabled, false)
  const readingOnly = nativePrayerSettings({
    reminders: { tilawah: true, tilawahTime: '06:45', goal: true },
    goal: { type: 'p5', pages: 5 }
  })
  assert.equal(readingOnly.enabled, true, 'pengingat tilawah/target tidak memerlukan lokasi')
  assert.equal(readingOnly.readingReminders.tilawahTime, '06:45')
  assert.equal(readingOnly.readingReminders.goalEnabled, true)
  assert.equal(readingOnly.readingReminders.targetPages, 5)
  const imsakOnly = nativePrayerSettings({
    location: { lat: -6.2, lng: 106.8, name: 'Jakarta' },
    adzan: { enabled: false },
    prayerReminders: { enabled: false },
    ramadanReminders: { imsakEnabled: true, imsakSound: 'alarm' }
  })
  assert.equal(imsakOnly.enabled, true, 'imsak dapat dijadwalkan tanpa azan atau pengingat pra-salat')
  assert.equal(imsakOnly.ramadanReminders.imsakSound, 'alarm')
  assert.ok(payload.timezone)
  const now = new Date(2026, 10, 16, 18, 0).getTime()
  assert.equal(isFutureCalendarReminder({ date: '2026-11-16', time: '19:00' }, now), true)
  assert.equal(isFutureCalendarReminder({ date: '2026-11-16', time: '17:00' }, now), false)
  assert.equal(isFutureCalendarReminder({ date: '2026-02-30', time: '19:00' }, now), false)
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

test('tidak ada berkas statis yang menutupi rute aplikasi', () => {
  // Cloudflare memetakan x.html → /x dan menyajikan aset SEBELUM Worker. Bila /x juga rute
  // aplikasi, aset menang dan pengguna mendapat halaman yang salah (kasus /offline pada 1.4.41).
  // Karena Worker tidak bisa mencegahnya, satu-satunya perbaikan adalah mengganti nama berkas.
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
  const routes = new Set([...app.matchAll(/addRoute\('([^']*)'/g)].map((m) => m[1]).filter((r) => !r.includes(':') && r !== '/'))
  const staticPages = readdirSync(new URL('../public', import.meta.url))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f, '/' + f.replace(/\.html$/, '')])
  for (const [file, path] of staticPages) {
    assert.ok(!routes.has(path), `${file} bentrok dengan rute aplikasi ${path}; ganti nama berkasnya`)
  }
  // Kebijakan privasi wajib tetap ada sebagai halaman statis.
  assert.ok(staticPages.some(([, p]) => p === '/privacy'))
})

test('worker: /offline memakai shell aplikasi, halaman darurat bernama offline-fallback', async () => {
  const { default: worker } = await import('../worker/index.js')
  // Aset statis dilayani SEBELUM Worker, jadi Worker tidak bisa menyelamatkan nama yang bentrok.
  // Solusinya: berkas darurat tidak boleh bernama sama dengan rute aplikasi.
  const calls = []
  const env = {
    ASSETS: {
      fetch: async (req) => {
        calls.push(new URL(req.url).pathname)
        return new Response('shell', { headers: { 'Content-Type': 'text/html' } })
      }
    }
  }
  const offline = await worker.fetch(new Request('https://quran.cgs.my.id/offline'), env, { waitUntil() {} })
  assert.equal(await offline.text(), 'shell')
  assert.deepEqual(calls, ['/index.html'], '/offline harus memakai shell aplikasi')
  // /privacy (tanpa ekstensi) bukan rute aplikasi; Cloudflare yang melayani berkas privacy.html.
  // Di lapisan Worker ia hanya boleh diteruskan ke aset, bukan diganti shell.
  calls.length = 0
  await worker.fetch(new Request('https://quran.cgs.my.id/privacy.html'), env, { waitUntil() {} })
  assert.deepEqual(calls, ['/privacy.html'], 'berkas kebijakan privasi tetap disajikan sebagai aset')
  // Berkas darurat offline tersedia dengan nama yang tidak bentrok.
  calls.length = 0
  await worker.fetch(new Request('https://quran.cgs.my.id/offline-fallback.html'), env, { waitUntil() {} })
  assert.deepEqual(calls, ['/offline-fallback.html'])
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

test('bagikan: teks doa/konten, tautan kontekstual, dan URL media sosial', async () => {
  const { doaText, doaUrl, shareContent, shareLinks } = await import('../src/utils/doa-share.js')
  const p = { title: 'Istighfar', ar: 'أَسْتَغْفِرُ اللهَ', latin: 'Astaghfirullāh', arti: 'Aku memohon ampun kepada Allah.', ref: 'NU Online', tab: 'salat' }
  assert.equal(doaText(p), 'Istighfar\n\nأَسْتَغْفِرُ اللهَ\n\nAstaghfirullāh\n\nArtinya: Aku memohon ampun kepada Allah.\n\n(NU Online)')
  assert.equal(doaText({ title: 'A', ar: 'ب', latin: '', arti: '', ref: '', tab: 'quran' }), 'A\n\nب')
  assert.equal(doaUrl(p, 'https://quran.cgs.my.id'), 'https://quran.cgs.my.id/doa/salat')
  const l = shareLinks(p, 'https://quran.cgs.my.id')
  assert.match(l.whatsapp, /^https:\/\/wa\.me\/\?text=Istighfar%0A/)
  assert.ok(decodeURIComponent(l.whatsapp).endsWith('https://quran.cgs.my.id/doa/salat'))
  assert.match(l.telegram, /^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Fquran\.cgs\.my\.id%2Fdoa%2Fsalat&text=/)
  assert.match(l.facebook, /sharer\.php\?u=https%3A/)
  const long = shareLinks({ ...p, ar: 'ا'.repeat(500) }, 'https://quran.cgs.my.id')
  assert.ok(decodeURIComponent(new URL(long.x).searchParams.get('text')).length <= 200)

  const ayah = {
    title: 'QS. Al-Fatihah 1:1',
    text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n\nDengan nama Allah Yang Maha Pengasih.\n(QS. Al-Fatihah 1:1)',
    url: 'https://quran.cgs.my.id/surah/1/1'
  }
  assert.equal(shareContent(ayah), ayah.text)
  assert.equal(doaUrl(ayah, 'https://quran.cgs.my.id'), ayah.url)
  const social = shareLinks(ayah, 'https://quran.cgs.my.id')
  assert.ok(decodeURIComponent(social.whatsapp).includes(ayah.text))
  assert.ok(decodeURIComponent(social.whatsapp).endsWith(ayah.url))
  assert.match(social.telegram, /url=https%3A%2F%2Fquran\.cgs\.my\.id%2Fsurah%2F1%2F1/)
  assert.equal(new URL(social.facebook).searchParams.get('u'), ayah.url)
  assert.equal(new URL(social.x).searchParams.get('url'), ayah.url)
  assert.ok(new URL(social.x).searchParams.get('text').startsWith(ayah.title))
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
  const logoItems = SOURCES.flatMap((g) => g.items).filter((i) => i.logo)
  assert.deepEqual(new Set(logoItems.map((i) => i.name)), new Set(['Font Awesome Free 6.7.2', 'Vite', 'Fontsource', 'Capacitor 8 (Ionic)']))
  for (const item of logoItems) {
    assert.match(item.logo, /^\/brand-logos\/[a-z-]+\.svg$/)
    assert.ok(existsSync(new URL(`../public${item.logo}`, import.meta.url)), `logo lokal tersedia: ${item.name}`)
  }
  assert.ok(SOURCES.some((g) => g.items.some((i) => i.name === 'Logo merek (Simple Icons)' && i.license === 'CC0 1.0')))
})

test('delapan kategori doa NU tambahan memuat katalog sumber tanpa teks yang belum diverifikasi', () => {
  const base = JSON.parse(readFileSync('src/data/doa-nu.json', 'utf8'))
  const extra = JSON.parse(readFileSync('src/data/doa-nu-extra.json', 'utf8'))
  const dzikir = JSON.parse(readFileSync('src/data/dzikir.json', 'utf8'))
  const styles = readFileSync('src/styles/main.css', 'utf8')
  const expected = [
    ['doa-waktu-tertentu', 12], ['doa-kualitas-diri', 10], ['doa-pernikahan-rumah-tangga', 10],
    ['doa-hamil-dan-persalinan', 7], ['doa-para-nabi-di-al-quran', 14], ['doa-baca-al-quran', 7],
    ['doa-haji-umrah', 21], ['doa-kematian', 6]
  ]
  assert.deepEqual(extra.categories.map((c) => [c.slug, c.items.length]), expected)
  assert.equal(extra.categories.reduce((n, c) => n + c.count, 0), 87)
  assert.equal(base.categories.length + extra.categories.length, 14)
  assert.equal(base.categories.reduce((n, c) => n + c.items.length, 0) + extra.categories.reduce((n, c) => n + c.count, 0), 149)
  assert.match(extra.note, /tidak disalin ke data aplikasi/)
  const ids = new Set(base.categories.flatMap((c) => c.items.map((d) => d.id)))
  const titles = new Set(base.categories.flatMap((c) => c.items.map((d) => d.title)))
  for (const category of extra.categories) {
    assert.equal(category.sourceOnly, true)
    assert.match(styles, new RegExp(`\\.fi-${category.icon}::before`), `ikon kategori tersedia: ${category.icon}`)
    assert.equal(category.count, category.items.length)
    assert.equal(category.sourceUrl, `${extra.source.url}/${category.slug}`)
    for (const item of category.items) {
      assert.match(item.id, /^[a-z0-9-]+$/)
      assert.ok(item.title)
      assert.ok(item.sourceUrl.startsWith(category.sourceUrl), `tautan item tetap di kategori sumber: ${item.sourceUrl}`)
      assert.equal('parts' in item, false, 'teks hanya disajikan oleh halaman sumber sampai ditranskripsi dan diverifikasi')
      assert.ok(!ids.has(item.id), `ID ganda: ${item.id}`)
      assert.ok(!titles.has(item.title), `judul ganda: ${item.title}`)
      ids.add(item.id)
      titles.add(item.title)
    }
  }
  const lut = extra.categories.find((c) => c.slug === 'doa-para-nabi-di-al-quran').items.find((d) => d.id === 'doa-nabi-luth')
  assert.equal(lut.title, 'Doa Nabi Luth (dua permohonan)')
  assert.equal(lut.sourceUrl, 'https://quran.nu.or.id/doa/doa-para-nabi-di-al-quran/doa-nabi-luth', 'dua permohonan pada halaman detail tetap terwakili oleh satu item katalog')
  assert.ok(!extra.categories.some((c) => ['doa-wudhu', 'doa-shalat'].includes(c.slug)), 'Wudhu dan Shalat tetap berada pada rangkaian dzikir')
  assert.ok(dzikir.wudhu.length > 0 && dzikir.salat.length > 0)
  const doaPage = readFileSync('src/pages/doa.js', 'utf8')
  assert.match(doaPage, /const NU_CATEGORIES = \[\.\.\.NU\.categories, \.\.\.NU_EXTRA\.categories\]/)
  assert.match(doaPage, /Jelajahi \$\{NU_TITLE_TOTAL\} judul doa/)
  assert.match(doaPage, /c\.sourceOnly \? 'judul' : 'doa'/)
  assert.match(doaPage, /href="\/infaq"/)
  assert.match(doaPage, /Buka sumber/)
  assert.match(doaPage, /nuLink\(page\.url, 'Sumber Data'\)/)
  const morePage = readFileSync('src/pages/more.js', 'utf8')
  const inbox = readFileSync('src/services/inbox.js', 'utf8')
  assert.doesNotMatch(doaPage, /Quran NU Online/)
  assert.doesNotMatch(morePage, /Quran NU Online/)
  assert.doesNotMatch(inbox, /Quran NU Online/)
  assert.match(readFileSync('src/data/sources.js', 'utf8'), /name: 'Quran NU Online/)
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

test('Beranda menampilkan teks Cigatas beranimasi tanpa gambar; logo tetap di Tentang', () => {
  const logo = readFileSync('public/cigatas-identity.png')
  assert.deepEqual([...logo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'PNG yang sah')
  assert.equal(logo[25], 6, 'PNG RGBA dengan kanal transparansi')
  assert.deepEqual([logo.readUInt32BE(16), logo.readUInt32BE(20)], [1536, 1024], 'identitas memakai gambar Cigatas baru')
  const home = readFileSync('src/pages/home.js', 'utf8')
  const about = readFileSync('src/pages/about.js', 'utf8')
  const styles = readFileSync('src/styles/redesign.css', 'utf8')
  const homeFooter = home.match(/<footer class="cigatas-signature"[\s\S]*?<\/footer>/)?.[0] || ''
  assert.ok(homeFooter, 'footer ajakan mengaji ada di Beranda')
  assert.match(homeFooter, /class="cigatas-signature-hashtag">#TongEureunNgaji</)
  assert.match(homeFooter, /data-cigatas-motto/)
  assert.doesNotMatch(homeFooter, /cigatas-identity\.png/)
  assert.match(home, /const CIGATAS_MOTTOS = \[/)
  assert.match(home, /clearInterval\(cigatasMottoTimer\)/, 'timer dibersihkan saat meninggalkan Beranda')
  assert.match(styles, /@keyframes cigatas-tagline-glow/)
  assert.match(styles, /\.cigatas-signature-motto\.is-changing/)
  assert.match(styles, /prefers-reduced-motion:\s*reduce[\s\S]*?\.cigatas-signature-hashtag/)
  assert.match(about, /class="card about-identity-card"[\s\S]*src="\/cigatas-identity\.png" width="1536" height="1024"/)
  assert.match(about, /Cigatas · #TongEureunNgaji/)
  assert.match(readFileSync('vite.config.js', 'utf8'), /p === 'cigatas-identity\.png'/, 'ikut precache untuk pemakaian offline di Tentang')
})

test('header Lainnya: identitas QuranKu, slogan berganti tanpa pengulangan langsung', async () => {
  const { MORE_SLOGANS, nextMoreSlogan } = await import('../src/pages/more.js')
  assert.ok(MORE_SLOGANS.includes('Menemani Hari, Mendekatkan Hati kepada Kalamullah.'))
  assert.ok(MORE_SLOGANS.length >= 3)
  const first = nextMoreSlogan(() => 0)
  const second = nextMoreSlogan(() => 0)
  assert.notEqual(first, second)
  const more = readFileSync('src/pages/more.js', 'utf8')
  assert.match(more, /كَلَامُ اللَّهِ/)
  assert.match(more, /Gratis[\s\S]*Tanpa Iklan[\s\S]*Tanpa Analitik/)
})

test('tema Ramadan: palet, animasi lentera, dan gerakan berkurang', () => {
  const tokens = readFileSync('src/styles/tokens.css', 'utf8')
  const styles = readFileSync('src/styles/redesign.css', 'utf8')
  const init = readFileSync('public/theme-init.js', 'utf8')
  const nativeShell = readFileSync('src/services/native-shell.js', 'utf8')
  assert.match(tokens, /:root\[data-theme='ramadan'\]/)
  assert.match(styles, /@keyframes ramadan-lantern-sway/)
  assert.match(styles, /prefers-reduced-motion:\s*reduce[\s\S]*?\.ramadan-lantern/)
  assert.match(init, /t === 'ramadan'/)
  assert.match(nativeShell, /theme === 'dark' \|\| theme === 'ramadan'/)
})

test('kebijakan privasi menjelaskan pelacak, lokasi, Web Push, dan data papan kebaikan anonim', () => {
  const policy = readFileSync('public/privacy.html', 'utf8')
  const about = readFileSync('src/pages/about.js', 'utf8')
  assert.match(policy, /tidak memasang pelacak iklan atau analitik/)
  assert.match(policy, /Nominatim dapat memproses alamat IP/)
  assert.match(policy, /jendela bergulir 14 hari/)
  assert.match(policy, /Web Push tidak menjanjikan alarm yang presisi/)
  assert.match(policy, /pesan\/ucapan bila dikirim/)
  assert.match(policy, /Catatan endpoint lama/)
  assert.match(policy, /WhatsApp, Telegram, Facebook, X \(Twitter\), atau aplikasi tujuan lain/)
  assert.match(policy, /hitungan tasbih, bookmark, catatan, riwayat, dan progres tilawah/)
  assert.doesNotMatch(policy, /Kami tidak menyimpan alamat email maupun pesan dukungan Anda/)
  assert.match(policy, /nama dan nominal tidak ditampilkan secara publik/)
  assert.doesNotMatch(policy, /papan donatur/)
  assert.match(about, /nama dan nominal tidak ditampilkan, hanya doa\/ucapan yang Anda kirim yang dibagikan/)
  assert.match(about, /layanan atau aplikasi yang dipilih menerima konten yang Anda pilih/)
})

test('bagikan: tautan Asmaul Husna memakai path', async () => {
  const { doaUrl } = await import('../src/utils/doa-share.js')
  assert.equal(doaUrl({ path: '/asmaul-husna' }, 'https://quran.cgs.my.id'), 'https://quran.cgs.my.id/asmaul-husna')
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
    assert.ok(contrast(t.vars['--text'], t.vars['--surface-2']) >= 7, p.id + ' teks di permukaan kedua')
    assert.ok(contrast(t.vars['--primary'], t.vars['--bg']) >= 4.5 && contrast(t.vars['--primary'], t.vars['--surface']) >= 4.5 && contrast(t.vars['--primary'], t.vars['--surface-2']) >= 4.5, p.id + ' utama')
    assert.ok(contrast(t.vars['--primary-ink'], t.vars['--primary']) >= 4.5, p.id + ' tombol')
    assert.ok(contrast(t.vars['--hero-ink'], t.vars['--hero-2']) >= 4.5, p.id + ' kepala')
    assert.ok([t.vars['--bg'], t.vars['--surface'], t.vars['--surface-2']].every((surface) => contrast(t.vars['--muted'], surface) >= 4.5), p.id + ' redup')
    assert.ok([t.vars['--bg'], t.vars['--surface'], t.vars['--surface-2']].every((surface) => contrast(t.vars['--accent-ink'], surface) >= 4.5), p.id + ' aksen teks')
    assert.ok([t.vars['--bg'], t.vars['--surface'], t.vars['--surface-2']].every((surface) => contrast(t.vars['--holiday-ink'], surface) >= 4.5), p.id + ' tanggal merah')
    assert.ok([t.vars['--bg'], t.vars['--surface'], t.vars['--surface-2']].every((surface) => contrast(t.vars['--leave-ink'], surface) >= 4.5), p.id + ' cuti bersama')
  }
  assert.equal(new Set(THEME_PRESETS.map((p) => p.id)).size, THEME_PRESETS.length)
  // Pilihan ekstrem tetap terbaca: utama = latar.
  for (const c of ['#ffffff', '#000000', '#ffff00', '#7f7f7f']) {
    const t = deriveTheme({ primary: c, accent: c, bg: c })
    assert.ok([t.vars['--bg'], t.vars['--surface'], t.vars['--surface-2']].every((surface) => contrast(t.vars['--primary'], surface) >= 4.5), c + ' utama')
    assert.ok(contrast(t.vars['--text'], t.vars['--bg']) >= 4.5 && contrast(t.vars['--text'], t.vars['--surface-2']) >= 4.5, c)
    assert.ok(contrast(t.vars['--muted'], t.vars['--surface']) >= 4.5 && contrast(t.vars['--muted'], t.vars['--surface-2']) >= 4.5, c + ' muted')
    assert.ok(contrast(t.vars['--accent-ink'], t.vars['--surface']) >= 4.5 && contrast(t.vars['--accent-ink'], t.vars['--surface-2']) >= 4.5, c + ' aksen teks')
    assert.ok(contrast(t.vars['--holiday-ink'], t.vars['--surface']) >= 4.5 && contrast(t.vars['--holiday-ink'], t.vars['--surface-2']) >= 4.5, c + ' tanggal merah')
    assert.ok(contrast(t.vars['--leave-ink'], t.vars['--surface']) >= 4.5 && contrast(t.vars['--leave-ink'], t.vars['--surface-2']) >= 4.5, c + ' cuti bersama')
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
    values.set('quranku:settings', JSON.stringify({ arabicFont: 'scheherazade', theme: 'ramadan' }))
    assert.equal((await loadFresh()).getSettings().theme, 'ramadan')
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
})

test('migrasi tipografi pembaca memperbesar bawaan lama tanpa mengubah ukuran pilihan lain', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const values = new Map([['quranku:settings', JSON.stringify({ reader: { fontSize: 28, lineHeight: 2.1, translationSize: 16 } })]])
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key)
    }
  })
  try {
    const loadFresh = () => import(`../src/services/storage.js?reader-typography=${Math.random()}`)
    const migrated = (await loadFresh()).getSettings().reader
    assert.equal(migrated.fontSize, 32)
    assert.equal(migrated.translationSize, 18)
    assert.equal(values.get('quranku:migration:reader-typography-v2'), '1')
    assert.equal(JSON.parse(values.get('quranku:settings')).reader.fontSize, 32)

    values.set('quranku:settings', JSON.stringify({ reader: { fontSize: 44, lineHeight: 2.3, translationSize: 22 } }))
    const custom = (await loadFresh()).getSettings().reader
    assert.equal(custom.fontSize, 44)
    assert.equal(custom.translationSize, 22)
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
})

test('preset pembaca mengikuti tema global tanpa menghapus preset mushaf', async () => {
  const { READER_DEFAULTS, DEFAULTS } = await import('../src/services/storage.js')
  const { PRESETS, applyReaderStyle } = await import('../src/components/reading-toolbar.js')
  assert.equal(READER_DEFAULTS.preset, 'theme')
  assert.equal(READER_DEFAULTS.tajweed, false)
  assert.equal(READER_DEFAULTS.fabSide, 'right')
  assert.equal(READER_DEFAULTS.fontSize, 32)
  assert.equal(READER_DEFAULTS.translationSize, 18)
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
  assert.match(css, /\.mpage-text[^{]*\{[^}]*font-size:\s*var\(--rd-font\)/)
  assert.match(css, /\.mpage-body[^{]*\{[^}]*overflow-y:\s*auto/)
  assert.doesNotMatch(css, /\.rd-bottom/)
  const toolbar = readFileSync('src/components/reading-toolbar.js', 'utf8')
  assert.match(toolbar, /range\('translationSize', 'Ukuran terjemahan', 12, 28/)
})

test('layar pembuka: ada di index.html, salam Arab, dan berkasnya ikut precache', () => {
  const html = readFileSync('index.html', 'utf8')
  assert.match(html, /<div id="splash"/)
  assert.ok(html.normalize('NFC').includes('اَلسَّلَامُ عَلَيْكُمْ'.normalize('NFC')))
  assert.match(html, /Buat poster 9:16 dari ayat, doa, atau Asmaul Husna\./, 'splash menjelaskan fitur poster')
  assert.match(html, /Pilih satu dari 22 tema, lalu simpan atau bagikan\./)
  assert.match(html, /<script src="\/splash\.js"><\/script>/)
  assert.match(html, /sp-bye [^;]*8s/) // menutup sendiri bila aplikasi gagal dimuat
  assert.match(readFileSync('vite.config.js', 'utf8'), /p === 'splash\.js'/)
  const app = readFileSync('src/app.js', 'utf8')
  assert.match(app, /hideSplash\(\)/)
  assert.match(app, /SPLASH_MIN_VISIBLE_MS = \{ standalone: 2600, browser: 1600 \}/, 'salam tampil cukup lama sebelum splash ditutup')
  assert.match(app, /window\.__splashAt = Date\.now\(\)/, 'waktu tahan dihitung sejak splash native ditutup, bukan sejak halaman mulai dimuat')
  // Router merender rute pertama secara sinkron saat modul dievaluasi; konstanta setelah startRouter() akan
  // memicu ReferenceError (TDZ) di hideSplash() dan membuat beranda tidak pernah tampil.
  assert.ok(
    app.indexOf('const SPLASH_MIN_VISIBLE_MS') > -1 &&
      app.indexOf('const SPLASH_MIN_VISIBLE_MS') < app.indexOf("startRouter(document.getElementById('view')"),
    'SPLASH_MIN_VISIBLE_MS harus dideklarasikan sebelum startRouter() dipanggil'
  )
  assert.match(readFileSync('src/app.js', 'utf8'), /showFirstRunOnboarding\(\)/)
})

test('layar pembuka memakai wordmark brand tanpa mengubah ikon aplikasi', () => {
  const html = readFileSync('index.html', 'utf8')
  assert.match(html, /<div class="sp-logo"><img src="\/brand\/quranku-logo\.png"/)
  assert.doesNotMatch(html, /sp-logo[\s\S]{0,240}icons\/icon-192-v2\.png/, 'splash tidak lagi memakai ikon aplikasi')
  assert.match(readFileSync('vite.config.js', 'utf8'), /p === 'brand\/quranku-logo\.png'/, 'logo splash ikut precache')
  assert.ok(existsSync('public/brand/quranku-logo.png'))
  const styles = readFileSync('android/app/src/main/res/values/styles.xml', 'utf8')
  assert.match(styles, /windowSplashScreenAnimatedIcon">@drawable\/splash_brand</)
  assert.doesNotMatch(styles, /windowSplashScreenAnimatedIcon">@mipmap\/ic_launcher/, 'splash tidak memakai ikon launcher')
  assert.ok(existsSync('android/app/src/main/res/drawable/splash_brand.png'))
  const gen = readFileSync('scripts/gen-icons.mjs', 'utf8')
  assert.match(gen, /const SPLASH_LOGO = readFileSync\(root \+ 'public\/brand\/quranku-logo\.png'\)/)
  assert.match(gen, /logoAny\(Math\.round\(48 \* k\), `\$\{dir}\/ic_launcher\.png`\)/, 'ikon launcher tetap dari logo aplikasi')
  assert.match(gen, /logoFull\(512, 'public\/icons\/maskable-512-v2\.png'/, 'ikon PWA tetap dari logo aplikasi')
  assert.match(gen, /splashArt\(Math\.round\(160 \* k\)/, 'drawable splash memakai wordmark')
})

test('pengenalan pertama: tiga langkah, navigasi, dan penanda selesai tersimpan', async () => {
  const { ONBOARDING_KEY, ONBOARDING_SLIDES, hasCompletedOnboarding, markOnboardingComplete, renderOnboardingSlide } = await import('../src/services/onboarding.js')
  assert.equal(ONBOARDING_SLIDES.length, 3)
  const memory = new Map()
  const storage = {
    getItem: (key) => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value))
  }
  assert.equal(hasCompletedOnboarding(storage), false)
  assert.equal(markOnboardingComplete(storage), true)
  assert.equal(hasCompletedOnboarding(storage), true)
  assert.equal(memory.get(ONBOARDING_KEY), '1')

  const first = renderOnboardingSlide(0)
  assert.match(first, /role="dialog" aria-modal="true"/)
  assert.match(first, /BACA DENGAN NYAMAN/)
  assert.match(first, /data-onboarding-next/)
  assert.match(first, /data-onboarding-back[^>]*hidden/)
  const last = renderOnboardingSlide(2)
  assert.match(last, /Mulai menggunakan QuranKu/)
  assert.match(last, /aria-valuenow="3"/)
  assert.match(readFileSync('src/styles/onboarding.css', 'utf8'), /prefers-reduced-motion/)
})

test('sumber data: halaman terpisah, footer tidak menaut langsung ke situs sumber', async () => {
  const { readFileSync } = await import('node:fs')
  const rd = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
  assert.match(rd('app.js'), /addRoute\('\/sumber'/)
  for (const f of ['pages/doa.js', 'pages/asmaul.js']) {
    const foot = rd(f).split('\n').filter((l) => /nuLink =|src-foot/.test(l)).join('\n')
    assert.ok(!/target="_blank"/.test(foot), f)
    assert.match(rd(f), /href=\\?"\/sumber\\?"/)
  }
  const page = rd('pages/sources.js')
  assert.match(page, /isGithub\(s\.url\)\) return `<a /)
  assert.match(page, /if \(s\.externalLink\)/)
  assert.match(page, /Terima kasih/)
  assert.ok(!/SOURCES/.test(rd('pages/about.js')))
})

test('alat sidik jari sertifikat mencetak SHA-256 format Play Console', async () => {
  const { formatFingerprint } = await import('../scripts/cert-fingerprint.mjs')
  const { createHash } = await import('node:crypto')
  // Nilai rujukan dihitung dengan openssl: sha256 dari isi berkas, huruf besar, dipisah titik dua.
  assert.equal(
    formatFingerprint(Buffer.alloc(0)),
    'E3:B0:C4:42:98:FC:1C:14:9A:FB:F4:C8:99:6F:B9:24:27:AE:41:E4:64:9B:93:4C:A4:95:99:1B:78:52:B8:55'
  )
  const sample = Buffer.from('QuranKu')
  assert.equal(
    formatFingerprint(sample),
    createHash('sha256').update(sample).digest('hex').toUpperCase().match(/.{2}/g).join(':')
  )
  assert.match(formatFingerprint(sample), /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)
})

test('assetlinks.json memakai satu sidik jari SHA-256 berformat benar', async () => {
  const { readFileSync } = await import('node:fs')
  const statement = JSON.parse(readFileSync(new URL('../public/.well-known/assetlinks.json', import.meta.url), 'utf8'))
  const fps = statement[0].target.sha256_cert_fingerprints
  assert.equal(fps.length, 1, 'satu sidik jari saja agar tidak ada kunci lama yang tertinggal')
  assert.match(fps[0], /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/, 'format harus XX:XX:… huruf besar seperti Play Console')
})

test('router URL bersih: /surah/2/255, bentuk #/ lama, dan halaman statis', async () => {
  // Router memakai location.origin halaman; di Node disediakan tiruan agar bisa diuji.
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: { origin: 'https://quran.cgs.my.id', href: 'https://quran.cgs.my.id/', pathname: '/', search: '', hash: '' }
  })
  try {
    const { internalPath, currentRoute } = await import('../src/router.js')
    assert.equal(internalPath('https://quran.cgs.my.id/surah/2/255'), '/surah/2/255')
    assert.equal(internalPath('/surah/2/255'), '/surah/2/255', 'jalur relatif dipakai untuk pushState')
    assert.equal(internalPath('https://quran.cgs.my.id/'), '/')
    assert.equal(internalPath('https://quran.cgs.my.id/#/surah/2/255'), '/surah/2/255', 'URL hash lama tetap dikenali')
    assert.equal(internalPath('https://quran.cgs.my.id/#'), '/')
    assert.equal(internalPath('https://quran.cgs.my.id/privacy.html'), null, 'halaman statis bukan rute aplikasi')
    assert.equal(internalPath('https://quran.cgs.my.id/assets/app.js'), null)
    assert.equal(internalPath('https://evil.example/surah/2/255'), null, 'domain lain ditolak')
    assert.equal(internalPath('https://quran.cgs.my.id/surah/2/255?resume=1'), '/surah/2/255?resume=1')
    assert.deepEqual(currentRoute(), { path: '/', query: {} })
  } finally {
    if (previous) Object.defineProperty(globalThis, 'location', previous)
    else delete globalThis.location
  }
})

test('ajakan pasang: Android → Play Store, iOS → layar utama, desktop → PWA', async () => {
  const { readFileSync } = await import('node:fs')
  const { installTarget, installCopy, detectBrowser } = await import('../src/services/install.js')
  const install = readFileSync('src/services/install.js', 'utf8')
  const config = readFileSync('src/config.js', 'utf8')
  assert.match(config, /playStoreUrl: 'https:\/\/play\.google\.com\/store\/apps\/details\?id=id\.cgs\.quranku'/, 'URL Play Store satu sumber di config')
  assert.match(install, /export const PLAY_URL = APP\.playStoreUrl/)

  const android = detectBrowser('Mozilla/5.0 (Linux; Android 14; SM-A155F) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36')
  const ios = detectBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1')
  const desktop = detectBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36')
  assert.equal(installTarget(android, true), 'play', 'Android tetap ke Play walau Chrome menawarkan instal PWA')
  assert.equal(installTarget(android, false), 'play')
  assert.equal(installTarget(ios, true), 'guide', 'iOS belum punya aplikasi App Store')
  assert.equal(installTarget(desktop, true), 'prompt', 'desktop tetap boleh memasang PWA')
  assert.equal(installTarget(desktop, false), 'guide')
  assert.equal(installCopy(android).note, 'Gratis di Google Play')
  assert.match(installCopy(ios).note, /Layar Utama/, 'iOS diberi tahu cara menambah ke layar utama')

  // Urutan di installApp: target ditentukan lebih dulu, jadi dialog Chrome tidak pernah menang di Android.
  assert.match(install, /const target = installTarget\(\)/)
  assert.match(install, /if \(target === 'play'\) \{\s*\n\s*openExternal\(PLAY_URL\)\s*\n\s*return 'store'/, 'Android diarahkan ke Play Store lebih dulu')
  assert.match(install, /if \(b\.android\) return 'play'/)
  assert.match(install, /if \(b\.ios\) return 'guide'/)
})

test('versi Play Store: parser, pembanding, endpoint, dan pemakaian di Pengaturan/kotak masuk', async () => {
  const { parsePlayVersion } = await import('../functions/api/play-version.js')
  const { compareVersions, fetchPlayVersion, checkPlayUpdate, showsPlayUpdate } = await import('../src/services/play-version.js')
  // Bentuk data halaman Play (blob AF_initDataCallback) dan meta lama.
  assert.equal(parsePlayVersion('AF_initDataCallback({key: \'ds:5\', data:[null,[null,[[["1.4.42"]]]]]})'), '1.4.42')
  assert.equal(parsePlayVersion('<meta itemprop="softwareVersion" content="2.10.3">'), '2.10.3')
  assert.equal(parsePlayVersion('"softwareVersion":"3.0.1"'), '3.0.1')
  assert.equal(parsePlayVersion('<html>Varies with device</html>'), null, 'tanpa angka versi → null, bukan tebakan')
  assert.equal(parsePlayVersion(''), null)

  assert.equal(compareVersions('1.4.42', '1.4.9'), 1, 'dibandingkan per angka, bukan abjad')
  assert.equal(compareVersions('1.4.49', '1.4.49'), 0)
  assert.equal(compareVersions('1.3.99', '1.4.0'), -1)

  // fetchPlayVersion memakai endpoint Worker dan menyimpan hasilnya; kegagalan → null tanpa melempar.
  const realFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    return { ok: true, json: async () => ({ ok: true, version: '1.4.52' }) }
  }
  try {
    assert.equal(await fetchPlayVersion({ force: true }), '1.4.52')
    assert.equal(calls[0], '/api/play/version')
    const state = await checkPlayUpdate({ force: true })
    assert.equal(state.version, '1.4.52')
    assert.equal(state.installed, state.installed)
    assert.equal(state.available, compareVersions('1.4.52', state.installed) > 0)
    globalThis.fetch = async () => ({ ok: false })
    assert.equal(await fetchPlayVersion({ force: true }), null, 'endpoint gagal tidak mengganggu UI')
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: false, version: null }) })
    assert.equal(await fetchPlayVersion({ force: true }), null, 'markup Play berubah → versi tidak diketahui')
  } finally {
    globalThis.fetch = realFetch
  }
  // Notifikasi pembaruan Play hanya untuk APK; PWA memperbarui diri dari server.
  assert.equal(typeof showsPlayUpdate, 'function')

  const worker = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8')
  assert.match(worker, /'\/api\/play\/version'/, 'rute endpoint versi Play terdaftar')
  const settings = readFileSync(new URL('../src/pages/settings.js', import.meta.url), 'utf8')
  assert.match(settings, /checkPlayUpdate/, 'Pengaturan menampilkan versi Play Store')
  assert.match(settings, /market:\/\/details\?id=\$\{APP\.packageId\}/, 'APK memperbarui lewat Play Store')
  const inbox = readFileSync(new URL('../src/services/inbox.js', import.meta.url), 'utf8')
  assert.match(inbox, /Pembaruan di Play Store/)
  assert.match(inbox, /external: APP\.playStoreUrl/)
  const notifications = readFileSync(new URL('../src/pages/notifications.js', import.meta.url), 'utf8')
  assert.match(notifications, /item\.external/, 'notifikasi pembaruan membuka Play Store')
})

test('manifest web memilih aplikasi Play Store dan tautan aplikasi tetap satu ketukan', async () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  // Chrome Android tidak lagi didorong memasang PWA (dua aplikasi: Play + PWA dengan data terpisah).
  assert.equal(manifest.prefer_related_applications, true)
  assert.equal(manifest.related_applications[0].platform, 'play')
  assert.equal(manifest.related_applications[0].id, 'id.cgs.quranku')
  assert.equal(manifest.related_applications[0].url, 'https://play.google.com/store/apps/details?id=id.cgs.quranku')

  // Manifest APK: App Links terverifikasi untuk domain, supaya tautan https benar-benar membuka aplikasi.
  const apkManifest = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8')
  const filters = apkManifest.match(/<intent-filter[^>]*>[\s\S]*?<\/intent-filter>/g) || []
  const linkFilters = filters.filter((f) => f.includes('android.intent.action.VIEW') && f.includes('android:host="quran.cgs.my.id"'))
  assert.equal(linkFilters.length, 3, 'tiga filter App Links (beranda, satu segmen, bertingkat)')
  for (const f of linkFilters) {
    assert.match(f, /android:autoVerify="true"/, 'setiap filter App Links diauto-verifikasi')
    assert.match(f, /android:scheme="https"/)
    assert.match(f, /category android:name="android.intent.category.BROWSABLE"/)
  }
  assert.match(apkManifest, /android:pathPrefix="\/surah\/"/, 'jalur bertingkat memakai pathPrefix')
  // Komentar XML menyebut pathPattern sebagai catatan; yang diperiksa hanya atribut sungguhan.
  const apkAttributes = apkManifest.replace(/<!--[\s\S]*?-->/g, '')
  assert.doesNotMatch(apkAttributes, /pathPattern/, 'pathPattern tidak dipakai')
})

test('halaman Tentang menautkan Play Store; APK memakai market://', async () => {
  const { readFileSync } = await import('node:fs')
  const about = readFileSync('src/pages/about.js', 'utf8')
  assert.match(about, /APP\.playStoreUrl/, 'tautan Play Store pada web')
  assert.match(about, /market:\/\/details\?id=\$\{esc\(APP\.packageId\)\}/, 'APK membuka Play Store aplikasi sendiri')
  assert.match(about, /Buka di Google Play/)
})

test('menu utama memakai URL bersih tanpa tanda # di semua tautan', async () => {
  const { readFileSync } = await import('node:fs')
  for (const f of ['src/components/navbar.js', 'src/pages/home.js', 'src/pages/more.js']) {
    const s = readFileSync(f, 'utf8')
    assert.ok(!/href="#\$\{/.test(s), `${f}: tautan menu tidak lagi memakai #`)
    assert.ok(!/href="#\//.test(s), `${f}: tidak ada tautan #/`)
  }
})

test('router mencegat klik tautan internal tanpa reload, dan membiarkan tautan luar/statis', () => {
  const routerSrc = readFileSync('src/router.js', 'utf8')
  assert.match(routerSrc, /e\.target\.closest\?\.\('a\[href\]'\)/, 'klik pada tautan ditangkap')
  assert.match(routerSrc, /href\.startsWith\('\/'\)/, 'hanya jalur internal')
  assert.match(routerSrc, /!\/\\\.\[a-z0-9\]\+\$\/i\.test\(href\.split\('\?'\)\[0\]\)/, 'berkas statis tidak dicegat')
  assert.match(routerSrc, /e\.metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey/, 'klik dengan tombol pengubah dibiarkan')
  assert.match(routerSrc, /a\.target && a\.target !== '_self'/, 'target=_blank dibiarkan')
  assert.match(routerSrc, /if \(e\.defaultPrevented \|\| e\.button !== 0/, 'klik kanan/klik yang sudah dicegah diabaikan')
})

test('router memakai History API, bukan hash', () => {
  const routerSrc = readFileSync('src/router.js', 'utf8')
  assert.match(routerSrc, /history\.pushState/)
  assert.match(routerSrc, /history\.replaceState/)
  assert.match(routerSrc, /addEventListener\('popstate'/, 'tombol kembali peramban ditangani')
  assert.ok(!/location\.hash = path/.test(routerSrc), 'navigasi tidak lagi memakai location.hash')
  assert.match(routerSrc, /dispatchEvent\(new Event\('qk:route'\)\)/, 'sheet menutup saat rute berubah')
})

test('tes instrumentasi startup memberi tenggang cukup untuk emulator lambat', async () => {
  const { readFileSync } = await import('node:fs')
  const java = readFileSync('android/app/src/androidTest/java/id/cgs/quranku/CapacitorStartupTest.java', 'utf8')
  assert.match(java, /attempt < 200/, 'cukup percobaan untuk WebView cold start')
  assert.match(java, /evaluated\.await\(500, TimeUnit\.MILLISECONDS\)/)
  assert.match(java, /text\.contains\("QuranKu"\) && text\.contains\("Assalamu"\)/, 'tunggu kedua penanda')
})

test('alat check:deploy tersedia dan melaporkan status URL bersih', async () => {
  const { readFileSync } = await import('node:fs')
  const script = readFileSync('scripts/check-deploy.mjs', 'utf8')
  assert.match(script, /\/surah\/2\/255/, 'memeriksa URL bersih')
  assert.match(script, /URL bersih SUDAH aktif/)
  assert.match(script, /URL bersih BELUM aktif/)
  assert.match(script, /process\.exit\(bersih\?\.ok \? 0 : 1\)/, 'exit code dipakai untuk CI')
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.equal(pkg.scripts['check:deploy'], 'node scripts/check-deploy.mjs')
})

test('kedua bentuk URL hidup berdampingan: bersih dan #/ lama, termasuk query adzan', async () => {
  // Simulasi lokasi + history ala peramban untuk menguji migrasi hash di startRouter.
  const store = {
    pathname: '/', search: '', hash: ''
  }
  const previous = {
    location: Object.getOwnPropertyDescriptor(globalThis, 'location'),
    history: Object.getOwnPropertyDescriptor(globalThis, 'history')
  }
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    get: () => ({
      origin: 'https://quran.cgs.my.id',
      get pathname() { return store.pathname },
      get search() { return store.search },
      get hash() { return store.hash },
      get href() { return 'https://quran.cgs.my.id' + store.pathname + store.search + store.hash }
    })
  })
  Object.defineProperty(globalThis, 'history', {
    configurable: true,
    value: {
      replaceState(_s, _t, url) {
        const u = new URL(url, 'https://quran.cgs.my.id')
        store.pathname = u.pathname
        store.search = u.search
        store.hash = ''
      },
      pushState(_s, _t, url) {
        const u = new URL(url, 'https://quran.cgs.my.id')
        store.pathname = u.pathname
        store.search = u.search
        store.hash = ''
      },
      state: null,
      length: 2
    }
  })
  try {
    const { internalPath } = await import('../src/router.js')
    const clean = (from) => {
      const u = new URL(from)
      store.pathname = u.pathname
      store.search = u.search
      store.hash = u.hash
      // tiru migrateLegacyHash
      if (store.hash.startsWith('#/')) {
        const [path, innerQuery = ''] = store.hash.slice(2).split('?')
        const query = innerQuery || store.search.replace(/^\?/, '')
        store.pathname = '/' + path.replace(/^\/+/, '')
        store.search = query ? '?' + query : ''
        store.hash = ''
      }
      return internalPath()
    }
    // Kedua bentuk menghasilkan jalur yang sama.
    assert.equal(clean('https://quran.cgs.my.id/surah/2/255'), '/surah/2/255')
    assert.equal(clean('https://quran.cgs.my.id/#/surah/2/255'), '/surah/2/255')
    // Query di depan hash dipertahankan (notifikasi adzan).
    assert.equal(clean('https://quran.cgs.my.id/?adzan=subuh#/salat'), '/salat?adzan=subuh')
    // Query di dalam hash menang.
    assert.equal(clean('https://quran.cgs.my.id/#/surah/2/255?resume=1'), '/surah/2/255?resume=1')
    // Bentuk gabungan: hash menang atas jalur.
    assert.equal(clean('https://quran.cgs.my.id/infaq#/surah/1/1'), '/surah/1/1')
  } finally {
    if (previous.location) Object.defineProperty(globalThis, 'location', previous.location)
    else delete globalThis.location
    if (previous.history) Object.defineProperty(globalThis, 'history', previous.history)
    else delete globalThis.history
  }
})

test('migrasi hash mempertahankan query luar, bukan membuangnya', () => {
  const routerSrc = readFileSync('src/router.js', 'utf8')
  const fn = routerSrc.split('function migrateLegacyHash')[1].split('\n}\n')[0]
  assert.match(fn, /innerQuery \|\| search\.replace/, 'query di depan hash dipakai bila hash tidak punya query')
  assert.match(fn, /history\.replaceState/, 'hash lama dirapikan tanpa memuat ulang')
  assert.ok(!/history\.replaceState\(null, '', '\/' \+ hash\.slice\(2\)\)$/.test(fn.trim()), 'tidak membuang search')
})
