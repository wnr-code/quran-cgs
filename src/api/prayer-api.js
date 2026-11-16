// Jadwal salat dihitung LOKAL (tanpa API, bekerja offline) memakai pustaka `adhan`.
// Metode default: sudut Kemenag RI (Subuh 20°, Isya 18°), mazhab Syafi'i, ihtiyat +2 menit.
// Ini perhitungan astronomis; jadwal resmi tetap mengacu pada Kemenag RI / otoritas setempat.
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan'
import { Capacitor } from '@capacitor/core'

export const METHODS = {
  kemenag: { label: 'Kemenag RI (20° / 18°, ihtiyat 2 mnt)' },
  mwl: { label: 'Muslim World League (18° / 17°)' },
  ummalqura: { label: 'Umm al-Qura, Makkah' },
  egypt: { label: 'Egyptian General Authority (19.5° / 17.5°)' },
  singapore: { label: 'MUIS Singapura (20° / 18°)' }
}

function params(method) {
  let p
  switch (method) {
    case 'mwl':
      p = CalculationMethod.MuslimWorldLeague()
      break
    case 'ummalqura':
      p = CalculationMethod.UmmAlQura()
      break
    case 'egypt':
      p = CalculationMethod.Egyptian()
      break
    case 'singapore':
      p = CalculationMethod.Singapore()
      break
    default:
      p = CalculationMethod.Other()
      p.fajrAngle = 20
      p.ishaAngle = 18
      p.adjustments = { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 }
  }
  p.madhab = Madhab.Shafi
  return p
}

/** @returns daftar waktu salat (objek Date pada zona waktu perangkat) */
export function getPrayerTimes({ lat, lng }, date = new Date(), method = 'kemenag') {
  const pt = new PrayerTimes(new Coordinates(lat, lng), date, params(method))
  const imsak = new Date(pt.fajr.getTime() - 10 * 60000)
  return [
    { key: 'imsak', name: 'Imsak', time: imsak, minor: true },
    { key: 'subuh', name: 'Subuh', time: pt.fajr },
    { key: 'terbit', name: 'Terbit', time: pt.sunrise, minor: true },
    { key: 'zuhur', name: 'Zuhur', time: pt.dhuhr },
    { key: 'asar', name: 'Asar', time: pt.asr },
    { key: 'magrib', name: 'Magrib', time: pt.maghrib },
    { key: 'isya', name: 'Isya', time: pt.isha }
  ]
}

export function nextPrayer(loc, method, now = new Date()) {
  const main = (d) => getPrayerTimes(loc, d, method).filter((p) => !p.minor)
  const today = main(now).find((p) => p.time > now)
  if (today) return today
  const tmr = new Date(now)
  tmr.setDate(tmr.getDate() + 1)
  return main(tmr)[0]
}

export async function getCurrentPosition() {
  const options = { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
  if (Capacitor.isNativePlatform()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      const position = await Geolocation.getCurrentPosition(options)
      return { lat: +position.coords.latitude.toFixed(4), lng: +position.coords.longitude.toFixed(4), name: 'Lokasi saya' }
    } catch (error) {
      const code = error && error.code
      const message = code === 'OS-PLUG-GLOC-0003'
        ? 'Izin lokasi ditolak'
        : code === 'OS-PLUG-GLOC-0007'
          ? 'Aktifkan layanan lokasi pada perangkat'
          : 'Lokasi tidak dapat ditentukan'
      throw new Error(message)
    }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Perangkat tidak mendukung lokasi'))
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: +position.coords.latitude.toFixed(4), lng: +position.coords.longitude.toFixed(4), name: 'Lokasi saya' }),
      (error) => reject(new Error(error.code === 1 ? 'Izin lokasi ditolak' : 'Lokasi tidak dapat ditentukan')),
      options
    )
  })
}
