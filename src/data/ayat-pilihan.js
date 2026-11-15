// Hanya REFERENSI ayat (surah:ayat). Teks ayat selalu diambil dari API/penyimpanan lokal, tidak pernah ditulis manual.
export const AYAT_PILIHAN = [
  [2, 152], [2, 153], [2, 186], [2, 286], [3, 139], [3, 159], [3, 200], [8, 46], [9, 51], [11, 88], [12, 87], [13, 28],
  [14, 7], [16, 97], [17, 82], [20, 114], [24, 35], [29, 69], [33, 41], [39, 53], [40, 60], [41, 30], [49, 13], [55, 13],
  [57, 4], [59, 18], [64, 11], [65, 2], [65, 3], [93, 5], [94, 5], [94, 6], [103, 3]
]

export function ayatHariIni(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const day = Math.floor((date - start) / 86400000)
  return AYAT_PILIHAN[day % AYAT_PILIHAN.length]
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
