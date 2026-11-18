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

/** Kode error plugin Geolocation Capacitor di Android beserta saran yang bisa ditindaklanjuti. */
const LOCATION_ERRORS = {
  'OS-PLUG-GLOC-0003': 'Izin lokasi ditolak. Buka Setelan → Aplikasi → QuranKu → Izin → Lokasi, pilih Izinkan, lalu coba lagi.',
  'OS-PLUG-GLOC-0007': 'Layanan lokasi perangkat sedang mati. Aktifkan Lokasi/GPS, lalu coba lagi.',
  'OS-PLUG-GLOC-0009': 'Permintaan menyalakan lokasi ditolak. Aktifkan Lokasi secara manual di Setelan.',
  'OS-PLUG-GLOC-0010': 'GPS belum mendapat sinyal. Coba lagi di area terbuka, atau pilih kota/koordinat manual di bawah.',
  'OS-PLUG-GLOC-0014': 'Google Play Services perlu diperbarui. Perbarui lewat Play Store, lalu coba lagi.',
  'OS-PLUG-GLOC-0015': 'Google Play Services bermasalah di perangkat ini. Perbarui lewat Play Store, atau pilih kota manual.',
  'OS-PLUG-GLOC-0016': 'Pengaturan lokasi perangkat tidak dapat dipakai. Periksa Setelan → Lokasi.',
  'OS-PLUG-GLOC-0017': 'Lokasi jaringan mati. Aktifkan “Lokasi akurasi Google” di Setelan → Lokasi.',
  'OS-PLUG-GLOC-0018': 'Izin lokasi belum lengkap di APK ini. Pasang APK terbaru.'
}

const LOCATION_ERROR_FALLBACK = 'Lokasi tidak dapat ditentukan. Coba lagi, atau pilih kota/koordinat manual di bawah.'

/** Ubah error Geolocation (kode plugin Android atau kode web 1–3) menjadi pesan yang bisa ditindaklanjuti. */
export function locationErrorMessage(error) {
  const code = error && error.code
  if (typeof code === 'string' && LOCATION_ERRORS[code]) return LOCATION_ERRORS[code]
  if (code === 1 || code === 'PERMISSION_DENIED') return LOCATION_ERRORS['OS-PLUG-GLOC-0003']
  if (code === 3 || code === 'TIMEOUT') return LOCATION_ERRORS['OS-PLUG-GLOC-0010']
  return LOCATION_ERROR_FALLBACK
}

/** Kegagalan yang masih layak dicoba ulang (izin sempat hilang fokus, GPS masih dingin, posisi belum tersedia). */
export function recoverableLocationError(error) {
  const code = error && error.code
  return code === 'OS-PLUG-GLOC-0002' || code === 'OS-PLUG-GLOC-0003' || code === 'OS-PLUG-GLOC-0010' || code === 2 || code === 3
}

// Akurasi perkiraan sudah cukup untuk jadwal salat & kiblat, dan tidak memerlukan izin presisi di Android 12+.
const NATIVE_OPTIONS = { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000, enableLocationFallback: true }
const WATCH_FALLBACK_TIMEOUT = 20000

const toLocation = (position) => ({
  lat: +position.coords.latitude.toFixed(4),
  lng: +position.coords.longitude.toFixed(4),
  name: 'Lokasi saya'
})

async function permissionGranted(Geolocation) {
  try {
    const state = await Geolocation.checkPermissions()
    return state?.coarseLocation === 'granted' || state?.location === 'granted'
  } catch {
    return false
  }
}

/** Satu percobaan lewat watchPosition: lebih tahan pada GPS dingin karena menerima pembaruan berulang. */
export async function firstFixFromWatch(Geolocation, timeoutMs = WATCH_FALLBACK_TIMEOUT) {
  let resolveFix
  let rejectFix
  const fix = new Promise((resolve, reject) => {
    resolveFix = resolve
    rejectFix = reject
  })
  const timer = setTimeout(
    () => rejectFix(Object.assign(new Error('GPS belum mendapat sinyal'), { code: 'OS-PLUG-GLOC-0010' })),
    timeoutMs
  )
  let watchId = null
  const watchReady = Geolocation.watchPosition(
    { ...NATIVE_OPTIONS, timeout: timeoutMs, maximumAge: 0 },
    (position, error) => {
      if (position) resolveFix(position)
      else if (error) rejectFix(error)
    }
  )
    .then((id) => {
      watchId = id
    })
    .catch(() => null)
  try {
    return await fix
  } finally {
    clearTimeout(timer)
    if (watchId === null) await watchReady
    if (watchId) await Geolocation.clearWatch({ id: watchId }).catch(() => {})
  }
}

/**
 * Ambil posisi di aplikasi native. Dialog izin diminta otomatis oleh plugin; bila hasilnya hilang
 * (aplikasi sempat ke latar) atau GPS masih dingin, coba sekali lagi lewat watchPosition, lalu
 * tampilkan pesan sesuai kode error agar pengguna tahu langkah berikutnya.
 */
async function nativeCurrentPosition() {
  const { Geolocation } = await import('@capacitor/geolocation')
  try {
    return toLocation(await Geolocation.getCurrentPosition(NATIVE_OPTIONS))
  } catch (firstError) {
    console.warn('[lokasi] pembacaan GPS gagal', firstError?.code || firstError)
    if (!recoverableLocationError(firstError)) throw new Error(locationErrorMessage(firstError))
    try {
      if (await permissionGranted(Geolocation)) return toLocation(await Geolocation.getCurrentPosition(NATIVE_OPTIONS))
      return toLocation(await firstFixFromWatch(Geolocation))
    } catch (retryError) {
      console.warn('[lokasi] percobaan ulang gagal', retryError?.code || retryError)
      throw new Error(locationErrorMessage(retryError))
    }
  }
}

// Batas waktu keseluruhan: percobaan utama + fallback watchPosition + dialog izin. Tanpa ini,
// promise plugin yang hilang (mis. aplikasi sempat ke latar) membuat tombol GPS nonaktif selamanya.
const LOCATION_DEADLINE_MS = 45000

/** Jalankan promise lokasi dengan batas waktu agar UI tidak menggantung. */
export function withDeadline(promise, ms = LOCATION_DEADLINE_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Object.assign(new Error(locationErrorMessage({ code: 'OS-PLUG-GLOC-0010' })), { code: 'OS-PLUG-GLOC-0010' })),
      ms
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

async function webCurrentPosition() {
  const options = { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Perangkat tidak mendukung lokasi'))
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toLocation(position)),
      (error) => reject(new Error(locationErrorMessage(error))),
      options
    )
  })
}

export async function getCurrentPosition() {
  const task = Capacitor.isNativePlatform() ? nativeCurrentPosition() : webCurrentPosition()
  return withDeadline(task)
}
