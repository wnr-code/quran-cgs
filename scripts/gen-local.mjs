// Menyalin data Al-Qur'an lokal (cadangan terakhir bila semua API gagal) dari paket `quran-json`
// ke public/data/. Berkas hasil TIDAK di-commit (lihat .gitignore); dibuat ulang tiap build.
// HANYA teks Arab yang disalin (apa adanya). Terjemahan & transliterasi paket ini TIDAK dipublikasikan
// karena pengelola paket menyatakan hak redistribusinya tidak jelas.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const chapters = require('quran-json/dist/quran_id.json')
const meta = require('../src/data/quran-meta.json')

if (chapters.length !== 114) throw new Error('quran-json: jumlah surah bukan 114')
mkdirSync('public/data/surah', { recursive: true })
const summary = (c) => ({ id: c.id, name: c.name, transliteration: c.transliteration, translation: c.translation, type: c.type, total_verses: c.total_verses })
let total = 0
for (const c of chapters) {
  if (c.verses.length !== meta.ayahCounts[c.id - 1]) throw new Error(`quran-json: jumlah ayat surah ${c.id} tidak cocok`)
  total += c.verses.length
  writeFileSync(`public/data/surah/${c.id}.json`, JSON.stringify({ ...summary(c), verses: c.verses.map((v) => ({ id: v.id, text: v.text })) }))
}
if (total !== 6236) throw new Error('quran-json: total ayat bukan 6236')
writeFileSync('public/data/surah-list.json', JSON.stringify(chapters.map(summary)))
console.log(`[lokal] 114 surah, ${total} ayat → public/data/`)
