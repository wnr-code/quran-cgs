#!/usr/bin/env node
import { readFileSync } from 'node:fs'
// Periksa apakah situs yang sudah tayang mendukung URL bersih tanpa tanda #.
// Dipakai untuk memastikan perubahan router benar-benar sudah ter-deploy,
// bukan hanya ada di branch.
//
//   npm run check:deploy
//   npm run check:deploy -- https://domain-lain
const site = (process.argv[2] || 'https://quran.cgs.my.id').replace(/\/+$/, '')
// Jenis respons yang diharapkan: halaman harus text/html, berkas data harus JSON.
const paths = [
  ['/', 'beranda', 'text/html'],
  ['/surah/2/255', 'URL bersih (fitur baru)', 'text/html'],
  ['/privacy.html', 'halaman statis', 'text/html'],
  ['/buka.html', 'halaman pembuka aplikasi (peramban WhatsApp)', 'text/html'],
  ['/manifest.webmanifest', 'manifest PWA', 'html'],
  ['/version.json', 'identitas build', 'json'],
  ['/.well-known/assetlinks.json', 'App Links', 'json']
]

/**
 * Cloudflare mengalihkan /x.html → /x (dan /index.html → /). Pengalihan itu BUKAN kegagalan:
 * peramban mengikutinya dan menerima halaman yang sama. Karena itu redirect diikuti (bukan
 * 'manual'), lalu status & jenis isi diperiksa pada hasil akhirnya.
 */
const check = async ([path, label, kind = 'text/html']) => {
  const url = site + path
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) })
    const type = res.headers.get('content-type') || ''
    // Manifest bisa disajikan sebagai application/manifest+json atau JSON biasa.
    const want = kind === 'json' ? type.includes('json') : kind === 'html' ? /json|html/.test(type) : type.includes('text/html')
    return { path, label, kind, status: res.status, type, ok: res.status === 200 && want, final: new URL(res.url).pathname }
  } catch (e) {
    return { path, label, kind, status: 0, type: '', ok: false, error: e.message }
  }
}

const results = await Promise.all(paths.map(check))
console.log(`Memeriksa ${site}\n`)
for (const r of results) {
  const tanda = r.ok ? 'OK  ' : 'GAGAL'
  const dialihkan = r.final && r.final !== r.path ? ` → ${r.final}` : ''
  console.log(`${tanda} ${String(r.status).padEnd(4)} ${r.path.padEnd(30)} ${r.label}${dialihkan}`)
}
// Manifest tidak boleh lagi memakai bentuk hash lama pada pintasannya.
const manifest = results.find((r) => r.path === '/manifest.webmanifest')
if (manifest?.ok) {
  try {
    const body = await (await fetch(site + '/manifest.webmanifest', { signal: AbortSignal.timeout(15000) })).json()
    const hashShortcut = (body.shortcuts || []).find((s) => s.url.includes('#'))
    console.log(hashShortcut ? `GAGAL  pintasan manifest masih memakai hash: ${hashShortcut.url}` : 'OK    pintasan manifest memakai URL bersih')
  } catch (e) {
    console.log(`GAGAL  manifest tidak dapat dibaca sebagai JSON: ${e.message}`)
  }
}

// App Links memakai DUA domain (utama + cadangan). Keduanya harus menyajikan assetlinks.json
// dengan sidik jari yang sama; domain cadangan yang gagal membuat verifikasi di Android 7-11
// ikut gagal untuk domain utama.
try {
  const { APP } = await import('../src/config.js')
  const set = (body) => (body?.[0]?.target?.sha256_cert_fingerprints || []).slice().sort().join('|')
  const lokal = JSON.parse(readFileSync(new URL('../public/.well-known/assetlinks.json', import.meta.url), 'utf8'))
  const sidikJari = set(lokal)
  const daftar = APP.mirrors.map((m) => m.replace(/\/+$/, '')).filter((m) => m !== site)
  for (const cermin of daftar) {
    try {
      const res = await fetch(cermin + '/.well-known/assetlinks.json', { signal: AbortSignal.timeout(15000) })
      const body = await res.json()
      const sama = res.ok && sidikJari && set(body) === sidikJari
      console.log(`${sama ? 'OK  ' : 'GAGAL'} ${String(res.status).padEnd(4)} domain cadangan ${cermin} ${sama ? 'menyajikan daftar sidik jari yang sama' : 'TIDAK menyajikan assetlinks.json yang sama — tautan dari domain ini tidak akan membuka aplikasi'}`)
    } catch (e) {
      console.log(`GAGAL       domain cadangan ${cermin} tidak dapat diperiksa: ${e.message}`)
    }
  }
} catch (e) {
  console.log(`GAGAL  pemeriksaan domain cadangan gagal dijalankan: ${e.message}`)
}

const bersih = results.find((r) => r.path === '/surah/2/255')
console.log('')
if (bersih?.ok) {
  console.log('URL bersih SUDAH aktif di situs ini.')
} else {
  console.log('URL bersih BELUM aktif di situs ini.')
  console.log('Penyebab paling umum: perubahan router/Worker masih di branch dan belum di-merge + deploy.')
  console.log('Untuk menguji sebelum merge, pakai URL preview dari Cloudflare Workers Builds (PR → Checks).')
}
process.exit(bersih?.ok ? 0 : 1)
