// Konversi angka untuk TAMPILAN saja. Data internal, URL, dan parameter API tetap integer/Latin.
const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

/** 286 -> "٢٨٦" */
export function toArabicIndic(value) {
  return String(value).replace(/[0-9]/g, (d) => AR[+d])
}

/** "٢٨٦" -> "286" (juga menerima angka Persia ۰-۹) */
export function toLatinDigits(value) {
  return String(value)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}

let mode = 'arabic'
export function setNumeralMode(m) {
  mode = m === 'latin' ? 'latin' : 'arabic'
}
export function getNumeralMode() {
  return mode
}

/** Angka untuk antarmuka Al-Qur'an, mengikuti pengaturan pengguna (default Arab-Indic). */
export function qnum(value) {
  return mode === 'arabic' ? toArabicIndic(value) : String(value)
}

/** Penanda ayat bergaya mushaf: ﴿١﴾ */
export function ayahMarker(n) {
  return mode === 'arabic' ? `\uFD3F${toArabicIndic(n)}\uFD3E` : String(n)
}

/** Referensi standar selalu Latin, mis. "2:255". */
export function ayahRef(surah, ayah) {
  return `${Number(surah)}:${Number(ayah)}`
}
