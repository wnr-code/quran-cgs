// Menghasilkan ikon PWA/Android & materi grafis Play Store dari logo resmi (assets/logo-source.png).
import sharp from 'sharp'
import opentype from 'opentype.js'
import { mkdirSync, readFileSync } from 'node:fs'

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

const badge = svg(`<g fill="none" stroke="#fff" stroke-width="30" stroke-linejoin="round"><rect x="112" y="112" width="288" height="288" rx="22"/><rect x="112" y="112" width="288" height="288" rx="22" transform="rotate(45 256 256)"/></g><circle cx="256" cy="256" r="70" fill="#fff"/>`)

const png = (src, size, out) => sharp(Buffer.from(src)).resize(size, size).png({ compressionLevel: 9 }).toFile(root + out)

// PENTING: nama berkas ikon web diberi akhiran versi (-v2). Bila logo diganti lagi, naikkan akhirannya di sini,
// di public/manifest.webmanifest, index.html, dan vite.config.js — PWA yang sudah terpasang hanya mengganti ikonnya
// bila ALAMAT ikon di manifest berubah (berkas bernama sama dianggap tidak berubah oleh peramban).
// Logo resmi (assets/logo-source.png, 1254×1254, sudut transparan). Semua ikon aplikasi diturunkan dari berkas ini.
const LOGO = readFileSync(root + 'assets/logo-source.png')
// Layar pembuka memakai wordmark terpisah (public/brand/quranku-logo.png, 768×512, latar transparan).
// Ikon launcher, ikon notifikasi, dan materi Play Store tetap diturunkan dari LOGO di atas.
const SPLASH_LOGO = readFileSync(root + 'public/brand/quranku-logo.png')
const out = (img, file) => img.png({ compressionLevel: 9, palette: false }).toFile(root + file)
/** Logo apa adanya (sudut membulat transparan). */
const logoAny = (size, file) => out(sharp(LOGO).resize(size, size), file)
/**
 * Logo di atas latar penuh tanpa transparansi. Latar = bagian tengah logo yang diperbesar dan dikaburkan, sehingga
 * warnanya menyatu. scale < 1 menyisakan zona aman untuk mask (maskable 80%, ikon adaptif Android ±66%).
 */
async function logoFull(size, file, scale = 1) {
  const bgBuf = await sharp(LOGO).extract({ left: 380, top: 60, width: 500, height: 300 }).resize(size, size, { fit: 'fill' }).blur(Math.max(2, size / 6)).flatten({ background: FOREST }).png().toBuffer()
  const inner = Math.round(size * scale)
  const fg = await sharp(LOGO).resize(inner, inner).png().toBuffer()
  const off = Math.round((size - inner) / 2)
  return out(sharp(bgBuf).composite([{ input: fg, left: off, top: off }]).removeAlpha(), file)
}

async function androidSplash(width, height, file) {
  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#12543f"/><stop offset="1" stop-color="${FOREST}"/></linearGradient>
    <pattern id="ornament" width="72" height="72" patternUnits="userSpaceOnUse"><g fill="none" stroke="${GOLD}" stroke-opacity=".14"><rect x="22" y="22" width="28" height="28"/><rect x="22" y="22" width="28" height="28" transform="rotate(45 36 36)"/><path d="M0 36h16M56 36h16M36 0v16M36 56v16"/></g></pattern></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/><rect width="100%" height="100%" fill="url(#ornament)"/>
  </svg>`
  const logo = await sharp(SPLASH_LOGO).resize({ width: Math.round(Math.min(width, height) * 0.62), fit: 'inside' }).png().toBuffer()
  const logoMeta = await sharp(logo).metadata()
  return sharp(Buffer.from(background))
    .composite([{ input: logo, left: Math.round((width - logoMeta.width) / 2), top: Math.round((height - logoMeta.height) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(root + file)
}

/** Kanvas persegi transparan berisi wordmark splash, dipakai drawable splash berdensitas. */
async function splashArt(size, file) {
  const logo = await sharp(SPLASH_LOGO).resize({ width: Math.round(size * 0.92), fit: 'inside' }).png().toBuffer()
  const logoMeta = await sharp(logo).metadata()
  return out(
    sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: logo, left: Math.round((size - logoMeta.width) / 2), top: Math.round((size - logoMeta.height) / 2) }]),
    file
  )
}

/**
 * Ikon splash sistem Android 12+ (windowSplashScreenAnimatedIcon). Konten dibatasi ke lingkaran aman
 * 2/3 kanvas supaya wordmark tidak terpotong mask bulat, dan tetap transparan di luar logo.
 */
async function splashBrand(size, file) {
  const logo = await sharp(SPLASH_LOGO).resize({ width: Math.round(size * 0.62), fit: 'inside' }).png().toBuffer()
  const logoMeta = await sharp(logo).metadata()
  return out(
    sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: logo, left: Math.round((size - logoMeta.width) / 2), top: Math.round((size - logoMeta.height) / 2) }]),
    file
  )
}

await logoAny(192, 'public/icons/icon-192-v2.png')
await logoAny(512, 'public/icons/icon-512-v2.png')
await logoAny(48, 'public/icons/favicon-48-v2.png')
await logoFull(192, 'public/icons/maskable-192-v2.png', 0.8)
await logoFull(512, 'public/icons/maskable-512-v2.png', 0.8)
await logoFull(180, 'public/icons/apple-touch-icon-v2.png')
await png(badge, 96, 'public/icons/badge-96-v2.png')
await logoFull(512, 'store/graphics/icon-512.png')

// Capacitor Android launcher, adaptive icon, and orientation-specific splash resources.
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(dens)) {
  const dir = `android/app/src/main/res/mipmap-${d}`
  mkdirSync(root + dir, { recursive: true })
  await logoAny(Math.round(48 * k), `${dir}/ic_launcher.png`)
  await logoAny(Math.round(48 * k), `${dir}/ic_launcher_round.png`)
  await logoFull(Math.round(108 * k), `${dir}/ic_launcher_foreground.png`, 0.66)
  const ddir = `android/app/src/main/res/drawable-${d}`
  mkdirSync(root + ddir, { recursive: true })
  await splashArt(Math.round(160 * k), `${ddir}/splash.png`)
  await png(badge, Math.round(24 * k), `${ddir}/ic_notification_icon.png`)
  await androidSplash(Math.round(480 * k), Math.round(320 * k), `android/app/src/main/res/drawable-land-${d}/splash.png`)
  await androidSplash(Math.round(320 * k), Math.round(480 * k), `android/app/src/main/res/drawable-port-${d}/splash.png`)
}
await androidSplash(480, 320, 'android/app/src/main/res/drawable/splash.png')
await splashBrand(512, 'android/app/src/main/res/drawable/splash_brand.png')

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
  <path d="${title}" fill="${IVORY}"/><path d="${tag1}" fill="${GOLD}"/><path d="${tag2}" fill="${GOLD}"/>
</svg>`
await sharp(Buffer.from(feature))
  .composite([{ input: await sharp(LOGO).resize(340, 340).png().toBuffer(), left: 70, top: 80 }])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(root + 'store/graphics/feature-graphic-1024x500.png')
console.log('Ikon & grafis dibuat.')
