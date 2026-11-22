#!/usr/bin/env node
// Periksa apakah situs yang sudah tayang mendukung URL bersih tanpa tanda #.
// Dipakai untuk memastikan perubahan router benar-benar sudah ter-deploy,
// bukan hanya ada di branch.
//
//   npm run check:deploy
//   npm run check:deploy -- https://domain-lain
const site = (process.argv[2] || 'https://quran.cgs.my.id').replace(/\/+$/, '')
const paths = [
  ['/', 'beranda'],
  ['/surah/2/255', 'URL bersih (fitur baru)'],
  ['/privacy.html', 'halaman statis']
]

const check = async ([path, label]) => {
  const url = site + path
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
    const type = res.headers.get('content-type') || ''
    return { path, label, status: res.status, type, ok: res.status === 200 && type.includes('text/html') }
  } catch (e) {
    return { path, label, status: 0, type: '', ok: false, error: e.message }
  }
}

const results = await Promise.all(paths.map(check))
console.log(`Memeriksa ${site}\n`)
for (const r of results) {
  const tanda = r.ok ? 'OK  ' : 'GAGAL'
  console.log(`${tanda} ${String(r.status).padEnd(4)} ${r.path.padEnd(18)} ${r.label}`)
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
