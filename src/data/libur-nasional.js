// Hari libur nasional & cuti bersama Indonesia.
// Tahun yang ada di RESMI diambil dari SKB 3 Menteri (Menag, Menaker, MenPANRB):
//   2026 — SKB No. 1497/2025, 2/2025, 5/2025 (19 September 2025)
//   2027 — SKB No. 1205/2026, 3/2026, 2/2026 (15 September 2026)
// Tahun lain dihitung (PERKIRAAN): tanggal tetap + Paskah (hitungan Gregorian) + hari besar Islam menurut kalender
// Hijriah aplikasi. Imlek, Nyepi, dan Waisak tidak dihitung untuk tahun tanpa data resmi.
// Pemerintah dapat mengubah SKB (terutama Idulfitri/Iduladha yang ditetapkan lewat sidang isbat).
import { toHijri } from '../utils/hijri.js'

const RESMI = {
  2026: {
    libur: {
      '01-01': 'Tahun Baru 2026 Masehi',
      '01-16': 'Isra Mikraj Nabi Muhammad ﷺ',
      '02-17': 'Tahun Baru Imlek 2577 Kongzili',
      '03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
      '03-21': 'Idulfitri 1447 H',
      '03-22': 'Idulfitri 1447 H (hari kedua)',
      '04-03': 'Wafat Yesus Kristus',
      '04-05': 'Kebangkitan Yesus Kristus (Paskah)',
      '05-01': 'Hari Buruh Internasional',
      '05-14': 'Kenaikan Yesus Kristus',
      '05-27': 'Iduladha 1447 H',
      '05-31': 'Hari Raya Waisak 2570 BE',
      '06-01': 'Hari Lahir Pancasila',
      '06-16': 'Tahun Baru Islam 1 Muharam 1448 H',
      '08-17': 'Proklamasi Kemerdekaan RI',
      '08-25': 'Maulid Nabi Muhammad ﷺ',
      '12-25': 'Kelahiran Yesus Kristus (Natal)'
    },
    cuti: null // daftar cuti bersama 2026 tidak dimuat
  },
  2027: {
    libur: {
      '01-01': 'Tahun Baru 2027 Masehi',
      '01-05': 'Isra Mikraj Nabi Muhammad ﷺ',
      '02-06': 'Tahun Baru Imlek 2578 Kongzili',
      '03-08': 'Hari Suci Nyepi (Tahun Baru Saka 1949)',
      '03-10': 'Idulfitri 1448 H',
      '03-11': 'Idulfitri 1448 H (hari kedua)',
      '03-26': 'Wafat Yesus Kristus',
      '03-28': 'Kebangkitan Yesus Kristus (Paskah)',
      '05-01': 'Hari Buruh Internasional',
      '05-06': 'Kenaikan Yesus Kristus',
      '05-17': 'Iduladha 1448 H',
      '05-20': 'Hari Raya Waisak 2571 BE',
      '06-01': 'Hari Lahir Pancasila',
      '06-06': 'Tahun Baru Islam 1 Muharam 1449 H',
      '08-15': 'Maulid Nabi Muhammad ﷺ',
      '08-17': 'Proklamasi Kemerdekaan RI',
      '12-25': 'Kelahiran Yesus Kristus (Natal)',
      '12-26': 'Isra Mikraj Nabi Muhammad ﷺ (1449 H)'
    },
    cuti: {
      '02-05': 'Cuti bersama Tahun Baru Imlek',
      '03-09': 'Cuti bersama Idulfitri',
      '03-12': 'Cuti bersama Idulfitri',
      '03-15': 'Cuti bersama Idulfitri',
      '03-25': 'Cuti bersama Wafat Yesus Kristus',
      '05-18': 'Cuti bersama Iduladha',
      '05-19': 'Cuti bersama Waisak',
      '12-24': 'Cuti bersama Natal'
    }
  }
}

export const hasOfficial = (year) => !!RESMI[year]

/** Minggu Paskah (kalender Gregorian, algoritma Meeus/Jones/Butcher). */
export function easter(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

const FIXED = { '01-01': 'Tahun Baru Masehi', '05-01': 'Hari Buruh Internasional', '06-01': 'Hari Lahir Pancasila', '08-17': 'Proklamasi Kemerdekaan RI', '12-25': 'Kelahiran Yesus Kristus (Natal)' }
const HIJRI_LIBUR = { '1-1': 'Tahun Baru Islam', '3-12': 'Maulid Nabi Muhammad ﷺ', '7-27': 'Isra Mikraj Nabi Muhammad ﷺ', '10-1': 'Idulfitri', '10-2': 'Idulfitri (hari kedua)', '12-10': 'Iduladha' }
const mmdd = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const cache = new Map()

function estimated(year, adj) {
  const k = `${year}|${adj}`
  if (cache.has(k)) return cache.get(k)
  const out = { ...FIXED }
  const e = easter(year)
  const off = (n) => mmdd(new Date(year, e.getMonth(), e.getDate() + n))
  out[off(-2)] = 'Wafat Yesus Kristus'
  out[off(0)] = 'Kebangkitan Yesus Kristus (Paskah)'
  out[off(39)] = 'Kenaikan Yesus Kristus'
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d = new Date(year, d.getMonth(), d.getDate() + 1)) {
    const h = toHijri(d, adj)
    const name = h && HIJRI_LIBUR[`${h.month}-${h.day}`]
    if (name) out[mmdd(d)] = out[mmdd(d)] ? `${out[mmdd(d)]} · ${name}` : name
  }
  cache.set(k, out)
  return out
}

/**
 * Keterangan libur untuk suatu tanggal.
 * @returns {{name:string, type:'libur'|'cuti', official:boolean}|null}
 */
export function holidayOf(date, adj = 0) {
  const y = date.getFullYear()
  const key = mmdd(date)
  const r = RESMI[y]
  if (r) {
    if (r.libur[key]) return { name: r.libur[key], type: 'libur', official: true }
    if (r.cuti && r.cuti[key]) return { name: r.cuti[key], type: 'cuti', official: true }
    return null
  }
  const name = estimated(y, adj)[key]
  return name ? { name, type: 'libur', official: false } : null
}
