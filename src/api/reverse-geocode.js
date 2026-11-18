// Reverse geocoding dipanggil hanya setelah pengguna menekan "Gunakan lokasi saya".
// Koordinat diproses langsung oleh OpenStreetMap Nominatim agar nama wilayah bisa ditampilkan.
import { CITIES } from '../data/cities.js'
import { APP } from '../config.js'

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'
// Cadangan bila Nominatim menolak/memblokir permintaan dari WebView (Referer https://localhost).
const PHOTON_ENDPOINT = 'https://photon.komoot.io/reverse'
const EARTH_RADIUS_KM = 6371

function usable(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function uniqueParts(parts) {
  const seen = new Set()
  return parts.filter((part) => {
    const value = usable(part)
    const key = value.toLocaleLowerCase('id-ID')
    if (!value || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Ringkas alamat administratif saja; tidak menampilkan nama jalan atau nomor rumah. */
export function formatPlaceName(result) {
  const address = result && result.address
  if (!address || typeof address !== 'object') return ''

  const settlement = [address.city, address.town, address.village, address.municipality, address.hamlet, address.suburb, address.neighbourhood]
    .map(usable)
    .find(Boolean)
  const district = [address.city_district, address.county, address.state_district, address.borough]
    .map(usable)
    .find((part) => part && part.toLocaleLowerCase('id-ID') !== settlement?.toLocaleLowerCase('id-ID'))
  const province = [address.state, address.province, address.region]
    .map(usable)
    .find((part) => part && part.toLocaleLowerCase('id-ID') !== settlement?.toLocaleLowerCase('id-ID'))

  return uniqueParts([settlement, district, province]).join(', ')
}

function distanceKm(a, b) {
  const rad = (degrees) => (degrees * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(x))
}

/** Nama perkiraan offline yang jujur ("Sekitar …"), hanya bila ada kota dikenal dalam radius 100 km. */
export function approximatePlaceName(loc, maxDistanceKm = 100) {
  const lat = Number(loc && loc.lat)
  const lng = Number(loc && loc.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Lokasi GPS'
  let nearest = null
  for (const city of CITIES) {
    const distance = distanceKm({ lat, lng }, city)
    if (!nearest || distance < nearest.distance) nearest = { city, distance }
  }
  return nearest && nearest.distance <= maxDistanceKm ? `Sekitar ${nearest.city.name}` : 'Lokasi GPS'
}

/** Ambil nama kota/kecamatan/wilayah dari Nominatim; timeout dan gagal dengan aman bila offline. */
export async function reverseGeocode(loc, { fetchImpl = globalThis.fetch, timeout = 8000 } = {}) {
  const lat = Number(loc && loc.lat)
  const lng = Number(loc && loc.lng)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('Koordinat lokasi tidak valid')
  }
  if (typeof fetchImpl !== 'function') throw new Error('Pencarian nama wilayah tidak tersedia')

  const url = new URL(ENDPOINT)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', lat.toFixed(4))
  url.searchParams.set('lon', lng.toFixed(4))
  url.searchParams.set('zoom', '10')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'id')

  const photonUrl = new URL(PHOTON_ENDPOINT)
  photonUrl.searchParams.set('lat', lat.toFixed(4))
  photonUrl.searchParams.set('lon', lng.toFixed(4))
  photonUrl.searchParams.set('lang', 'id')

  let lastError = null
  try {
    const name = formatPlaceName(await fetchJson(fetchImpl, url.href, timeout))
    if (name) return name
    lastError = new Error('Nama wilayah tidak ditemukan')
  } catch (error) {
    lastError = error
  }

  // Nominatim bisa menolak permintaan tanpa Referer yang sah dari WebView; coba layanan lain sekali.
  try {
    const name = formatPhotonPlaceName(await fetchJson(fetchImpl, photonUrl.href, timeout))
    if (name) return name
  } catch (error) {
    lastError = error
  }
  throw lastError || new Error('Nama wilayah tidak ditemukan')
}

/** Susun nama administrasi dari hasil Photon (cadangan). Alamat jalan tetap tidak dipakai. */
export function formatPhotonPlaceName(result) {
  const props = result && result.features && result.features[0] && result.features[0].properties
  if (!props || typeof props !== 'object') return ''
  const settlement = [props.city, props.town, props.village, props.district, props.locality].map(usable).find(Boolean)
  const district = [props.county, props.state].map(usable).find((part) => part && part.toLocaleLowerCase('id-ID') !== settlement?.toLocaleLowerCase('id-ID'))
  const province = usable(props.state)
  return uniqueParts([settlement, district, province]).join(', ')
}

async function fetchJson(fetchImpl, url, timeout) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      referrer: `${APP.origin}/`,
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) throw new Error(`Pencarian nama wilayah gagal (HTTP ${response.status})`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}
