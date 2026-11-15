// Metadata juz / halaman mushaf / sajdah. Sumber: paket npm `quran-meta` (riwayat Hafs, Mushaf Madinah 604 halaman).
import meta from '../data/quran-meta.json' with { type: 'json' }

export const TOTAL_PAGES = meta.totalPages
export const TOTAL_AYAHS = meta.totalAyahs
export const META_SOURCE = meta.source
export const ayahCounts = meta.ayahCounts

const surahStart = [0]
for (let i = 0; i < 114; i++) surahStart.push(surahStart[i] + meta.ayahCounts[i])
const sajdaSet = new Set(meta.sajda)
const pageStartSet = new Set(meta.pageStarts)

/** (surah, ayat) -> id global 1..6236 */
export function ayahId(surah, ayah) {
  return surahStart[surah - 1] + ayah
}

/** id global -> [surah, ayat] */
export function fromAyahId(id) {
  let lo = 0
  let hi = 113
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (surahStart[mid] < id) lo = mid
    else hi = mid - 1
  }
  return [lo + 1, id - surahStart[lo]]
}

function findIndex(starts, id) {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (starts[mid] <= id) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

export const juzOf = (surah, ayah) => findIndex(meta.juzStarts, ayahId(surah, ayah))
export const pageOf = (surah, ayah) => findIndex(meta.pageStarts, ayahId(surah, ayah))
export const isSajda = (surah, ayah) => sajdaSet.has(ayahId(surah, ayah))
export const isPageStart = (surah, ayah) => pageStartSet.has(ayahId(surah, ayah))
export const isPageEnd = (surah, ayah) => {
  const id = ayahId(surah, ayah)
  return id === TOTAL_AYAHS || pageStartSet.has(id + 1)
}
export const juzStart = (juz) => fromAyahId(meta.juzStarts[juz - 1])
export const pageStart = (page) => fromAyahId(meta.pageStarts[page - 1])

/** Daftar 30 juz: awal & akhir */
export function juzList() {
  return meta.juzStarts.map((id, i) => {
    const endId = i < 29 ? meta.juzStarts[i + 1] - 1 : TOTAL_AYAHS
    return { juz: i + 1, start: fromAyahId(id), end: fromAyahId(endId), pageStart: findIndex(meta.pageStarts, id) }
  })
}
