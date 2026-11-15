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
  { m: 1, d: 1, name: 'Tahun Baru Hijriah', desc: 'Awal tahun dalam kalender Hijriah, yang perhitungannya dimulai dari tahun hijrah Nabi Muhammad ﷺ dari Makkah ke Madinah. Muharam termasuk empat bulan haram (mulia).' },
  { m: 1, d: 9, name: "Tasu'a", desc: 'Tanggal 9 Muharam. Dianjurkan berpuasa mengiringi puasa Asyura esok harinya.' },
  { m: 1, d: 10, name: 'Hari Asyura', desc: 'Tanggal 10 Muharam. Disunnahkan berpuasa; dalam hadis riwayat Muslim disebutkan puasa Asyura diharapkan menghapus dosa setahun yang lalu.' },
  { m: 3, d: 12, name: 'Maulid Nabi Muhammad ﷺ', desc: 'Peringatan kelahiran Nabi Muhammad ﷺ yang lazim diadakan di Indonesia dan menjadi hari libur nasional. Biasa diisi dengan selawat dan mengkaji sirah beliau.' },
  { m: 7, d: 27, name: "Isra Mi'raj", desc: "Peringatan perjalanan malam Nabi Muhammad ﷺ dari Masjidilharam ke Masjidilaqsa lalu naik ke Sidratulmuntaha, saat salat lima waktu diwajibkan. Tanggal pastinya diperselisihkan ulama; 27 Rajab adalah tanggal yang lazim diperingati di Indonesia." },
  { m: 8, d: 15, name: "Nisfu Sya'ban", desc: "Pertengahan bulan Syakban. Syakban adalah bulan Nabi ﷺ banyak berpuasa sunnah; banyak muslim memperbanyak doa dan ibadah menjelang Ramadan." },
  { m: 9, d: 1, name: 'Awal Ramadan', desc: 'Hari pertama puasa wajib Ramadan. Penetapan resminya di Indonesia menunggu sidang isbat Kemenag RI dan dapat berbeda dari perhitungan kalender ini.' },
  { m: 9, d: 17, name: 'Nuzulul Quran', desc: "Peringatan turunnya Al-Qur'an yang lazim diadakan di Indonesia pada 17 Ramadan. Al-Qur'an sendiri menyebut ia diturunkan pada bulan Ramadan (QS. Al-Baqarah: 185) di malam Lailatulqadar (QS. Al-Qadr: 1)." },
  { m: 10, d: 1, name: 'Idulfitri', desc: 'Hari raya setelah sebulan berpuasa Ramadan: salat Id, zakat fitrah ditunaikan sebelum salat Id, dan saling memaafkan. Haram berpuasa pada hari ini.' },
  { m: 12, d: 9, name: 'Hari Arafah', desc: 'Hari wukuf jamaah haji di Arafah. Bagi yang tidak berhaji disunnahkan berpuasa; dalam hadis riwayat Muslim disebutkan puasa Arafah diharapkan menghapus dosa setahun yang lalu dan setahun yang akan datang.' },
  { m: 12, d: 10, name: 'Iduladha', desc: 'Hari raya kurban: salat Id dan penyembelihan hewan kurban, mengenang ketaatan Nabi Ibrahim dan Nabi Ismail. Haram berpuasa pada hari ini dan tiga hari tasyrik sesudahnya (11–13 Zulhijah).' }
]

export function islamicDayOf(h) {
  if (!h) return null
  return ISLAMIC_DAYS.find((x) => x.m === h.month && x.d === h.day) || null
}

/**
 * Keterangan amalan terkait puasa pada suatu hari (selain hari besar).
 * @param {Date} date @param {{day:number,month:number}|null} h
 * @returns {{label:string, desc:string}[]}
 */
export function dayNotes(date, h) {
  const out = []
  if (!h) return out
  const tasyrik = h.month === 12 && h.day >= 11 && h.day <= 13
  const forbidden = (h.month === 10 && h.day === 1) || (h.month === 12 && h.day === 10) || tasyrik
  if (tasyrik) out.push({ label: 'Hari tasyrik', desc: 'Hari makan, minum, dan berzikir; tidak boleh berpuasa. Penyembelihan kurban masih dapat dilakukan.' })
  if (h.month === 9) {
    out.push({ label: 'Puasa Ramadan', desc: `Hari ke-${h.day} bulan Ramadan.` })
    return out
  }
  if (forbidden) return out
  if (h.day >= 13 && h.day <= 15) out.push({ label: 'Ayyamul Bidh', desc: 'Puasa sunnah tiga hari pertengahan bulan Hijriah (tanggal 13, 14, 15).' })
  const dow = date.getDay()
  if (dow === 1 || dow === 4) out.push({ label: `Puasa sunnah ${dow === 1 ? 'Senin' : 'Kamis'}`, desc: 'Nabi ﷺ biasa berpuasa pada hari Senin dan Kamis.' })
  if (dow === 5) out.push({ label: "Hari Jumat", desc: "Sayyidul ayyam: perbanyak selawat, membaca Surah Al-Kahf, dan salat Jumat bagi laki-laki." })
  return out
}
