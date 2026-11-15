// Menghasilkan ikon PWA/Android & materi grafis Play Store dari SVG (tanpa aset pihak ketiga).
import sharp from 'sharp'
import opentype from 'opentype.js'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
mkdirSync(root + 'public/icons', { recursive: true })
mkdirSync(root + 'store/graphics', { recursive: true })

const FOREST = '#0b3d2e'
const EMERALD = '#0f6b4f'
const GOLD = '#c9a961'
const IVORY = '#fbf7ec'

/** Emblem: bintang delapan (rub el hizb) + mushaf terbuka, digambar pada kanvas 512. scale mengatur zona aman. */
const emblem = (scale = 1) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <g fill="none" stroke="${GOLD}" stroke-width="11" stroke-linejoin="round">
      <rect x="112" y="112" width="288" height="288" rx="22"/>
      <rect x="112" y="112" width="288" height="288" rx="22" transform="rotate(45 256 256)"/>
    </g>
    <circle cx="256" cy="256" r="118" fill="${EMERALD}"/>
    <circle cx="256" cy="256" r="118" fill="none" stroke="${GOLD}" stroke-width="5" stroke-opacity=".55"/>
    <path d="M256 216c-22-16-48-20-76-17v104c28-3 54 1 76 17 22-16 48-20 76-17V199c-28-3-54 1-76 17Z" fill="${IVORY}"/>
    <path d="M256 216v104" stroke="${FOREST}" stroke-width="9" stroke-linecap="round"/>
    <g stroke="${EMERALD}" stroke-width="6" stroke-linecap="round" opacity=".55">
      <path d="M200 232c14 0 26 3 38 9M200 256c14 0 26 3 38 9M312 232c-14 0-26 3-38 9M312 256c-14 0-26 3-38 9"/>
    </g>
  </g>`

const bg = (rx) => `<defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#12543f"/><stop offset="1" stop-color="${FOREST}"/></radialGradient></defs><rect width="512" height="512" rx="${rx}" fill="url(#g)"/>`
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${inner}</svg>`

const iconAny = svg(bg(112) + emblem(1.05))
const iconFull = svg(bg(0) + emblem(1.05)) // Play Store: persegi penuh (Play menerapkan mask sendiri)
const iconMaskable = svg(bg(0) + emblem(0.78)) // zona aman 80%
const badge = svg(`<g fill="none" stroke="#fff" stroke-width="30" stroke-linejoin="round"><rect x="112" y="112" width="288" height="288" rx="22"/><rect x="112" y="112" width="288" height="288" rx="22" transform="rotate(45 256 256)"/></g><circle cx="256" cy="256" r="70" fill="#fff"/>`)

const png = (src, size, out) => sharp(Buffer.from(src)).resize(size, size).png({ compressionLevel: 9 }).toFile(root + out)

await png(iconAny, 192, 'public/icons/icon-192.png')
await png(iconAny, 512, 'public/icons/icon-512.png')
await png(iconMaskable, 192, 'public/icons/maskable-192.png')
await png(iconMaskable, 512, 'public/icons/maskable-512.png')
await png(iconFull, 180, 'public/icons/apple-touch-icon.png')
await png(badge, 96, 'public/icons/badge-96.png')
await png(iconFull, 512, 'store/graphics/icon-512.png')
writeFileSync(root + 'public/icons/favicon.svg', iconAny)

// Ikon launcher & splash Android (TWA)
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(dens)) {
  const dir = `android/app/src/main/res/mipmap-${d}`
  mkdirSync(root + dir, { recursive: true })
  await png(iconAny, Math.round(48 * k), `${dir}/ic_launcher.png`)
  await png(iconMaskable, Math.round(108 * k), `${dir}/ic_launcher_foreground.png`)
  const ddir = `android/app/src/main/res/drawable-${d}`
  mkdirSync(root + ddir, { recursive: true })
  await png(svg(emblem(1.05)), Math.round(160 * k), `${ddir}/splash.png`)
  await png(badge, Math.round(24 * k), `${ddir}/ic_notification_icon.png`)
}

// Feature graphic 1024×500 (teks diubah menjadi path agar tidak bergantung font sistem)
const font = opentype.parse(readFileSync(root + 'node_modules/@fontsource/scheherazade-new/files/scheherazade-new-latin-700-normal.woff').buffer)
const font2 = opentype.parse(readFileSync(root + 'node_modules/@fontsource/scheherazade-new/files/scheherazade-new-latin-400-normal.woff').buffer)
const title = font.getPath('QuranKu', 440, 250, 120).toPathData(2)
const tag1 = font2.getPath("Al-Qur'an digital — mushaf, terjemahan,", 444, 320, 36).toPathData(2)
const tag2 = font2.getPath('tafsir, murottal & offline', 444, 366, 36).toPathData(2)
const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${FOREST}"/><stop offset="1" stop-color="${EMERALD}"/></linearGradient>
  <pattern id="p" width="72" height="72" patternUnits="userSpaceOnUse"><g fill="none" stroke="${GOLD}" stroke-opacity=".14"><rect x="22" y="22" width="28" height="28"/><rect x="22" y="22" width="28" height="28" transform="rotate(45 36 36)"/><path d="M0 36h16M56 36h16M36 0v16M36 56v16"/></g></pattern></defs>
  <rect width="1024" height="500" fill="url(#f)"/><rect width="1024" height="500" fill="url(#p)"/>
  <g transform="translate(60 70) scale(.703)">${emblem(1.1)}</g>
  <path d="${title}" fill="${IVORY}"/><path d="${tag1}" fill="${GOLD}"/><path d="${tag2}" fill="${GOLD}"/>
</svg>`
await sharp(Buffer.from(feature)).png({ compressionLevel: 9 }).toFile(root + 'store/graphics/feature-graphic-1024x500.png')
console.log('Ikon & grafis dibuat.')
