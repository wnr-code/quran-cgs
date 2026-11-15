// Perhitungan arah kiblat (great-circle bearing ke Ka'bah) dan pembacaan kompas perangkat.
export const KAABA = { lat: 21.4225, lng: 39.8262 }
const rad = (d) => (d * Math.PI) / 180
const deg = (r) => (r * 180) / Math.PI

/** Sudut kiblat dari utara sejati, searah jarum jam (0–360°). */
export function qiblaBearing(lat, lng) {
  const φ1 = rad(lat)
  const φ2 = rad(KAABA.lat)
  const Δλ = rad(KAABA.lng - lng)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

export function distanceToKaaba(lat, lng) {
  const R = 6371
  const dφ = rad(KAABA.lat - lat)
  const dλ = rad(KAABA.lng - lng)
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Mulai membaca kompas. callback(headingDerajat, akurasi|null).
 * @returns fungsi untuk berhenti. Melempar error bila sensor/izin tidak tersedia.
 */
export async function startCompass(callback) {
  if (typeof DeviceOrientationEvent === 'undefined') throw new Error('Perangkat ini tidak memiliki sensor kompas.')
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const res = await DeviceOrientationEvent.requestPermission()
    if (res !== 'granted') throw new Error('Izin sensor orientasi ditolak.')
  }
  let got = false
  const handler = (e) => {
    let heading = null
    if (typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading
    else if (e.absolute && typeof e.alpha === 'number') heading = (360 - e.alpha) % 360
    if (heading == null) return
    got = true
    callback(heading, typeof e.webkitCompassAccuracy === 'number' ? e.webkitCompassAccuracy : null)
  }
  const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
  window.addEventListener(evt, handler, true)
  const stop = () => window.removeEventListener(evt, handler, true)
  stop.hasSignal = () => got
  return stop
}
