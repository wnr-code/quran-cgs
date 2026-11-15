// Hanya REFERENSI ayat (surah:ayat). Teks ayat selalu diambil dari API/penyimpanan lokal, tidak pernah ditulis manual.
export const AYAT_PILIHAN = [
  [2, 152], [2, 153], [2, 186], [2, 286], [3, 139], [3, 159], [3, 200], [8, 46], [9, 51], [11, 88], [12, 87], [13, 28],
  [14, 7], [16, 97], [17, 82], [20, 114], [24, 35], [29, 69], [33, 41], [39, 53], [40, 60], [41, 30], [49, 13], [55, 13],
  [57, 4], [59, 18], [64, 11], [65, 2], [65, 3], [93, 5], [94, 5], [94, 6], [103, 3],
  [2, 45], [2, 177], [2, 216], [2, 255], [2, 261], [3, 8], [3, 26], [3, 31], [3, 103], [3, 133], [3, 134], [3, 185],
  [4, 36], [4, 59], [5, 2], [5, 8], [6, 59], [6, 162], [7, 23], [7, 56], [7, 199], [10, 57], [13, 11], [14, 34],
  [15, 9], [16, 90], [16, 125], [17, 23], [17, 24], [18, 10], [18, 46], [18, 110], [20, 25], [21, 35], [21, 87], [23, 1],
  [23, 118], [25, 63], [25, 74], [28, 77], [29, 45], [30, 21], [31, 17], [31, 18], [33, 21], [33, 56], [33, 70], [35, 28],
  [39, 10], [42, 30], [47, 7], [49, 10], [49, 12], [51, 56], [53, 39], [62, 10], [63, 9], [66, 6], [67, 2], [84, 6],
  [87, 14], [89, 27], [96, 1], [99, 7], [112, 1]
]

/** Kunci tanggal lokal (YYYY-M-D) — dipakai untuk mendeteksi pergantian hari saat aplikasi tetap terbuka. */
export const dayKey = (date = new Date()) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

/** Nomor hari lokal sejak epoch (berganti tepat tengah malam waktu perangkat). */
const dayNumber = (date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)

/**
 * Ayat untuk suatu hari. Urutan diacak tetap (bukan berurutan surah) supaya ayat yang berdekatan tidak muncul
 * berhari-hari berturut-turut; `offset` dipakai tombol "Ayat lain".
 */
export function ayatHariIni(date = new Date(), offset = 0) {
  const n = AYAT_PILIHAN.length
  // 37 relatif prima terhadap jumlah ayat → setiap ayat muncul tepat sekali per putaran.
  const step = [37, 41, 43, 47, 53].find((p) => n % p !== 0)
  const i = (((dayNumber(date) + offset) * step) % n + n) % n
  return AYAT_PILIHAN[i]
}

// Doa-doa yang bersumber langsung dari Al-Qur'an (judul ringkas + rujukan ayat). Teks dimuat dari data surah.
export const DOA_QURAN = [
  { title: 'Doa Nabi Ibrahim dan Ismail agar amal diterima', s: 2, from: 127, to: 128 },
  { title: 'Doa memohon kebaikan dunia dan akhirat', s: 2, from: 201, to: 201 },
  { title: 'Doa memohon kesabaran dan keteguhan', s: 2, from: 250, to: 250 },
  { title: 'Doa memohon keringanan, ampunan, dan rahmat', s: 2, from: 286, to: 286 },
  { title: 'Doa memohon keteguhan hati di atas petunjuk', s: 3, from: 8, to: 8 },
  { title: 'Doa memohon ampunan dan perlindungan dari neraka', s: 3, from: 16, to: 16 },
  { title: 'Doa memohon ampunan dan pertolongan', s: 3, from: 147, to: 147 },
  { title: 'Doa Ulul Albab', s: 3, from: 191, to: 194 },
  { title: 'Doa Nabi Adam dan Hawa memohon ampunan', s: 7, from: 23, to: 23 },
  { title: 'Doa memohon kesabaran dan wafat sebagai muslim', s: 7, from: 126, to: 126 },
  { title: 'Doa memohon perlindungan dari kaum yang zalim', s: 10, from: 85, to: 86 },
  { title: 'Doa Nabi Ibrahim untuk diri, keturunan, dan orang tua', s: 14, from: 40, to: 41 },
  { title: 'Doa untuk kedua orang tua', s: 17, from: 24, to: 24 },
  { title: 'Doa memohon masuk dan keluar dengan cara yang benar', s: 17, from: 80, to: 80 },
  { title: 'Doa Ashabul Kahfi memohon rahmat dan petunjuk', s: 18, from: 10, to: 10 },
  { title: 'Doa Nabi Musa memohon kelapangan dada dan kemudahan', s: 20, from: 25, to: 28 },
  { title: 'Doa memohon tambahan ilmu', s: 20, from: 114, to: 114 },
  { title: 'Doa Nabi Ayyub', s: 21, from: 83, to: 83 },
  { title: 'Doa Nabi Yunus', s: 21, from: 87, to: 87 },
  { title: 'Doa Nabi Zakaria memohon keturunan', s: 21, from: 89, to: 89 },
  { title: 'Doa berlindung dari bisikan setan', s: 23, from: 97, to: 98 },
  { title: 'Doa memohon ampunan dan rahmat', s: 23, from: 118, to: 118 },
  { title: 'Doa memohon dijauhkan dari azab Jahanam', s: 25, from: 65, to: 66 },
  { title: 'Doa memohon pasangan dan keturunan penyejuk hati', s: 25, from: 74, to: 74 },
  { title: 'Doa Nabi Ibrahim memohon hikmah', s: 26, from: 83, to: 85 },
  { title: 'Doa Nabi Sulaiman mensyukuri nikmat', s: 27, from: 19, to: 19 },
  { title: 'Doa Nabi Musa memohon kebaikan', s: 28, from: 24, to: 24 },
  { title: 'Doa mensyukuri nikmat dan memohon kebaikan keturunan', s: 46, from: 15, to: 15 },
  { title: 'Doa memohon ampunan untuk sesama orang beriman', s: 59, from: 10, to: 10 },
  { title: 'Doa Nabi Ibrahim: tawakal dan memohon ampunan', s: 60, from: 4, to: 5 },
  { title: 'Doa memohon disempurnakan cahaya', s: 66, from: 8, to: 8 },
  { title: 'Doa Nabi Nuh memohon ampunan', s: 71, from: 28, to: 28 }
]
