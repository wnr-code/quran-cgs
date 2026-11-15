// Kalender Hijriah berbasis Intl (Umm al-Qura) — bekerja offline tanpa API.
// Catatan: penetapan resmi di Indonesia (rukyat/hisab Kemenag) bisa berbeda ±1 hari,
// karena itu tersedia koreksi manual di Pengaturan.
export const HIJRI_MONTHS = ['Muharam', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jumadilawal', 'Jumadilakhir', 'Rajab', 'Syakban', 'Ramadan', 'Syawal', 'Zulkaidah', 'Zulhijah']

let fmt
function formatter() {
  if (fmt !== undefined) return fmt
  try {
    fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' })
    if (!fmt.resolvedOptions().calendar.startsWith('islamic')) fmt = null
  } catch {
    fmt = null
  }
  return fmt
}

/** @returns {{day:number,month:number,year:number}|null} */
export function toHijri(date = new Date(), adjustDays = 0) {
  const f = formatter()
  if (!f) return null
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (adjustDays || 0), 12)
  const parts = {}
  for (const p of f.formatToParts(d)) if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10)
  if (!parts.day || !parts.month || !parts.year) return null
  return { day: parts.day, month: parts.month, year: parts.year }
}

export function formatHijri(date = new Date(), adjustDays = 0) {
  const h = toHijri(date, adjustDays)
  return h ? `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} H` : ''
}

// Hari besar Islam berdasarkan tanggal Hijriah tetap.
export const ISLAMIC_DAYS = [
  { m: 1, d: 1, name: 'Tahun Baru Hijriah' },
  { m: 1, d: 10, name: 'Hari Asyura' },
  { m: 3, d: 12, name: 'Maulid Nabi Muhammad ﷺ' },
  { m: 7, d: 27, name: "Isra Mi'raj" },
  { m: 8, d: 15, name: "Nisfu Sya'ban" },
  { m: 9, d: 1, name: 'Awal Ramadan' },
  { m: 9, d: 17, name: 'Nuzulul Quran' },
  { m: 10, d: 1, name: 'Idulfitri' },
  { m: 12, d: 9, name: 'Hari Arafah' },
  { m: 12, d: 10, name: 'Iduladha' }
]

export function islamicDayOf(h) {
  if (!h) return null
  return ISLAMIC_DAYS.find((x) => x.m === h.month && x.d === h.day) || null
}
