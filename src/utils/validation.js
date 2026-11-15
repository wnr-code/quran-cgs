import meta from '../data/quran-meta.json' with { type: 'json' }

export const isInt = (v) => Number.isInteger(v)
export const isSurahNo = (n) => isInt(n) && n >= 1 && n <= 114
export const isAyahNo = (s, a) => isSurahNo(s) && isInt(a) && a >= 1 && a <= meta.ayahCounts[s - 1]
export const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0

/** Validasi ringkasan surah yang sudah dinormalisasi. */
export function validateSurahSummary(s) {
  return !!s && isSurahNo(s.nomor) && isNonEmptyString(s.nama) && isNonEmptyString(s.namaLatin) && s.jumlahAyat === meta.ayahCounts[s.nomor - 1]
}

export function validateSurahList(list) {
  if (!Array.isArray(list) || list.length !== 114) return false
  return list.every((s, i) => s.nomor === i + 1 && validateSurahSummary(s))
}

/** Validasi detail surah: jumlah & urutan ayat harus cocok dengan metadata lokal, teks Arab tidak boleh kosong. */
export function validateSurahDetail(s, expectedNo) {
  if (!validateSurahSummary(s) || s.nomor !== expectedNo) return false
  if (!Array.isArray(s.ayat) || s.ayat.length !== meta.ayahCounts[expectedNo - 1]) return false
  return s.ayat.every((a, i) => a && a.nomorAyat === i + 1 && isNonEmptyString(a.teksArab))
}

export function validateTafsir(t, expectedNo) {
  return !!t && t.nomor === expectedNo && Array.isArray(t.tafsir) && t.tafsir.length > 0 && t.tafsir.every((x) => isInt(x.ayat) && isNonEmptyString(x.teks))
}

/** Pembersihan input teks bebas (catatan, kategori). */
export function cleanText(v, max = 5000) {
  return String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .slice(0, max)
    .trim()
}

export function parseCoord(lat, lng) {
  const la = parseFloat(String(lat).replace(',', '.'))
  const lo = parseFloat(String(lng).replace(',', '.'))
  if (!Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) return null
  return { lat: la, lng: lo }
}
