import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatPlaceName, formatPhotonPlaceName, approximatePlaceName, reverseGeocode } from '../src/api/reverse-geocode.js'
import { getPrayerTimes, locationErrorMessage, recoverableLocationError, firstFixFromWatch, withDeadline } from '../src/api/prayer-api.js'
import { formatCoordinate, formatCoordinates } from '../src/utils/location.js'

test('reverse geocoding menyusun nama wilayah dan tidak membuka alamat jalan', () => {
  assert.equal(
    formatPlaceName({ address: { city: 'Kuningan', city_district: 'Kecamatan Kuningan', state: 'Jawa Barat', road: 'Jalan Contoh', house_number: '12' } }),
    'Kuningan, Kecamatan Kuningan, Jawa Barat'
  )
  assert.equal(
    formatPlaceName({ address: { village: 'Ciporang', county: 'Kabupaten Kuningan', state: 'Jawa Barat' } }),
    'Ciporang, Kabupaten Kuningan, Jawa Barat'
  )
  assert.equal(formatPlaceName({ address: { city: 'Kuningan', county: 'Kuningan', state: 'Kuningan' } }), 'Kuningan')
  assert.equal(formatPlaceName({ address: { road: 'Jalan Contoh', house_number: '12' } }), '')
})

test('reverse geocoding meminta nama berbahasa Indonesia dengan koordinat GPS yang dibulatkan', async () => {
  let requestedUrl
  let requestedOptions
  const name = await reverseGeocode(
    { lat: -6.97643, lng: 108.48364 },
    {
      timeout: 1000,
      fetchImpl: async (url, options) => {
        requestedUrl = url
        requestedOptions = options
        return { ok: true, json: async () => ({ address: { town: 'Kuningan', county: 'Kabupaten Kuningan', state: 'Jawa Barat' } }) }
      }
    }
  )
  const url = new URL(requestedUrl)
  assert.equal(url.hostname, 'nominatim.openstreetmap.org')
  assert.equal(url.searchParams.get('format'), 'jsonv2')
  assert.equal(url.searchParams.get('lat'), '-6.9764')
  assert.equal(url.searchParams.get('lon'), '108.4836')
  assert.equal(url.searchParams.get('accept-language'), 'id')
  assert.equal(requestedOptions.headers.Accept, 'application/json')
  assert.equal(requestedOptions.referrer, 'https://quran.cgs.my.id/')
  assert.equal(requestedOptions.referrerPolicy, 'strict-origin-when-cross-origin')
  assert.ok(requestedOptions.signal instanceof AbortSignal)
  assert.equal(name, 'Kuningan, Kabupaten Kuningan, Jawa Barat')
  await assert.rejects(reverseGeocode({ lat: 91, lng: 0 }, { fetchImpl: () => assert.fail('tidak boleh meminta lokasi invalid') }), /Koordinat lokasi tidak valid/)
})

test('nama wilayah dicari ulang di layanan cadangan bila Nominatim menolak permintaan WebView', async () => {
  const urls = []
  const name = await reverseGeocode(
    { lat: -6.9764, lng: 108.4836 },
    {
      timeout: 1000,
      fetchImpl: async (url) => {
        urls.push(url)
        if (urls.length === 1) throw new Error('HTTP 403')
        return {
          ok: true,
          json: async () => ({
            features: [{ properties: { name: 'Kuningan', city: 'Kuningan', county: 'Kabupaten Kuningan', state: 'Jawa Barat', street: 'Jalan Contoh' } }]
          })
        }
      }
    }
  )
  assert.equal(urls.length, 2, 'Nominatim dicoba sekali lalu layanan cadangan')
  const photon = new URL(urls[1])
  assert.equal(photon.hostname, 'photon.komoot.io')
  assert.equal(photon.searchParams.get('lat'), '-6.9764')
  assert.equal(photon.searchParams.get('lang'), 'id')
  assert.equal(name, 'Kuningan, Kabupaten Kuningan, Jawa Barat')
  assert.equal(formatPhotonPlaceName({ features: [{ properties: { city: 'Kuningan', state: 'Jawa Barat' } }] }), 'Kuningan, Jawa Barat')
  assert.equal(formatPhotonPlaceName({ features: [] }), '')
})

test('kegagalan kedua layanan dilaporkan, bukan diam-diam sukses', async () => {
  await assert.rejects(
    reverseGeocode(
      { lat: -6.9764, lng: 108.4836 },
      { timeout: 1000, fetchImpl: async () => { throw new Error('jaringan mati') } }
    ),
    /jaringan mati/
  )
})

test('pesan error lokasi GPS memberi langkah lanjutan sesuai kode plugin Android', () => {
  assert.match(locationErrorMessage({ code: 'OS-PLUG-GLOC-0003' }), /Izin lokasi ditolak/)
  assert.match(locationErrorMessage({ code: 'OS-PLUG-GLOC-0007' }), /Lokasi\/GPS/)
  assert.match(locationErrorMessage({ code: 'OS-PLUG-GLOC-0010' }), /area terbuka/)
  assert.match(locationErrorMessage({ code: 'OS-PLUG-GLOC-0014' }), /Play Store/)
  assert.match(locationErrorMessage({ code: 'OS-PLUG-GLOC-0015' }), /Play Store/)
  assert.match(locationErrorMessage({ code: 1 }), /Izin lokasi ditolak/)
  assert.match(locationErrorMessage({ code: 3 }), /area terbuka/)
  assert.match(locationErrorMessage(new Error('apa saja')), /pilih kota\/koordinat manual/)
  assert.equal(recoverableLocationError({ code: 'OS-PLUG-GLOC-0010' }), true)
  assert.equal(recoverableLocationError({ code: 'OS-PLUG-GLOC-0003' }), true)
  assert.equal(recoverableLocationError({ code: 'OS-PLUG-GLOC-0007' }), false, 'lokasi mati tidak perlu diulang otomatis')
  assert.equal(recoverableLocationError({ code: 'OS-PLUG-GLOC-0018' }), false)
})

