// Menyalin Doa Wudhu & Dzikir Setelah Salat dari fitrahive/dua-dhikr (MIT) APA ADANYA ke src/data/dzikir.json.
// Tidak ada teks yang ditulis/diubah di sini — hanya memilih entri dan merapikan spasi.
// Pakai: git clone https://github.com/fitrahive/dua-dhikr /tmp/dd && node scripts/gen-dzikir.mjs /tmp/dd
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const dir = process.argv[2]
if (!dir) throw new Error('Beri jalur klon fitrahive/dua-dhikr')
const load = (c) => JSON.parse(readFileSync(`${dir}/data/dua-dhikr/${c}/id.json`, 'utf8'))
const clean = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')
const map = (d) => ({ title: clean(d.title), arabic: clean(d.arabic), latin: clean(d.latin), translation: clean(d.translation), notes: clean(d.notes), fawaid: clean(d.fawaid), source: clean(d.source) })
const ok = (d) => d.title && /[\u0600-\u06FF]/.test(d.arabic) && d.translation

const wudhu = load('daily-dua').filter((d) => /wudhu/i.test(d.title)).map(map)
const salat = load('dhikr-after-salah').map(map)
for (const d of [...wudhu, ...salat]) if (!ok(d)) throw new Error('Entri tidak lengkap: ' + d.title)
if (wudhu.length !== 2 || salat.length < 10) throw new Error('Jumlah entri tidak terduga')

const commit = execSync('git rev-parse HEAD', { cwd: dir }).toString().trim()
const out = { source: { name: 'fitrahive/dua-dhikr', url: 'https://github.com/fitrahive/dua-dhikr', license: 'MIT', commit }, wudhu, salat }
writeFileSync(new URL('../src/data/dzikir.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(`dzikir.json: wudhu ${wudhu.length}, setelah salat ${salat.length} (commit ${commit.slice(0, 7)})`)
