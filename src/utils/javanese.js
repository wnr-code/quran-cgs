// Pasaran Jawa (pancawara): siklus 5 hari Legi → Pahing → Pon → Wage → Kliwon, berjalan tanpa putus.
// Acuan yang dipakai dan saling cocok: 17 Agustus 1945 = Jumat Legi; 6 Juni 1901 = Kamis Pon; 1 Januari 1970 = Kamis Wage.
export const PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon']
export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

/** Pasaran untuk tanggal kalender lokal `date`. */
export function pasaranOf(date) {
  const n = Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
  return PASARAN[(((n + 3) % 5) + 5) % 5]
}

/** Contoh: "Jumat Kliwon". */
export const weton = (date) => `${HARI[date.getDay()]} ${pasaranOf(date)}`