test('alur GPS native memakai izin perkiraan, batas waktu lebih longgar, dan fallback watchPosition', () => {
  const source = readFileSync('src/api/prayer-api.js', 'utf8')
  assert.match(source, /enableHighAccuracy: false/, 'tetap izin perkiraan, bukan presisi')
  assert.match(source, /timeout: 20000/, 'batas waktu dinaikkan dari 15 detik')
  assert.match(source, /maximumAge: 60000/, 'lokasi cache tidak dipakai lebih dari 1 menit')
  assert.match(source, /watchPosition/, 'ada fallback watchPosition saat GPS dingin')
  assert.match(source, /checkPermissions/, 'izin diperiksa sebelum mencoba ulang')
  assert.match(source, /clearWatch/, 'watch fallback selalu dibersihkan')
  const picker = readFileSync('src/components/location-picker.js', 'utf8')
  assert.match(picker, /data-loc-status/, 'petunjuk kegagalan GPS ditampilkan di kartu lokasi')
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
  assert.match(manifest, /android\.hardware\.location\.gps" android:required="false"/)
  assert.match(manifest, /ACCESS_COARSE_LOCATION/)
})

test('fallback watchPosition mengambil perbaikan pertama lalu selalu berhenti menonton', async () => {
  const calls = { watch: 0, cleared: [] }
  const fake = {
    watchPosition: (options, callback) => {
      calls.watch++
      assert.equal(options.maximumAge, 0, 'abaikan cache saat fallback')
      setTimeout(() => callback({ coords: { latitude: -6.9764, longitude: 108.4836 } }), 5)
      setTimeout(() => callback(null, { code: 'OS-PLUG-GLOC-0002' }), 10)
      return Promise.resolve('watch-1')
    },
    clearWatch: async ({ id }) => calls.cleared.push(id)
  }
  const fix = await firstFixFromWatch(fake, 800)
  assert.equal(fix.coords.latitude, -6.9764)
  assert.equal(calls.watch, 1)
  assert.deepEqual(calls.cleared, ['watch-1'], 'watch dibersihkan setelah perbaikan pertama')

  const stuck = {
    watchPosition: () => Promise.resolve('watch-2'),
    clearWatch: async ({ id }) => calls.cleared.push(id)
  }
  await assert.rejects(firstFixFromWatch(stuck, 40), (error) => error.code === 'OS-PLUG-GLOC-0010')
  assert.deepEqual(calls.cleared, ['watch-1', 'watch-2'], 'watch yang timeout juga dibersihkan')
})

test('batas waktu lokasi memastikan UI tidak menggantung saat plugin tidak menjawab', async () => {
  assert.equal(await withDeadline(Promise.resolve('ok'), 200), 'ok')
  await assert.rejects(withDeadline(new Promise(() => {}), 30), (error) => {
    assert.equal(error.code, 'OS-PLUG-GLOC-0010')
    assert.match(error.message, /area terbuka/)
    return true
  })
  await assert.rejects(withDeadline(Promise.reject(new Error('izin ditolak')), 200), /izin ditolak/)
})

test('nama perkiraan GPS tetap jujur saat reverse geocoding offline', () => {
  assert.equal(approximatePlaceName({ lat: -6.9764, lng: 108.4836 }), 'Sekitar Kuningan')
  assert.equal(approximatePlaceName({ lat: 0, lng: 0 }), 'Lokasi GPS')
})

test('koordinat ditampilkan jelas dengan label lintang dan bujur', () => {
  assert.equal(formatCoordinate(-6.9764), '-6.9764°')
  assert.equal(formatCoordinates({ lat: -6.9764, lng: 108.4836 }), 'Lintang -6.9764° · Bujur 108.4836°')
})

test('jadwal puasa memiliki waktu imsak dan buka puasa mengikuti Magrib', () => {
  const date = new Date(2026, 2, 1, 12)
  const times = getPrayerTimes({ lat: -6.9764, lng: 108.4836 }, date, 'kemenag')
  const imsak = times.find((time) => time.key === 'imsak')
  const fajr = times.find((time) => time.key === 'subuh')
  const buka = times.find((time) => time.key === 'magrib')
  assert.ok(imsak && fajr && buka)
  assert.equal(imsak.time.getTime(), fajr.time.getTime() - 10 * 60_000)
  assert.equal(buka.name, 'Magrib')

  const page = readFileSync(new URL('../src/pages/prayer.js', import.meta.url), 'utf8')
  assert.match(page, /data-fasting-schedule/)
  assert.match(page, /Imsak &amp; Buka Puasa/)
  assert.match(page, /Buka puasa/)
})
