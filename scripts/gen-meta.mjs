// Menghasilkan src/data/quran-meta.json dari paket `quran-meta` (riwayat Hafs, Mushaf Madinah 604 halaman).
// Data ini TIDAK dikarang: seluruh batas juz/halaman/sajdah berasal dari paket tersebut.
import * as q from 'quran-meta/hafs'
import { writeFileSync } from 'node:fs'

const clean = (list) => list.filter((x) => Number.isInteger(x) && x >= 1 && x <= q.meta.numAyahs)
const ayahCounts = []
for (let s = 1; s <= 114; s++) ayahCounts.push(q.getAyahCountInSurah(s))
const out = {
  source: 'quran-meta (npm) — riwayat Hafs, Mushaf Madinah',
  totalAyahs: q.meta.numAyahs,
  totalPages: q.meta.numPages,
  ayahCounts,
  juzStarts: clean(q.JuzList).slice(0, 30),
  pageStarts: clean(q.PageList).slice(0, q.meta.numPages),
  sajda: clean(q.SajdaList)
}
if (out.totalAyahs !== 6236 || out.juzStarts.length !== 30 || out.pageStarts.length !== 604 || ayahCounts.reduce((a, b) => a + b) !== 6236) {
  throw new Error('Metadata tidak valid: ' + JSON.stringify({ a: out.totalAyahs, j: out.juzStarts.length, p: out.pageStarts.length }))
}
writeFileSync(new URL('../src/data/quran-meta.json', import.meta.url), JSON.stringify(out))
console.log('OK', out.totalAyahs, 'ayat,', out.juzStarts.length, 'juz,', out.pageStarts.length, 'halaman,', out.sajda.length, 'sajdah')
