// Tema kustom: dari tiga warna pilihan pengguna (utama, aksen, latar) diturunkan seluruh variabel warna aplikasi.
const HEX = /^#[0-9a-f]{6}$/i
export const isHex = (c) => typeof c === 'string' && HEX.test(c)
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const hex = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
/** Campuran a → b sebanyak t (0..1). */
export const mix = (a, b, t) => {
  const [x, y] = [rgb(a), rgb(b)]
  return hex(x.map((v, i) => v + (y[i] - v) * t))
}
/** Luminans relatif WCAG (0 gelap … 1 terang). */
export const luminance = (h) => {
  const [r, g, b] = rgb(h).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

export const THEME_PRESETS = [
  { id: 'zamrud', name: 'Zamrud', primary: '#0f6b4f', accent: '#b8923a', bg: '#f7f3e8' },
  { id: 'samudra', name: 'Samudra', primary: '#1a6275', accent: '#c98f3a', bg: '#f2f6f7' },
  { id: 'nila', name: 'Nila', primary: '#3b4a9e', accent: '#c9a23a', bg: '#f4f4fb' },
  { id: 'marun', name: 'Marun', primary: '#8a2c3a', accent: '#b8923a', bg: '#faf3f0' },
  { id: 'kopi', name: 'Kopi', primary: '#6b4a2b', accent: '#a8853a', bg: '#f6efe3' },
  { id: 'malam-biru', name: 'Malam Biru', primary: '#6ea8ff', accent: '#e0b85c', bg: '#0b1220' },
  { id: 'malam-ungu', name: 'Malam Ungu', primary: '#b79cff', accent: '#e0b85c', bg: '#120e1c' },
  { id: 'hitam-emas', name: 'Hitam Emas', primary: '#d4af37', accent: '#d4af37', bg: '#000000' }
]
export const CUSTOM_DEFAULT = { primary: '#1a6275', accent: '#c98f3a', bg: '#f2f6f7' }

/** Rapikan masukan (mis. dari cadangan yang diimpor): warna tidak sah diganti bawaan. */
export function normalizeCustom(c) {
  const o = c && typeof c === 'object' ? c : {}
  return { primary: isHex(o.primary) ? o.primary.toLowerCase() : CUSTOM_DEFAULT.primary, accent: isHex(o.accent) ? o.accent.toLowerCase() : CUSTOM_DEFAULT.accent, bg: isHex(o.bg) ? o.bg.toLowerCase() : CUSTOM_DEFAULT.bg }
}

/**
 * Menurunkan variabel CSS dari tema kustom. Latar gelap/terang ditentukan dari warna latar;
 * warna utama digeser seperlunya agar tetap terbaca (kontras ≥ 3 terhadap latar), kepala halaman dijaga gelap untuk teks terang.
 */
export function deriveTheme(custom) {
  const { primary: p0, accent, bg } = normalizeCustom(custom)
  // Teks terang atau gelap: pilih yang paling kontras terhadap latar; pada latar abu-abu tengah pakai putih/hitam murni.
  const best = (list) => list.reduce((x, y) => (contrast(y, bg) > contrast(x, bg) ? y : x))
  let text = best(['#f1ece0', '#1b2a23'])
  if (contrast(text, bg) < 4.5) text = best(['#ffffff', '#000000'])
  const dark = luminance(text) > 0.5
  let primary = p0
  for (let i = 0; i < 12 && contrast(primary, bg) < 3; i++) primary = mix(primary, text, 0.15)
  let hero2 = mix(p0, '#000000', dark ? 0.5 : 0.12)
  for (let i = 0; i < 12 && luminance(hero2) > 0.16; i++) hero2 = mix(hero2, '#000000', 0.15)
  const hero1 = mix(hero2, '#000000', 0.42)
  return {
    base: dark ? 'dark' : 'light',
    themeColor: hero1,
    vars: {
      '--bg': bg,
      '--surface': dark ? mix(bg, '#ffffff', 0.06) : mix(bg, '#ffffff', 0.72),
      '--surface-2': dark ? mix(bg, '#ffffff', 0.11) : mix(bg, '#000000', 0.055),
      '--text': text,
      '--muted': mix(text, bg, 0.4),
      '--primary': primary,
      '--primary-ink': contrast('#06120d', primary) > contrast('#ffffff', primary) ? '#06120d' : '#ffffff',
      '--accent': accent,
      '--gold': accent,
      '--border': dark ? mix(bg, '#ffffff', 0.17) : mix(bg, '#000000', 0.11),
      '--hero-1': hero1,
      '--hero-2': hero2,
      '--hero-ink': '#fbf7ec'
    }
  }
}
