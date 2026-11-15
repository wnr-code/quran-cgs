// Mengubah scripts/nu-doa/*.txt (salinan dari quran.nu.or.id/doa) menjadi src/data/doa-nu.json.
// Format: "# Judul | slug", lalu blok 3 baris (Arab, Latin, arti) dipisah baris kosong.
import { readFileSync, writeFileSync } from 'node:fs'
const CATS = [
  ['doa-keseharian', 'Keseharian', 'house', 'Rumah, tidur, makan, masjid, pakaian'],
  ['doa-rezeki', 'Rezeki', 'coins', 'Bekerja, berdagang, dan utang'],
  ['doa-tolak-bala', 'Tolak Bala', 'shield', 'Musibah, bencana, dan keselamatan'],
  ['doa-kesehatan', 'Kesehatan', 'heart-pulse', 'Kesembuhan dan perlindungan dari penyakit'],
  ['doa-perjalanan', 'Perjalanan', 'route', 'Berkendara, berlayar, dan melepas pergi'],
  ['doa-ilmu', 'Ilmu', 'graduation-cap', 'Belajar, hafalan, ujian, dan guru']
]
const out = { source: { name: 'Quran NU Online', url: 'https://quran.nu.or.id/doa' }, categories: [] }
const seen = new Set()
for (const [slug, name, icon, desc] of CATS) {
  const items = []
  for (const chunk of readFileSync(`scripts/nu-doa/${slug}.txt`, 'utf8').split(/^# /m).slice(1)) {
    const [head, ...rest] = chunk.split('\n')
    const [title, id] = head.split('|').map((s) => s.trim())
    const parts = rest.join('\n').trim().split(/\n\s*\n/).map((b) => {
      const l = b.split('\n').map((s) => s.trim())
      if (l.length !== 3 || !/[\u0600-\u06FF]/.test(l[0]) || /[\u0600-\u06FF]/.test(l[1])) throw new Error(`${slug}/${id}: blok tidak 3 baris (Arab, Latin, arti)`)
      return { ar: l[0], latin: l[1], arti: l[2] }
    })
    if (!title || !/^[a-z0-9-]+$/.test(id) || !parts.length) throw new Error(`${slug}: judul/slug salah: ${head}`)
    if (seen.has(id)) throw new Error(`duplikat: ${id}`)
    seen.add(id)
    items.push({ id, title, parts })
  }
  out.categories.push({ slug, name, icon, desc, items })
}
writeFileSync('src/data/doa-nu.json', JSON.stringify(out, null, 1) + '\n')
console.log(out.categories.map((c) => `${c.name} ${c.items.length}`).join(', '), '| total', seen.size)
