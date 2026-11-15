// Menyusun daftar qari tambahan (audio surah penuh) dari github.com/wnr-code/qori-alquran-json.
// Pakai:  git clone https://github.com/wnr-code/qori-alquran-json /tmp/qori && node scripts/gen-qari.mjs /tmp/qori
//
// Data sumber adalah hasil pengambilan otomatis, jadi hanya qari yang lolos SEMUA pemeriksaan berikut yang dipakai:
//   1. tepat 114 berkas surah, nomor 1–114 tanpa lubang maupun ganda;
//   2. setiap alamat audio berpola <dasar>/<NNN>.mp3 dengan NNN = nomor surah, dan satu alamat dasar untuk semua surah;
//   3. audio berada di server mp3quran.net (alamat tetap). Alamat archive.org pada sumber menunjuk ke mesin tertentu
//      (iaNNNNNN.us.archive.org) yang dapat berpindah, dan riwayat bacaannya tidak dapat dipastikan dari data;
//   4. alamat tidak menandai riwayat selain Hafs;
//   5. identitas rekaman sudah dicocokkan dengan API resmi mp3quran (tabel VERIFIED di bawah);
//   6. bukan qari yang sudah tersedia dari EQuran.id (agar tidak ganda).
// Keterjangkauan audio dan riwayat diperiksa terpisah terhadap layanan aslinya: tests/live/qari.mjs.
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const src = process.argv[2]
if (!src || !existsSync(join(src, 'ringkasan.json'))) {
  console.error('Pakai: node scripts/gen-qari.mjs <folder klon qori-alquran-json>')
  process.exit(1)
}
const ALREADY = ['syekh-abdullah-awwad-al-juhani', 'syekh-abdurrahman-as-sudais', 'syekh-misyari-alafasy', 'syekh-yasser-al-dosari']
// Hasil pemeriksaan terhadap API resmi mp3quran (tests/live/qari.mjs, 15 Nov 2026): untuk tiap qari, berkas 001 dan 114
// di alamat lama berukuran sama persis dengan mushaf "Rewayat Hafs A'n Assem" pada alamat resmi baru berikut
// (https://cdn.mp3quran.net/audio/<nilai>). Qari yang tidak ada di tabel ini TIDAK dipakai.
const VERIFIED = {
  'syekh-abdul-aziz-az-zahrani': 'abdulaziz-zahrani/r1',
  'syekh-abdul-basit-abdul-samad': 'abdulbasit-abdulsamad/r1',
  'syekh-abdullah-basfar': 'abdullah-basfar/r1',
  'abu-bakr-asy-syatiri': 'abubakr-shatri/r1',
  'syekh-adel-rayan': 'adel-rayyan/r1',
  'syekh-ahmad-bin-ali-al-ajmi': 'ahmad-ajmi/r1',
  'syekh-ali-al-hudhaify': 'ali-hudhaifi/r1',
  'qari-alzain-mohamed-ahmed': 'zain-ahmad/r1',
  'syekh-fares-abbad': 'fares-abbad/r1',
  'qari-hatem-fareed-alwaer': 'hatem-waer/r1',
  'syekh-ibrahim-al-akhdar': 'ibrahim-akhdar/r1',
  'qari-idris-abkar': 'idrees-abkar/r1',
  'qari-khalid-al-jaleel': 'khalid-jalil/r1',
  'qari-khalifa-al-tunaiji': 'khalifa-tunaiji/r1',
  'syekh-mahir-al-muaiqly': 'maher-muaiqly/r1',
  'syekh-mahmoud-ali-al-banna': 'mahmoud-banna/r1',
  'syekh-mahmoud-khalil-al-hussary': 'mahmoud-husary/r1',
  'syekh-mohamed-ellhidan': 'muhammad-luhaidan/r1',
  'syekh-mohamed-tablawi': 'muhammad-tablawi/r1',
  'qari-muhammad-al-muhaisini': 'muhammad-muhaisni/r1',
  'syekh-muhammad-ayyub': 'muhammad-ayyub/r1',
  'syekh-nasser-al-qatami': 'nasser-qatami/r1',
  'syekh-saad-al-ghamidi': 'saad-ghamdi/r1',
  'syekh-salah-bukhatir': 'salah-bukhatir/r1',
  'syekh-saud-asy-syuraim': 'saud-shuraim/r1'
}
const out = []
const skipped = []
for (const id of readdirSync(src).sort()) {
  const dir = join(src, id)
  if (id.startsWith('.') || !statSync(dir).isDirectory()) continue
  const skip = (why) => skipped.push(`${id}: ${why}`)
  if (ALREADY.includes(id)) { skip('sudah tersedia dari EQuran.id'); continue }
  if (!existsSync(join(dir, 'per-surah'))) { skip('tidak ada data surah'); continue }
  let meta, items
  try {
    meta = JSON.parse(readFileSync(join(dir, 'semua-surah.json'), 'utf8'))
    items = readdirSync(join(dir, 'per-surah')).map((f) => JSON.parse(readFileSync(join(dir, 'per-surah', f), 'utf8')))
  } catch { skip('JSON rusak'); continue }
  const nums = items.map((x) => x.nomor).sort((a, b) => a - b)
  if (items.length !== 114 || nums.some((n, i) => n !== i + 1)) { skip(`surah tidak lengkap (${items.length}/114)`); continue }
  const bases = new Set()
  let bad = 0
  for (const x of items) {
    const m = /^(https:\/\/[a-z0-9.-]+\/[\w\-\/]+)\/(\d{3})\.mp3$/.exec(String(x.url_audio || ''))
    if (!m || +m[2] !== x.nomor) bad++
    else bases.add(m[1])
  }
  if (bad || bases.size !== 1) { skip('pola alamat audio tidak konsisten'); continue }
  const base = [...bases][0]
  if (!/^https:\/\/server\d{1,2}\.mp3quran\.net\//.test(base)) { skip('audio bukan di mp3quran.net (alamat tidak tetap / riwayat tidak dapat dipastikan)'); continue }
  if (/rewayat|warsh|qalon|qaloon|duri|doori|sosi|soosi|shuba|khalaf|bazi|qunbol|hisham|dakwan|yaqoob|jammaz/i.test(base)) { skip('alamat menandai riwayat khusus'); continue }
  if (!VERIFIED[id]) { skip('identitas rekaman tidak dapat dipastikan lewat API resmi mp3quran'); continue }
  const name = String(meta.nama || '').replace(/\s+/g, ' ').trim().replace(/^(syekh|qari)\s+/i, '')
  if (!name || name.length > 60) { skip('nama tidak valid'); continue }
  out.push({ id: 'x-' + id.replace(/^(syekh|qari)-/, ''), name, base, alt: 'https://cdn.mp3quran.net/audio/' + VERIFIED[id], style: /_mjwd$|mujawwad/i.test(base) ? 'mujawwad' : 'murattal' })
}
out.sort((a, b) => a.name.localeCompare(b.name))
const body = `// DIHASILKAN oleh scripts/gen-qari.mjs dari github.com/wnr-code/qori-alquran-json — jangan disunting manual.
// Qari tambahan: hanya audio SURAH PENUH (tidak ada audio per ayat). Alamat audio = \`\${base}/\${NNN}.mp3\`; \`alt\` = alamat resmi terbaru, dipakai bila alamat utama gagal.
export const QARI_EXTRA = ${JSON.stringify(out, null, 2)}
`
writeFileSync(new URL('../src/data/qari-extra.js', import.meta.url), body)
console.log(`Dipakai ${out.length} qari:`)
for (const q of out) console.log('  ✓', q.name, '→', q.base, q.style)
console.log(`Dilewati ${skipped.length}:`)
for (const s of skipped) console.log('  –', s)
