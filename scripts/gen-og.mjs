// Gambar cuplikan tautan (Open Graph) 1200×630 untuk WhatsApp, Facebook, Telegram, X, dll. → public/og-image.jpg
// Isi penting diletakkan di tengah agar tetap utuh saat dipotong persegi. Teks diubah menjadi path (tanpa font sistem).
import sharp from 'sharp'
import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url).pathname
const FOREST = '#0b3d2e', EMERALD = '#0f6b4f', GOLD = '#c9a961', IVORY = '#fbf7ec'
const W = 1200, H = 630
const load = (w) => opentype.parse(readFileSync(root + `node_modules/@fontsource/scheherazade-new/files/scheherazade-new-latin-${w}-normal.woff`).buffer)
const bold = load(700), regular = load(400)
const centered = (font, text, y, size) => font.getPath(text, (W - font.getAdvanceWidth(text, size)) / 2, y, size).toPathData(2)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${FOREST}"/><stop offset="1" stop-color="${EMERALD}"/></linearGradient>
  <pattern id="p" width="72" height="72" patternUnits="userSpaceOnUse"><g fill="none" stroke="${GOLD}" stroke-opacity=".14"><rect x="22" y="22" width="28" height="28"/><rect x="22" y="22" width="28" height="28" transform="rotate(45 36 36)"/><path d="M0 36h16M56 36h16M36 0v16M36 56v16"/></g></pattern></defs>
  <rect width="${W}" height="${H}" fill="url(#f)"/><rect width="${W}" height="${H}" fill="url(#p)"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="26" fill="none" stroke="${GOLD}" stroke-opacity=".55" stroke-width="2"/>
  <path d="${centered(bold, 'QuranKu', 440, 104)}" fill="${IVORY}"/>
  <path d="${centered(regular, "Al-Qur'an Digital Indonesia", 498, 42)}" fill="${GOLD}"/>
  <path d="${centered(regular, 'Mushaf · Terjemahan · Tafsir · Murottal · Jadwal Salat', 556, 30)}" fill="${IVORY}" fill-opacity=".86"/>
</svg>`
await sharp(Buffer.from(svg))
  .composite([{ input: await sharp(root + 'assets/logo-source.png').resize(270, 270).png().toBuffer(), left: (W - 270) / 2, top: 52 }])
  .removeAlpha()
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(root + 'public/og-image.jpg')
console.log('public/og-image.jpg dibuat.')
