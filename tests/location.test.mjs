import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatPlaceName, approximatePlaceName, reverseGeocode } from '../src/api/reverse-geocode.js'
import { getPrayerTimes } from '../src/api/prayer-api.js'
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
