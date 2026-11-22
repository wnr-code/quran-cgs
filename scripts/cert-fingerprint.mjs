#!/usr/bin/env node
// Cetak sidik jari SHA-256 sebuah sertifikat X.509 dalam format yang sama dengan Play Console:
// 56:45:F6:54:...:03:66
//
// Pakai untuk membandingkan sertifikat yang diunduh dari Play Console
// (Test and release -> Setup -> App signing -> Download sertifikat) dengan
// nilai di public/.well-known/assetlinks.json.
//
// Contoh:
//   npm run cert:fp -- ~/Unduhan/deployment_cert.der
//   npm run cert:fp -- certificate.pem
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function formatFingerprint(der) {
  const hex = createHash('sha256').update(der).digest('hex').toUpperCase()
  return hex.match(/.{2}/g).join(':')
}

// Hanya jalankan CLI bila berkas ini dieksekusi langsung, bukan saat diimpor tes.
const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (!isCli) {
  // diimpor sebagai modul
} else {
  main()
}

function main() {
const path = process.argv[2]
if (!path) {
  console.error('Pakai: npm run cert:fp -- <berkas.der|berkas.pem>')
  process.exit(2)
}

const raw = readFileSync(path)
const isPem = raw.includes('-----BEGIN CERTIFICATE-----')
const der = isPem
  ? Buffer.from(
      raw.toString('latin1')
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s+/g, ''),
      'base64'
    )
  : raw

const fingerprint = formatFingerprint(der)

// Sertifikat Google Play biasanya bernama CN=Android, O=Google Inc.
const text = der.toString('latin1')
const utf8 = der.toString('utf8')
const hint = /Android/.test(text) ? 'Android' : /Android/.test(utf8) ? 'Android' : 'tidak dikenal'

console.log(`berkas      : ${path}`)
console.log(`format      : ${isPem ? 'PEM' : 'DER'}`)
console.log(`SHA-256     : ${fingerprint}`)
console.log(`dikenali    : ${hint}`)
console.log('')

const assetlinks = JSON.parse(
  readFileSync(new URL('../public/.well-known/assetlinks.json', import.meta.url), 'utf8')
)
const expected = assetlinks[0].target.sha256_cert_fingerprints[0]
const same = expected.toUpperCase() === fingerprint
console.log(`assetlinks  : ${expected}`)
console.log(same ? 'COCOK — sertifikat ini sama dengan isi assetlinks.json.' : 'BEDA — assetlinks.json berisi kunci lain.')
process.exit(0)
}
