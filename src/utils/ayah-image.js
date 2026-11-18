export const AYAH_IMAGE_WIDTH = 720
export const AYAH_IMAGE_HEIGHT = 1280

const WIDTH = AYAH_IMAGE_WIDTH
const HEIGHT = AYAH_IMAGE_HEIGHT
const SCALE = 2
const SIDE = 52
const INNER_WIDTH = WIDTH - SIDE * 2
const BODY_TOP = 312
const BODY_BOTTOM = 1052
const BODY_HEIGHT = BODY_BOTTOM - BODY_TOP
const ARABIC_FAMILY = '"Amiri Quran", "Scheherazade New", serif'
const LATIN_FAMILY = 'system-ui, -apple-system, "Segoe UI", sans-serif'

export const SHARE_IMAGE_SLOGANS = Object.freeze([
  "Hidup Berkah dalam Cahaya Al-Qur'an",
  'Al-Qur’an menuntun hati, menenangkan jiwa',
  'Dekat dengan Al-Qur’an, teguh melangkah',
  'Satu ayat, sejuta kebaikan',
  'Cahaya petunjuk untuk setiap langkah',
  'Baca, hayati, amalkan'
])

function randomShareSlogan() {
  return SHARE_IMAGE_SLOGANS[Math.floor(Math.random() * SHARE_IMAGE_SLOGANS.length)]
}

function makeTheme(id, label, scene, options) {
  const {
    backgroundStart, backgroundEnd, accent, frame = accent, innerFrame = frame,
    headerStart = backgroundStart, headerEnd = backgroundEnd, footer = backgroundStart,
    light = false, ink, arabic, latin, translation, title, subtitle, chip, chipText, glow = accent, motif = frame,
    swatch = backgroundEnd, textShadow, bodyScrim, template = null
  } = options
  const textColor = ink || (light ? '#31473f' : '#fff7e7')
  const safeBodyScrim = bodyScrim || withAlpha(light ? '#fff8ed' : '#081b20', light ? 0.42 : 0.48)
  const arabicColor = arabic || textColor
  const latinColor = latin || (light ? '#66746a' : '#d9e3df')
  const translationColor = translation || textColor
  return {
    id, label, scene, swatch, template,
    colors: {
      backgroundStart, backgroundEnd, card: light ? '#fff8ed' : '#102721',
      frame, innerFrame, headerStart, headerEnd,
      title: title || (light ? '#2e433d' : '#fff8e7'),
      subtitle: subtitle || (light ? '#66584c' : '#eee0c5'),
      accent, arabic: arabicColor, latin: latinColor, translation: translationColor,
      chip: chip || (light ? '#fffaf1' : '#102a2a'),
      chipText: chipText || textColor, divider: frame,
      brand: textColor, secondary: light ? '#66584c' : '#f1d88d',
      ornament: motif, footer, textShadow: textShadow || (light ? 'rgba(255, 250, 237, 0.72)' : 'rgba(0, 9, 18, 0.8)'),
      glow, motif, light, bodyScrim: safeBodyScrim
    }
  }
}

// The first 15 themes are drawn as original Canvas scenes. The last four retain their legacy IDs
// and use the supplied poster images directly as backgrounds, preserving those original assets.
export const AYAH_IMAGE_THEMES = [
  makeTheme('zamrud-premium', 'Zamrud Premium', 'emerald-premium', {
    backgroundStart: '#061b19', backgroundEnd: '#0c493b', accent: '#d9ac91', frame: '#dfc883',
    innerFrame: '#a47a60', footer: '#061f1b', glow: '#33a980', motif: '#c89078', swatch: '#0b4939'
  }),
  makeTheme('malam-berbintang', 'Malam Berbintang', 'starry-night', {
    backgroundStart: '#07142d', backgroundEnd: '#243c67', accent: '#f0d38d', frame: '#a9c3e5',
    footer: '#08162b', glow: '#6e89d2', motif: '#c6d5f2', swatch: '#101f42'
  }),
  makeTheme('galaksi-islami', 'Galaksi Islami', 'galaxy', {
    backgroundStart: '#090c29', backgroundEnd: '#372251', accent: '#f1c6d8', frame: '#bca7fa',
    footer: '#110f2e', glow: '#9566e8', motif: '#8fc9ed', swatch: '#261847'
  }),
  makeTheme('ramadan-lentera', 'Ramadan Lentera', 'lantern-arch', {
    backgroundStart: '#08231f', backgroundEnd: '#185541', accent: '#f3d17c', frame: '#d9b766',
    footer: '#06231e', glow: '#ffcb62', motif: '#e7c875', swatch: '#0c4938'
  }),
  makeTheme('masjid-emas', 'Masjid Emas', 'golden-mosque', {
    backgroundStart: '#0a1830', backgroundEnd: '#3e2a3d', accent: '#f1ce75', frame: '#c9a45d',
    footer: '#0a1728', glow: '#edb94e', motif: '#ead39a', swatch: '#26344c'
  }),
  makeTheme('rose-gold-luxury', 'Rose Gold Luxury', 'rose-luxury', {
    backgroundStart: '#f8e9e5', backgroundEnd: '#e6c9c5', accent: '#b87878', frame: '#bd8b7d',
    innerFrame: '#d2a996', footer: '#57383d', light: true, ink: '#523a3c', glow: '#f0bda8',
    motif: '#c39284', swatch: '#e6c9c5'
  }),
  makeTheme('fajar-damai', 'Fajar Damai', 'peaceful-dawn', {
    backgroundStart: '#fff1dc', backgroundEnd: '#e8ae8b', accent: '#c98461', frame: '#c9926c',
    footer: '#354a50', light: true, ink: '#35484a', glow: '#ffe1a2', motif: '#d5a17a', swatch: '#f4c7a8'
  }),
  makeTheme('taman-islami', 'Taman Islami', 'islamic-garden', {
    backgroundStart: '#eef3e7', backgroundEnd: '#bfd4bd', accent: '#728f71', frame: '#719177',
    footer: '#23483a', light: true, ink: '#304a3d', glow: '#d8e7be', motif: '#8ca680', swatch: '#c7d9bd'
  }),
  makeTheme('ottoman-blue', 'Ottoman Blue', 'ottoman-blue', {
    backgroundStart: '#071a39', backgroundEnd: '#164d76', accent: '#e5c574', frame: '#d8b966',
    footer: '#071b33', glow: '#4b96c6', motif: '#8eb8d1', swatch: '#12385d'
  }),
  makeTheme('champagne-minimalis', 'Champagne Minimalis', 'champagne-minimal', {
    backgroundStart: '#faf4e7', backgroundEnd: '#e9d9b9', accent: '#ad8c57', frame: '#c0a06e',
    footer: '#34483e', light: true, ink: '#3a463f', glow: '#fff9e9', motif: '#d4bd91', swatch: '#eee2c8'
  }),
  makeTheme('gurun-senja', 'Gurun Senja', 'sunset-desert', {
    backgroundStart: '#392c45', backgroundEnd: '#d58a56', accent: '#f5d28b', frame: '#e3b66e',
    footer: '#382c39', glow: '#ffc779', motif: '#efd19a', swatch: '#9b5d52',
    textShadow: 'rgba(34, 23, 38, 0.88)', bodyScrim: 'rgba(45, 31, 45, 0.48)'
  }),
  makeTheme('ramadan-ketupat', 'Ramadan Ketupat', 'ketupat-night', {
    backgroundStart: '#05272d', backgroundEnd: '#126065', accent: '#e6c875', frame: '#dbbd72',
    footer: '#05252b', glow: '#62c3a5', motif: '#f0d88d', swatch: '#0b4a50'
  }),
  makeTheme('senja-andalusia', 'Senja Andalusia', 'andalusian-dusk', {
    backgroundStart: '#211a30', backgroundEnd: '#995b55', accent: '#f0d199', frame: '#d8ad72',
    innerFrame: '#e3c295', footer: '#282035', glow: '#f4a969', motif: '#efc985', swatch: '#80504f',
    textShadow: 'rgba(29, 20, 35, 0.86)', bodyScrim: 'rgba(35, 26, 40, 0.48)'
  }),
  makeTheme('menara-safir', 'Menara Safir', 'sapphire-minaret', {
    backgroundStart: '#071a33', backgroundEnd: '#17617b', accent: '#f3d58d', frame: '#8bd0dc',
    innerFrame: '#b1e0e3', footer: '#071b31', glow: '#62bed0', motif: '#b4e4e6', swatch: '#13516d'
  }),
  makeTheme('teratai-fajar', 'Teratai Fajar', 'lotus-dawn', {
    backgroundStart: '#f4f1e5', backgroundEnd: '#bed8cf', accent: '#b98074', frame: '#78998c',
    innerFrame: '#b0c0a3', footer: '#304e49', light: true, ink: '#354c45', glow: '#ffe0b0',
    motif: '#c59286', swatch: '#c8dbd0', bodyScrim: 'rgba(250, 247, 235, 0.42)'
  }),
  // Keep the previous four selections and IDs; these are distinct Canvas illustrations now.
  makeTheme('zamrud', 'Zamrud', 'emerald-courtyard', {
    template: '/share-templates/emerald-courtyard.jpg',
    backgroundStart: '#09251e', backgroundEnd: '#1b5b43', accent: '#d7bd79', frame: '#b89156',
    footer: '#08251e', glow: '#2c8860', motif: '#dfc68b', swatch: '#14513c'
  }),
  makeTheme('malam', 'Malam', 'moonlit-minaret', {
    template: '/share-templates/cosmic-sky.jpg',
    backgroundStart: '#101b31', backgroundEnd: '#344865', accent: '#e6d49c', frame: '#b6c4d4',
    footer: '#101b2d', glow: '#9eb9de', motif: '#c5d3e4', swatch: '#243950'
  }),
  makeTheme('pasir', 'Pasir', 'parchment-manuscript', {
    template: '/share-templates/warm-cream.jpg',
    backgroundStart: '#f5ecd8', backgroundEnd: '#dfc69e', accent: '#a77d4d', frame: '#a6895c',
    footer: '#28483e', light: true, ink: '#35473d', glow: '#fff4d7', motif: '#c3a373', swatch: '#e7d4b2'
  }),
  makeTheme('ramadan', 'Ramadan', 'ramadan-green', {
    template: '/share-templates/emerald-courtyard.jpg',
    backgroundStart: '#073329', backgroundEnd: '#0d5842', accent: '#dfbf6a', frame: '#c39a4f',
    footer: '#062b23', glow: '#e3b94f', motif: '#e4ce87', swatch: '#0d4c39'
  })
]

export const SHARE_IMAGE_THEMES = AYAH_IMAGE_THEMES
export const DEFAULT_AYAH_IMAGE_THEME_ID = AYAH_IMAGE_THEMES[0].id
const DEFAULT_THEME = AYAH_IMAGE_THEMES.find((theme) => theme.id === DEFAULT_AYAH_IMAGE_THEME_ID)

/** Bungkus teks sesuai lebar canvas tanpa membuang kata atau karakter. */
export function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text ?? '').trim().split(/\s+/u).filter(Boolean)
  if (!words.length) return []

  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

function clean(value) {
  return String(value ?? '').trim()
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawStar(ctx, x, y, size, color, alpha = 0.6) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.lineTo(x + size * 0.28, y - size * 0.28)
  ctx.lineTo(x + size, y)
  ctx.lineTo(x + size * 0.28, y + size * 0.28)
  ctx.lineTo(x, y + size)
  ctx.lineTo(x - size * 0.28, y + size * 0.28)
  ctx.lineTo(x - size, y)
  ctx.lineTo(x - size * 0.28, y - size * 0.28)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawRosette(ctx, x, y, size, color, alpha = 0.3) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.1
  for (const angle of [0, Math.PI / 4]) {
    ctx.save()
    ctx.rotate(angle)
    ctx.strokeRect(-size / 2, -size / 2, size, size)
    ctx.restore()
  }
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawLantern(ctx, x, y, size, color, alpha = 0.5) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  const half = size * 0.28
  ctx.beginPath()
  ctx.moveTo(x, y - size * 0.67)
  ctx.lineTo(x, y - size * 0.39)
  ctx.moveTo(x - size * 0.12, y - size * 0.4)
  ctx.lineTo(x + size * 0.12, y - size * 0.4)
  ctx.moveTo(x - half * 0.65, y - size * 0.28)
  ctx.lineTo(x + half * 0.65, y - size * 0.28)
  ctx.moveTo(x - half, y - size * 0.23)
  ctx.quadraticCurveTo(x - half * 1.1, y, x - half * 0.66, y + size * 0.25)
  ctx.lineTo(x + half * 0.66, y + size * 0.25)
  ctx.quadraticCurveTo(x + half * 1.1, y, x + half, y - size * 0.23)
  ctx.moveTo(x - half * 0.6, y + size * 0.32)
  ctx.lineTo(x + half * 0.6, y + size * 0.32)
  ctx.stroke()
  ctx.globalAlpha = alpha * 0.16
  ctx.beginPath()
  ctx.moveTo(x, y - size * 0.17)
  ctx.lineTo(x + half * 0.55, y + size * 0.15)
  ctx.lineTo(x - half * 0.55, y + size * 0.15)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawCrescent(ctx, x, y, size, color, cutoutColor) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = cutoutColor
  ctx.beginPath()
  ctx.arc(x + size * 0.48, y - size * 0.35, size * 0.92, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Simetris kiri-kanan: garis berornamen, siluet masjid, bulan sabit, dan bintang. */
function drawMosqueDivider(ctx, x, y, palette, span = 210) {
  ctx.save()
  ctx.strokeStyle = palette.divider
  ctx.fillStyle = palette.accent
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(x - span, y)
  ctx.lineTo(x - 25, y)
  ctx.moveTo(x + 25, y)
  ctx.lineTo(x + span, y)
  ctx.stroke()

  // Masjid mini dengan dua menara dan kubah di tengah garis pemisah.
  ctx.beginPath()
  ctx.moveTo(x - 19, y + 8)
  ctx.lineTo(x + 19, y + 8)
  ctx.moveTo(x - 15, y + 7)
  ctx.lineTo(x - 15, y - 8)
  ctx.lineTo(x - 18, y - 4)
  ctx.moveTo(x + 15, y + 7)
  ctx.lineTo(x + 15, y - 8)
  ctx.lineTo(x + 18, y - 4)
  ctx.moveTo(x - 9, y + 7)
  ctx.lineTo(x - 9, y - 1)
  ctx.quadraticCurveTo(x, y - 14, x + 9, y - 1)
  ctx.lineTo(x + 9, y + 7)
  ctx.moveTo(x - 20, y + 9)
  ctx.lineTo(x + 20, y + 9)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x, y - 15)
  ctx.lineTo(x, y - 19)
  ctx.stroke()
  drawCrescent(ctx, x, y - 24, 4.2, palette.accent, palette.card)
  drawStar(ctx, x + 9, y - 23, 3, palette.accent, 0.92)
  ctx.restore()
}

function drawSmallDivider(ctx, x, y, palette) {
  ctx.save()
  ctx.strokeStyle = palette.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - 62, y)
  ctx.lineTo(x - 8, y)
  ctx.moveTo(x + 8, y)
  ctx.lineTo(x + 62, y)
  ctx.stroke()
  drawStar(ctx, x, y, 4, palette.accent, 0.78)
  ctx.restore()
}

function drawKetupat(ctx, x, y, size, color) {
  const half = size / 2
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.3
  ctx.globalAlpha = 0.16
  ctx.beginPath()
  ctx.moveTo(x, y - half)
  ctx.lineTo(x + half * 0.72, y)
  ctx.lineTo(x, y + half)
  ctx.lineTo(x - half * 0.72, y)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 0.85
  ctx.stroke()
  // Anyaman silang sederhana agar ornamen terbaca sebagai ketupat.
  for (const offset of [-0.28, 0, 0.28]) {
    ctx.beginPath()
    ctx.moveTo(x - half * 0.55, y + offset * size)
    ctx.lineTo(x + half * 0.55, y - offset * size)
    ctx.moveTo(x - half * 0.55, y - offset * size)
    ctx.lineTo(x + half * 0.55, y + offset * size)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(x, y - half)
  ctx.lineTo(x, y - half - 7)
  ctx.moveTo(x - 3, y - half - 5)
  ctx.lineTo(x, y - half - 9)
  ctx.lineTo(x + 3, y - half - 5)
  ctx.stroke()
  ctx.restore()
}

function drawBedug(ctx, x, y, width, height, palette) {
  ctx.save()
  ctx.lineWidth = 1.7
  ctx.strokeStyle = palette.accent
  ctx.fillStyle = palette.accent
  ctx.globalAlpha = 0.18
  roundRect(ctx, x - width / 2, y - height * 0.32, width, height * 0.62, height * 0.2)
  ctx.fill()
  ctx.globalAlpha = 0.9
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - width * 0.33, y - height * 0.34)
  ctx.lineTo(x - width * 0.37, y + height * 0.3)
  ctx.moveTo(x + width * 0.33, y - height * 0.34)
  ctx.lineTo(x + width * 0.37, y + height * 0.3)
  ctx.moveTo(x - width * 0.3, y + height * 0.28)
  ctx.lineTo(x - width * 0.42, y + height * 0.53)
  ctx.moveTo(x + width * 0.3, y + height * 0.28)
  ctx.lineTo(x + width * 0.42, y + height * 0.53)
  ctx.moveTo(x - width * 0.43, y + height * 0.55)
  ctx.lineTo(x - width * 0.18, y + height * 0.55)
  ctx.moveTo(x + width * 0.18, y + height * 0.55)
  ctx.lineTo(x + width * 0.43, y + height * 0.55)
  ctx.stroke()
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.arc(x - width * 0.46, y - height * 0.02, height * 0.25, -Math.PI / 2, Math.PI / 2)
  ctx.moveTo(x + width * 0.46, y - height * 0.27)
  ctx.arc(x + width * 0.46, y - height * 0.02, height * 0.25, -Math.PI / 2, Math.PI / 2)
  ctx.stroke()
  // Pemukul kecil di sisi bedug.
  ctx.beginPath()
  ctx.moveTo(x + width * 0.43, y - height * 0.35)
  ctx.lineTo(x + width * 0.62, y - height * 0.56)
  ctx.stroke()
  ctx.restore()
}

function withAlpha(color, alpha) {
  const match = /^#([\da-f]{6})$/i.exec(String(color))
  if (!match) return color
  const value = Number.parseInt(match[1], 16)
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

function drawGlow(ctx, x, y, radius, color, alpha = 0.5) {
  if (!ctx.createRadialGradient) return
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
  glow.addColorStop(0, withAlpha(color, alpha))
  glow.addColorStop(1, withAlpha(color, 0))
  ctx.save()
  ctx.fillStyle = glow
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  ctx.restore()
}

function drawOctagram(ctx, x, y, radius, color, alpha = 0.35) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.2
  for (const angle of [0, Math.PI / 4]) {
    ctx.save()
    ctx.rotate(angle)
    ctx.strokeRect(-radius * 0.72, -radius * 0.72, radius * 1.44, radius * 1.44)
    ctx.restore()
  }
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawThemeArch(ctx, cx, top, base, halfWidth, color, alpha = 0.3, lineWidth = 2) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(cx - halfWidth, base)
  ctx.lineTo(cx - halfWidth, top + halfWidth * 0.42)
  ctx.quadraticCurveTo(cx - halfWidth, top, cx, top)
  ctx.quadraticCurveTo(cx + halfWidth, top, cx + halfWidth, top + halfWidth * 0.42)
  ctx.lineTo(cx + halfWidth, base)
  ctx.stroke()
  ctx.restore()
}

function drawDome(ctx, x, baseY, width, height, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - width / 2, baseY)
  ctx.quadraticCurveTo(x - width / 2, baseY - height, x, baseY - height)
  ctx.quadraticCurveTo(x + width / 2, baseY - height, x + width / 2, baseY)
  ctx.closePath()
  ctx.fill()
}

function drawMinaret(ctx, x, baseY, width, height, color, accent) {
  ctx.save()
  ctx.fillStyle = color
  ctx.fillRect(x - width / 2, baseY - height * 0.76, width, height * 0.76)
  ctx.fillRect(x - width * 0.72, baseY - height * 0.76, width * 1.44, height * 0.08)
  drawDome(ctx, x, baseY - height * 0.75, width * 1.15, height * 0.24, color)
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.58
  ctx.fillRect(x - width * 0.12, baseY - height * 0.52, width * 0.24, height * 0.09)
  ctx.fillRect(x - width * 0.12, baseY - height * 0.32, width * 0.24, height * 0.09)
  ctx.restore()
}

function drawMosqueSilhouette(ctx, baseY, color, accent, alpha = 0.55) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.fillRect(0, baseY, WIDTH, HEIGHT - baseY)
  ctx.fillRect(186, baseY - 62, 348, 62)
  drawDome(ctx, WIDTH / 2, baseY - 58, 175, 125, color)
  drawDome(ctx, 246, baseY - 48, 94, 71, color)
  drawDome(ctx, 474, baseY - 48, 94, 71, color)
  drawDome(ctx, 170, baseY - 36, 55, 45, color)
  drawDome(ctx, 550, baseY - 36, 55, 45, color)
  drawMinaret(ctx, 112, baseY, 25, 210, color, accent)
  drawMinaret(ctx, 608, baseY, 25, 210, color, accent)
  ctx.globalAlpha = alpha * 0.66
  ctx.fillStyle = accent
  for (const x of [258, 300, 342, 378, 420, 462]) ctx.fillRect(x, baseY - 34, 5, 22)
  ctx.restore()
}

function drawDuneLayer(ctx, y, height, color, alpha = 0.5, phase = 0) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, y + height * 0.25)
  ctx.quadraticCurveTo(150, y - height * 0.42 + phase, 315, y + height * 0.08)
  ctx.quadraticCurveTo(495, y + height * 0.62 + phase, WIDTH, y - height * 0.1)
  ctx.lineTo(WIDTH, HEIGHT)
  ctx.lineTo(0, HEIGHT)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawLeaf(ctx, x, y, length, color, alpha = 0.5, angle = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(length * 0.38, -length * 0.42, length, 0)
  ctx.quadraticCurveTo(length * 0.38, length * 0.42, 0, 0)
  ctx.fill()
  ctx.globalAlpha = alpha * 0.72
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(length * 0.5, 0, length, 0)
  ctx.stroke()
  ctx.restore()
}

function drawGardenSprig(ctx, x, y, direction, palette, scale = 1) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(direction, 1)
  ctx.strokeStyle = palette.frame
  ctx.globalAlpha = 0.62
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(26 * scale, 100 * scale, 7 * scale, 250 * scale)
  ctx.quadraticCurveTo(35 * scale, 360 * scale, 4 * scale, 480 * scale)
  ctx.stroke()
  for (let i = 0; i < 7; i++) {
    const yOffset = i * 62 * scale
    const side = i % 2 ? -1 : 1
    drawLeaf(ctx, 7 * scale, yOffset, (36 + (i % 3) * 7) * scale, i % 2 ? palette.accent : palette.motif, 0.52, side * 0.5)
  }
  ctx.restore()
}

function drawFlower(ctx, x, y, radius, color, centerColor, alpha = 0.58) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6
    ctx.beginPath()
    ctx.arc(x + Math.cos(angle) * radius * 0.62, y + Math.sin(angle) * radius * 0.62, radius * 0.42, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = centerColor
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawStarField(ctx, palette, dense = false) {
  const points = [
    [36, 244, 3], [86, 284, 2], [158, 229, 3], [248, 258, 2], [472, 236, 2], [574, 282, 3], [678, 244, 2],
    [27, 364, 2], [691, 391, 3], [35, 532, 3], [685, 559, 2], [27, 719, 2], [693, 746, 3],
    [37, 901, 3], [680, 932, 2], [83, 1050, 2], [635, 1060, 3], [300, 1070, 2], [419, 1044, 2]
  ]
  for (const [x, y, size] of points) drawStar(ctx, x, y, size, palette.accent, dense ? 0.75 : 0.48)
  if (dense) {
    for (let i = 0; i < 28; i++) {
      const x = (i * 131 + 29) % WIDTH
      const y = 240 + ((i * 173 + 47) % 830)
      if ((x < 58 || x > WIDTH - 58 || y < 300 || y > 320 || y > 1030) && y < 1110) {
        ctx.save()
        ctx.globalAlpha = 0.38 + (i % 3) * 0.12
        ctx.fillStyle = palette.subtitle
        ctx.beginPath()
        ctx.arc(x, y, 1 + (i % 2), 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  }
}

function drawCloud(ctx, x, y, width, color, alpha = 0.22) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - width / 2, y)
  ctx.quadraticCurveTo(x - width * 0.36, y - 22, x - width * 0.16, y - 8)
  ctx.quadraticCurveTo(x, y - 34, x + width * 0.18, y - 8)
  ctx.quadraticCurveTo(x + width * 0.4, y - 23, x + width / 2, y)
  ctx.stroke()
  ctx.restore()
}

function drawPoolRings(ctx, palette, y = 1030) {
  ctx.save()
  ctx.globalAlpha = 0.42
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = 1.2
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(210 - i * 22, y + i * 15)
    ctx.quadraticCurveTo(WIDTH / 2, y + i * 4, 510 + i * 22, y + i * 15)
    ctx.stroke()
  }
  ctx.restore()
}

function drawThemeFrame(ctx, palette) {
  ctx.save()
  ctx.globalAlpha = 0.46
  roundRect(ctx, 18, 18, WIDTH - 36, HEIGHT - 36, 30)
  ctx.strokeStyle = palette.frame
  ctx.lineWidth = 1.6
  ctx.stroke()
  roundRect(ctx, 27, 27, WIDTH - 54, HEIGHT - 54, 25)
  ctx.strokeStyle = palette.innerFrame
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.restore()
  for (const [x, y] of [[44, 48], [WIDTH - 44, 48], [44, HEIGHT - 48], [WIDTH - 44, HEIGHT - 48]]) {
    drawOctagram(ctx, x, y, 14, palette.motif, 0.55)
  }
}

/** Draw a supplied full poster template, or the original text-free Canvas scene. */
function drawThemeBackground(ctx, theme, templateImage = null) {
  const p = theme.colors
  if (templateImage) {
    // Preserve every part of the supplied artwork and its baked-in branding within 9:16 output.
    ctx.drawImage(templateImage, 0, 0, WIDTH, HEIGHT)
    return
  }
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  background.addColorStop(0, p.backgroundStart)
  background.addColorStop(1, p.backgroundEnd)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  switch (theme.scene) {
    case 'emerald-premium':
      drawGlow(ctx, WIDTH / 2, 310, 440, p.glow, 0.3)
      drawThemeArch(ctx, WIDTH / 2, 220, 1125, 304, p.frame, 0.48, 5)
      drawThemeArch(ctx, WIDTH / 2, 248, 1084, 278, p.motif, 0.28, 1.5)
      for (const y of [308, 465, 634, 801, 968]) {
        drawOctagram(ctx, 42, y, 18, p.motif, 0.56)
        drawOctagram(ctx, WIDTH - 42, y, 18, p.motif, 0.56)
      }
      drawPoolRings(ctx, p, 1002)
      break
    case 'starry-night':
      drawGlow(ctx, 555, 314, 230, p.glow, 0.3)
      drawCrescent(ctx, 574, 325, 43, p.accent, p.backgroundStart)
      drawStarField(ctx, p, true)
      drawThemeArch(ctx, WIDTH / 2, 228, 1120, 310, p.frame, 0.2, 2)
      drawMosqueSilhouette(ctx, 1088, '#07152a', p.accent, 0.68)
      break
    case 'galaxy':
      drawGlow(ctx, 82, 412, 250, '#57a4f5', 0.48)
      drawGlow(ctx, 640, 615, 300, p.glow, 0.48)
      drawGlow(ctx, 350, 965, 275, '#d17cba', 0.24)
      drawStarField(ctx, p, true)
      ctx.save()
      ctx.globalAlpha = 0.38
      ctx.strokeStyle = p.motif
      ctx.lineWidth = 2
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.arc(642, 590, 74 + i * 22, Math.PI * 0.68, Math.PI * 1.74)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(71, 405, 65, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      drawThemeArch(ctx, WIDTH / 2, 236, 1106, 315, p.frame, 0.18, 1.5)
      break
    case 'lantern-arch':
      drawGlow(ctx, 58, 460, 150, p.glow, 0.36)
      drawGlow(ctx, WIDTH - 58, 460, 150, p.glow, 0.36)
      drawThemeArch(ctx, WIDTH / 2, 215, 1120, 312, p.frame, 0.42, 5)
      drawThemeArch(ctx, WIDTH / 2, 244, 1090, 282, p.motif, 0.24, 1.5)
      for (const [x, y, size] of [[58, 397, 64], [WIDTH - 58, 397, 64], [52, 640, 46], [WIDTH - 52, 640, 46]]) {
        ctx.save()
        ctx.globalAlpha = 0.55
        ctx.strokeStyle = p.accent
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, 222)
        ctx.lineTo(x, y - size * 0.7)
        ctx.stroke()
        ctx.restore()
        drawGlow(ctx, x, y, size * 1.45, p.glow, 0.32)
        drawLantern(ctx, x, y, size, p.accent, 0.86)
      }
      break
    case 'golden-mosque':
      drawGlow(ctx, WIDTH / 2, 876, 430, p.glow, 0.32)
      drawStarField(ctx, p, false)
      drawThemeArch(ctx, WIDTH / 2, 224, 1124, 314, p.frame, 0.22, 2)
      drawMosqueSilhouette(ctx, 1098, '#111c31', p.accent, 0.8)
      drawPoolRings(ctx, p, 1080)
      break
    case 'rose-luxury':
      drawGlow(ctx, WIDTH / 2, 604, 470, p.glow, 0.16)
      drawThemeArch(ctx, WIDTH / 2, 220, 1125, 300, p.frame, 0.44, 4)
      drawThemeArch(ctx, WIDTH / 2, 246, 1090, 276, p.motif, 0.25, 1.2)
      for (let x = 82; x < WIDTH - 52; x += 118) {
        drawOctagram(ctx, x, 258, 20, p.motif, 0.5)
        drawOctagram(ctx, x, 1076, 16, p.motif, 0.36)
      }
      for (const [x, y] of [[38, 344], [WIDTH - 38, 344], [38, 877], [WIDTH - 38, 877]]) {
        drawFlower(ctx, x, y, 14, p.accent, p.frame, 0.44)
      }
      break
    case 'peaceful-dawn':
      drawGlow(ctx, 520, 822, 280, p.glow, 0.58)
      drawCloud(ctx, 105, 635, 170, p.frame, 0.34)
      drawCloud(ctx, 600, 706, 220, p.frame, 0.28)
      drawCloud(ctx, 332, 890, 260, p.frame, 0.2)
      ctx.save()
      ctx.globalAlpha = 0.78
      ctx.fillStyle = '#f8d9a7'
      ctx.beginPath()
      ctx.arc(520, 820, 54, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      drawDuneLayer(ctx, 958, 120, '#c99473', 0.42, 14)
      drawDuneLayer(ctx, 1016, 122, '#9d7c68', 0.48, -8)
      drawMinaret(ctx, 78, 1110, 24, 156, '#6f6559', p.accent)
      drawMinaret(ctx, 642, 1110, 24, 156, '#6f6559', p.accent)
      break
    case 'islamic-garden':
      drawGlow(ctx, WIDTH / 2, 540, 360, p.glow, 0.32)
      drawThemeArch(ctx, WIDTH / 2, 222, 1122, 306, p.frame, 0.34, 3)
      drawGardenSprig(ctx, 12, 347, 1, p, 0.88)
      drawGardenSprig(ctx, WIDTH - 12, 372, -1, p, 0.88)
      for (const [x, y] of [[48, 850], [WIDTH - 48, 827], [86, 1030], [WIDTH - 86, 1010]]) {
        drawFlower(ctx, x, y, 13, p.motif, p.accent, 0.58)
      }
      break
    case 'ottoman-blue':
      drawGlow(ctx, WIDTH / 2, 270, 360, p.glow, 0.18)
      drawThemeArch(ctx, WIDTH / 2, 226, 1120, 302, p.frame, 0.32, 3)
      for (let y = 296; y <= 1010; y += 118) {
        drawOctagram(ctx, 39, y, 21, p.motif, 0.72)
        drawOctagram(ctx, WIDTH - 39, y + 54, 21, p.motif, 0.72)
      }
      for (let x = 82; x < WIDTH - 60; x += 108) {
        drawOctagram(ctx, x, 244, 17, p.accent, 0.56)
        drawOctagram(ctx, x, 1074, 17, p.accent, 0.42)
      }
      break
    case 'champagne-minimal':
      drawGlow(ctx, WIDTH / 2, 640, 430, p.glow, 0.2)
      ctx.save()
      ctx.globalAlpha = 0.62
      roundRect(ctx, 34, 34, WIDTH - 68, HEIGHT - 68, 28)
      ctx.strokeStyle = p.frame
      ctx.lineWidth = 1.3
      ctx.stroke()
      roundRect(ctx, 45, 45, WIDTH - 90, HEIGHT - 90, 24)
      ctx.strokeStyle = p.motif
      ctx.lineWidth = 0.7
      ctx.stroke()
      ctx.restore()
      drawThemeArch(ctx, WIDTH / 2, 257, 1102, 281, p.frame, 0.23, 1.5)
      for (const [x, y] of [[62, 282], [WIDTH - 62, 282], [62, 1076], [WIDTH - 62, 1076]]) {
        drawOctagram(ctx, x, y, 12, p.accent, 0.48)
      }
      break
    case 'sunset-desert':
      drawGlow(ctx, 515, 813, 305, p.glow, 0.52)
      drawStarField(ctx, p, false)
      ctx.save()
      ctx.globalAlpha = 0.88
      ctx.fillStyle = '#f9d38e'
      ctx.beginPath()
      ctx.arc(515, 817, 56, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      drawDuneLayer(ctx, 898, 155, '#bd795f', 0.7, -12)
      drawDuneLayer(ctx, 982, 126, '#9f654f', 0.76, 8)
      drawDuneLayer(ctx, 1051, 112, '#67444b', 0.9, -8)
      drawGardenSprig(ctx, 14, 746, 1, { ...p, frame: '#67494d', accent: '#ddba7b', motif: '#bd855e' }, 0.5)
      drawGardenSprig(ctx, WIDTH - 14, 746, -1, { ...p, frame: '#67494d', accent: '#ddba7b', motif: '#bd855e' }, 0.5)
      break
    case 'ketupat-night':
      drawGlow(ctx, WIDTH / 2, 324, 320, p.glow, 0.18)
      drawStarField(ctx, p, false)
      drawCrescent(ctx, WIDTH - 98, 319, 32, p.accent, p.backgroundStart)
      drawThemeArch(ctx, WIDTH / 2, 224, 1115, 312, p.frame, 0.2, 2)
      for (const [x, y, size] of [[53, 410, 43], [WIDTH - 53, 410, 43], [62, 700, 38], [WIDTH - 62, 700, 38], [42, 960, 32], [WIDTH - 42, 960, 32]]) {
        ctx.save()
        ctx.globalAlpha = 0.48
        ctx.strokeStyle = p.accent
        ctx.beginPath()
        ctx.moveTo(x, y - 96)
        ctx.lineTo(x, y - size / 2)
        ctx.stroke()
        ctx.restore()
        drawKetupat(ctx, x, y, size, p.accent)
      }
      drawBedug(ctx, WIDTH / 2, 1084, 70, 36, p)
      break
    case 'andalusian-dusk':
      drawGlow(ctx, 526, 830, 300, p.glow, 0.44)
      drawThemeArch(ctx, WIDTH / 2, 218, 1086, 306, p.frame, 0.33, 3.2)
      drawThemeArch(ctx, WIDTH / 2, 246, 1086, 276, p.motif, 0.22, 1.2)
      ctx.save()
      ctx.globalAlpha = 0.84
      ctx.fillStyle = '#f7c783'
      ctx.beginPath()
      ctx.arc(526, 833, 47, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      drawDuneLayer(ctx, 1002, 112, '#b77a67', 0.48, -10)
      drawDuneLayer(ctx, 1068, 100, '#483448', 0.8, 8)
      drawMosqueSilhouette(ctx, 1090, '#33283b', p.accent, 0.76)
      for (const x of [54, WIDTH - 54]) drawOctagram(ctx, x, 340, 17, p.motif, 0.58)
      break
    case 'sapphire-minaret':
      drawGlow(ctx, 112, 376, 215, p.glow, 0.34)
      drawGlow(ctx, WIDTH - 112, 376, 215, p.glow, 0.3)
      drawCrescent(ctx, WIDTH - 108, 342, 38, p.accent, p.backgroundStart)
      drawStarField(ctx, p, true)
      drawThemeArch(ctx, WIDTH / 2, 220, 1100, 310, p.frame, 0.26, 2.2)
      drawMosqueSilhouette(ctx, 1092, '#081e35', p.accent, 0.68)
      drawPoolRings(ctx, p, 1076)
      for (const y of [475, 665, 855]) {
        drawOctagram(ctx, 42, y, 15, p.motif, 0.56)
        drawOctagram(ctx, WIDTH - 42, y, 15, p.motif, 0.56)
      }
      break
    case 'lotus-dawn':
      drawGlow(ctx, 510, 890, 310, p.glow, 0.48)
      drawCloud(ctx, 106, 606, 188, p.frame, 0.3)
      drawCloud(ctx, 612, 708, 208, p.frame, 0.24)
      drawThemeArch(ctx, WIDTH / 2, 228, 1090, 304, p.frame, 0.28, 2.4)
      drawGardenSprig(ctx, 20, 440, 1, p, 0.7)
      drawGardenSprig(ctx, WIDTH - 20, 412, -1, p, 0.7)
      for (const [x, y, size] of [[65, 884, 20], [WIDTH - 65, 842, 17], [92, 1044, 15], [WIDTH - 92, 1024, 19]]) {
        drawFlower(ctx, x, y, size, p.motif, p.accent, 0.66)
      }
      drawPoolRings(ctx, p, 1058)
      break
    case 'emerald-courtyard':
      drawGlow(ctx, WIDTH / 2, 508, 390, p.glow, 0.24)
      drawThemeArch(ctx, WIDTH / 2, 214, 1115, 314, p.frame, 0.42, 5)
      drawThemeArch(ctx, WIDTH / 2, 245, 1080, 284, p.motif, 0.3, 1.5)
      for (const x of [43, 677]) {
        ctx.save()
        ctx.globalAlpha = 0.46
        ctx.fillStyle = p.frame
        roundRect(ctx, x - 13, 720, 26, 374, 12)
        ctx.fill()
        ctx.restore()
      }
      drawPoolRings(ctx, p, 1022)
      drawOctagram(ctx, 50, 340, 18, p.motif, 0.46)
      drawOctagram(ctx, WIDTH - 50, 340, 18, p.motif, 0.46)
      break
    case 'moonlit-minaret':
      drawGlow(ctx, 126, 340, 190, p.glow, 0.26)
      drawCrescent(ctx, 126, 342, 39, p.accent, p.backgroundStart)
      drawStarField(ctx, p, true)
      drawMosqueSilhouette(ctx, 1090, '#101a2e', p.accent, 0.72)
      drawThemeArch(ctx, WIDTH / 2, 231, 1107, 306, p.frame, 0.2, 1.6)
      break
    case 'parchment-manuscript':
      drawGlow(ctx, WIDTH / 2, 615, 440, p.glow, 0.2)
      ctx.save()
      ctx.globalAlpha = 0.62
      roundRect(ctx, 28, 28, WIDTH - 56, HEIGHT - 56, 26)
      ctx.strokeStyle = p.frame
      ctx.lineWidth = 2
      ctx.stroke()
      roundRect(ctx, 39, 39, WIDTH - 78, HEIGHT - 78, 21)
      ctx.strokeStyle = p.motif
      ctx.lineWidth = 0.8
      ctx.stroke()
      ctx.restore()
      drawThemeArch(ctx, WIDTH / 2, 252, 1095, 279, p.accent, 0.2, 1.6)
      for (const [x, y] of [[58, 256], [WIDTH - 58, 256], [58, 1081], [WIDTH - 58, 1081]]) {
        drawOctagram(ctx, x, y, 18, p.frame, 0.6)
      }
      drawDuneLayer(ctx, 1085, 72, '#d3bc91', 0.22, 6)
      break
    case 'ramadan-green':
      drawGlow(ctx, 65, 450, 136, p.glow, 0.34)
      drawGlow(ctx, WIDTH - 65, 450, 136, p.glow, 0.34)
      drawStarField(ctx, p, false)
      for (const [x, y, size] of [[64, 429, 52], [WIDTH - 64, 429, 52]]) {
        ctx.save()
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = p.accent
        ctx.beginPath()
        ctx.moveTo(x, 224)
        ctx.lineTo(x, y - size * 0.7)
        ctx.stroke()
        ctx.restore()
        drawLantern(ctx, x, y, size, p.accent, 0.8)
      }
      drawThemeArch(ctx, WIDTH / 2, 222, 1114, 311, p.frame, 0.22, 2)
      for (const y of [720, 894]) {
        drawKetupat(ctx, 42, y, 25, p.motif)
        drawKetupat(ctx, WIDTH - 42, y, 25, p.motif)
      }
      break
    default:
      drawThemeArch(ctx, WIDTH / 2, 220, 1120, 300, p.frame, 0.32, 2)
      drawStarField(ctx, p, false)
  }

  drawThemeFrame(ctx, p)
}

function drawBodyScrim(ctx, palette) {
  // A translucent inner panel preserves text contrast while keeping the illustrated scene visible.
  ctx.save()
  roundRect(ctx, SIDE, BODY_TOP - 12, WIDTH - SIDE * 2, BODY_HEIGHT + 24, 26)
  ctx.fillStyle = palette.bodyScrim
  ctx.fill()
  ctx.strokeStyle = withAlpha(palette.frame, 0.24)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

function drawTemplateBrandCover(ctx, palette) {
  // Supplied JPEGs remain the artwork background, while their oversized baked-in logos are
  // replaced with the user's latest, compact brand marks and the new footer layout.
  ctx.save()
  const header = ctx.createLinearGradient(0, 0, WIDTH, 224)
  header.addColorStop(0, palette.headerStart)
  header.addColorStop(1, palette.headerEnd)
  ctx.fillStyle = header
  ctx.fillRect(0, 0, WIDTH, 224)

  const footerColor = palette.footer || palette.backgroundStart
  const footer = ctx.createLinearGradient(0, 1084, 0, HEIGHT)
  footer.addColorStop(0, withAlpha(footerColor, 0.96))
  footer.addColorStop(1, footerColor)
  ctx.fillStyle = footer
  ctx.fillRect(0, 1084, WIDTH, HEIGHT - 1084)
  ctx.restore()
}

function drawBrandHeader(ctx, palette, brandLogo, heading, slogan) {
  roundRect(ctx, 38, 32, WIDTH - 76, 180, 24)
  const header = ctx.createLinearGradient(38, 32, WIDTH - 38, 212)
  header.addColorStop(0, palette.headerStart)
  header.addColorStop(1, palette.headerEnd)
  ctx.fillStyle = header
  ctx.fill()
  ctx.strokeStyle = palette.frame
  ctx.lineWidth = 1.5
  ctx.stroke()
  drawOctagram(ctx, 56, 51, 14, palette.motif, 0.58)
  drawOctagram(ctx, WIDTH - 56, 51, 14, palette.motif, 0.58)

  const cleanHeading = clean(heading) || 'RENUNGAN AL-QUR’AN'
  const cleanSlogan = clean(slogan) || randomShareSlogan()
  let headingX = 62
  let headingY = 139
  let headingMaxWidth = WIDTH - 126
  let sloganY = 185
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  if (brandLogo) {
    // Use the supplied transparent QuranKu logo, scaled down without cropping its tagline.
    ctx.drawImage(brandLogo, 48, 52, 180, 120)
    headingX = 260
    headingY = 104
    headingMaxWidth = WIDTH - headingX - 52
    sloganY = 156
  } else {
    ctx.fillStyle = palette.title
    ctx.font = `700 25px ${LATIN_FAMILY}`
    ctx.fillText('QuranKu', 62, 82)
    ctx.fillStyle = palette.subtitle
    ctx.font = `600 12px ${LATIN_FAMILY}`
    ctx.fillText('Teman Ibadah Harian', 64, 103)
  }

  ctx.fillStyle = palette.accent
  let headingSize = brandLogo ? 20 : 15
  ctx.font = `700 ${headingSize}px ${LATIN_FAMILY}`
  while (ctx.measureText(cleanHeading).width > headingMaxWidth && headingSize > 10) {
    headingSize--
    ctx.font = `700 ${headingSize}px ${LATIN_FAMILY}`
  }
  ctx.fillText(cleanHeading, headingX, headingY)

  ctx.save()
  ctx.globalAlpha = 0.62
  ctx.strokeStyle = palette.innerFrame
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(headingX, headingY + 15)
  ctx.lineTo(WIDTH - 64, headingY + 15)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = palette.subtitle
  let sloganSize = 12
  ctx.font = `600 ${sloganSize}px ${LATIN_FAMILY}`
  while (ctx.measureText(cleanSlogan).width > headingMaxWidth && sloganSize > 9) {
    sloganSize--
    ctx.font = `600 ${sloganSize}px ${LATIN_FAMILY}`
  }
  ctx.fillText(cleanSlogan, headingX, sloganY)
}

async function loadImage(path) {
  const image = document.createElement('img')
  const src = new URL(path, document.baseURI).href
  try {
    if (typeof image.decode === 'function') {
      image.src = src
      await image.decode()
    } else {
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = src
      })
    }
    return image.naturalWidth > 0 ? image : null
  } catch {
    return null
  }
}

function normalizeBlocks({ blocks, arabic, latin, translation, text, showLatin = true, showTranslation = true }) {
  const source = Array.isArray(blocks) && blocks.length ? blocks : [{ arabic, latin, translation: translation || text }]
  return source.map((block) => ({
    label: clean(block?.label || block?.title),
    arabic: clean(block?.arabic || block?.ar),
    latin: showLatin ? clean(block?.latin) : '',
    translation: showTranslation ? clean(block?.translation || block?.arti || block?.text) : ''
  })).filter((block) => block.label || block.arabic || block.latin || block.translation)
}

function measureShareBlocks(ctx, blocks) {
  let best = null
  for (let scale = 1; scale >= 0.075; scale -= 0.025) {
    const compact = scale < 0.42
    const dense = scale < 0.23
    const sizes = {
      arabic: Math.max(10, Math.round(60 * scale)),
      latin: Math.max(8, Math.round(21 * scale)),
      translation: Math.max(8, Math.round(26 * scale)),
      label: Math.max(8, Math.round(12 * scale))
    }
    const lineHeights = {
      arabic: Math.ceil(sizes.arabic * 1.62),
      latin: Math.ceil(sizes.latin * 1.4),
      translation: Math.ceil(sizes.translation * 1.4),
      label: Math.ceil(sizes.label * 1.25)
    }
    const segments = []
    let height = 0
    let widthFits = true
    const addText = (kind, value, direction, maxWidth) => {
      if (!value) return
      ctx.direction = direction
      ctx.font = `${kind === 'label' ? '700 ' : ''}${sizes[kind]}px ${kind === 'arabic' ? ARABIC_FAMILY : LATIN_FAMILY}`
      const lines = wrapCanvasText(ctx, value, maxWidth)
      if (!lines.length) return
      if (lines.some((line) => ctx.measureText(line).width > maxWidth)) widthFits = false
      segments.push({ kind, lines, fontSize: sizes[kind], lineHeight: lineHeights[kind], maxWidth, offset: height })
      height += lines.length * lineHeights[kind]
    }

    blocks.forEach((block, index) => {
      if (index) {
        const gap = dense ? 8 : compact ? 14 : 22
        segments.push({ kind: 'small-divider', offset: height, segmentHeight: gap })
        height += gap
      }
      if (block.label) {
        addText('label', block.label, 'ltr', INNER_WIDTH - 76)
        height += dense ? 0 : compact ? 1 : 2
      }
      if (block.arabic) {
        addText('arabic', block.arabic, 'rtl', INNER_WIDTH - 28)
        if (block.latin || block.translation) {
          // The mosque silhouette extends 28px above its line; reserve a real gap after Arabic.
          const dividerHeight = 68
          segments.push({ kind: 'mosque-divider', offset: height, segmentHeight: dividerHeight })
          height += dividerHeight
        }
      }
      if (block.latin) {
        addText('latin', block.latin, 'ltr', INNER_WIDTH - 52)
        height += dense ? 1 : compact ? 2 : 4
      }
      if (block.translation) {
        if (block.latin) height += dense ? 1 : compact ? 2 : 4
        addText('translation', block.translation, 'ltr', INNER_WIDTH - 52)
      }
    })
    best = { sizes, lineHeights, segments, contentHeight: height, scale, widthFits }
    if (height <= BODY_HEIGHT && widthFits) return best
  }
  return best
}

function resolveTheme(themeId) {
  return AYAH_IMAGE_THEMES.find((theme) => theme.id === themeId) || DEFAULT_THEME
}

function drawContent(ctx, layout, bodyY, palette) {
  for (const segment of layout.segments) {
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    if (segment.kind === 'mosque-divider') {
      drawMosqueDivider(ctx, WIDTH / 2, bodyY + segment.offset + segment.segmentHeight / 2, palette, 112)
      continue
    }
    if (segment.kind === 'small-divider') {
      drawSmallDivider(ctx, WIDTH / 2, bodyY + segment.offset + segment.segmentHeight / 2, palette)
      continue
    }
    ctx.direction = segment.kind === 'arabic' ? 'rtl' : 'ltr'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.shadowColor = palette.textShadow || 'transparent'
    ctx.shadowBlur = segment.kind === 'arabic' ? 4 : 2
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 1
    ctx.fillStyle = segment.kind === 'arabic' ? palette.arabic
      : segment.kind === 'latin' ? palette.latin
        : segment.kind === 'translation' ? palette.translation
          : palette.accent
    ctx.font = `${segment.kind === 'label' ? '700 ' : ''}${segment.fontSize}px ${segment.kind === 'arabic' ? ARABIC_FAMILY : LATIN_FAMILY}`
    segment.lines.forEach((line, index) => {
      const baseline = segment.kind === 'label' ? 0.82 : segment.kind === 'arabic' ? 0.84 : 0.82
      ctx.fillText(line, WIDTH / 2, bodyY + segment.offset + Math.round(segment.lineHeight * (index + baseline)), segment.maxWidth)
    })
  }
}

function drawBodyStars(ctx, bodyY, contentHeight, palette) {
  const decorativeAlpha = contentHeight > BODY_HEIGHT * 0.74 ? 0.36 : 0.58
  const positions = [
    [47, bodyY + 22, 5], [WIDTH - 47, bodyY + 22, 5],
    [47, bodyY + contentHeight - 18, 5], [WIDTH - 47, bodyY + contentHeight - 18, 5]
  ]
  for (const [x, y, size] of positions) drawStar(ctx, x, y, size, palette.ornament, decorativeAlpha)
}

function drawSourceLink(ctx, palette, sourceUrl, baselineY) {
  const source = String(sourceUrl ?? '').replace(/^https?:\/\//i, '').trim()
  if (!source) return
  const label = `Sumber: ${source}`
  ctx.save()
  ctx.direction = 'ltr'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  let fontSize = 11
  ctx.font = `600 ${fontSize}px ${LATIN_FAMILY}`
  while (ctx.measureText(label).width > WIDTH - 88 && fontSize > 8) {
    fontSize--
    ctx.font = `600 ${fontSize}px ${LATIN_FAMILY}`
  }
  ctx.fillStyle = palette.secondary
  ctx.shadowColor = palette.textShadow || 'transparent'
  ctx.shadowBlur = 2
  ctx.fillText(label, WIDTH / 2, baselineY)
  ctx.restore()
}

function drawPlayStoreMark(ctx, x, y, size) {
  const a = [x + 1, y + 1]
  const b = [x + 1, y + size - 1]
  const upper = [x + size * 0.62, y + size * 0.28]
  const center = [x + size * 0.43, y + size * 0.5]
  const lower = [x + size * 0.62, y + size * 0.72]
  const tip = [x + size - 1, y + size * 0.5]
  const polygon = (points, color) => {
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    points.slice(1).forEach(([px, py]) => ctx.lineTo(px, py))
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
  polygon([a, b, center], '#4285f4')
  polygon([a, upper, center], '#34a853')
  polygon([b, center, lower], '#fbbc04')
  polygon([upper, tip, lower, center], '#ea4335')
}

function drawShareFooter(ctx, palette, cigatasLogo) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, 1134)
  ctx.quadraticCurveTo(115, 1114, 247, 1140)
  ctx.quadraticCurveTo(466, 1170, WIDTH, 1128)
  ctx.lineTo(WIDTH, HEIGHT)
  ctx.lineTo(0, HEIGHT)
  ctx.closePath()
  ctx.fillStyle = palette.footer || palette.backgroundStart
  ctx.fill()
  ctx.strokeStyle = palette.frame
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(0, 1134)
  ctx.quadraticCurveTo(115, 1114, 247, 1140)
  ctx.quadraticCurveTo(466, 1170, WIDTH, 1128)
  ctx.stroke()
  ctx.strokeStyle = palette.innerFrame
  ctx.lineWidth = 0.7
  ctx.beginPath()
  ctx.moveTo(0, 1140)
  ctx.quadraticCurveTo(115, 1120, 247, 1146)
  ctx.quadraticCurveTo(466, 1176, WIDTH, 1134)
  ctx.stroke()

  const footerInk = palette.light ? '#fff8e7' : palette.title
  if (cigatasLogo) ctx.drawImage(cigatasLogo, 24, 1154, 108, 72)
  else {
    ctx.direction = 'ltr'
    ctx.textAlign = 'left'
    ctx.fillStyle = footerInk
    ctx.font = `700 15px ${LATIN_FAMILY}`
    ctx.fillText('Cigatas', 28, 1193)
    ctx.font = `700 9px ${LATIN_FAMILY}`
    ctx.fillText('#TongEureunNgaji', 28, 1208)
  }

  // Site identity stays directly below Cigatas, with the requested divider before the globe.
  ctx.save()
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = footerInk
  ctx.font = `600 10px ${LATIN_FAMILY}`
  ctx.fillText('|', 24, 1250)
  ctx.strokeStyle = footerInk
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(38, 1246, 5, 0, Math.PI * 2)
  ctx.moveTo(33, 1246)
  ctx.lineTo(43, 1246)
  ctx.moveTo(38, 1241)
  ctx.lineTo(38, 1251)
  ctx.moveTo(38, 1241)
  ctx.quadraticCurveTo(32, 1246, 38, 1251)
  ctx.moveTo(38, 1241)
  ctx.quadraticCurveTo(44, 1246, 38, 1251)
  ctx.stroke()
  ctx.fillText('quran.cgs.my.id', 47, 1250)
  ctx.restore()

  // A slim vertical rule balances the two footer identities.
  ctx.save()
  ctx.strokeStyle = withAlpha(palette.frame, 0.72)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(WIDTH / 2, 1164)
  ctx.lineTo(WIDTH / 2, 1252)
  ctx.stroke()
  ctx.restore()

  // Right-align the Play Store invitation to the same 24px outer margin as the Cigatas mark.
  drawPlayStoreMark(ctx, 550, 1180, 24)
  ctx.direction = 'ltr'
  ctx.textAlign = 'right'
  ctx.fillStyle = footerInk
  ctx.font = `700 13px ${LATIN_FAMILY}`
  ctx.fillText('Unduh APK', WIDTH - 24, 1187)
  ctx.fillStyle = palette.light ? '#f1e6cf' : palette.subtitle
  ctx.font = `600 10px ${LATIN_FAMILY}`
  ctx.fillText('Google Play · QuranKu', WIDTH - 24, 1205)
  ctx.restore()
}

/**
 * Render ayat, doa, atau dzikir langsung lewat Canvas (bukan screenshot). Pratinjau dan ekspor
 * memakai Blob yang sama; kanvas kerja 2× menghasilkan berkas akhir tepat 720×1280 piksel.
 */
export async function createShareImage({
  arabic, latin, translation, text, blocks, reference, sourceUrl,
  showLatin = true, showTranslation = true,
  heading = 'RENUNGAN AL-QUR’AN', theme = DEFAULT_AYAH_IMAGE_THEME_ID, format = 'png'
} = {}) {
  if (typeof document === 'undefined') throw new Error('Canvas tidak tersedia di perangkat ini.')

  const contentBlocks = normalizeBlocks({ blocks, arabic, latin, translation, text, showLatin, showTranslation })
  if (!contentBlocks.length) throw new Error('Teks bacaan belum tersedia.')
  const selectedTheme = resolveTheme(theme)
  const palette = selectedTheme.colors
  const outputFormat = /^(jpe?g|jpg)$/i.test(String(format)) ? 'jpg' : 'png'
  const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png'

  if (document.fonts?.load) {
    await Promise.allSettled([
      document.fonts.load(`60px "Amiri Quran"`),
      document.fonts.load(`60px "Scheherazade New"`)
    ])
  }
  const templateImage = selectedTheme.template ? await loadImage(selectedTheme.template) : null
  const [brandLogo, cigatasLogo] = await Promise.all([
    loadImage('/brand/quranku-logo.png'),
    loadImage('/cigatas-identity.png')
  ])

  const renderCanvas = document.createElement('canvas')
  renderCanvas.width = WIDTH * SCALE
  renderCanvas.height = HEIGHT * SCALE
  const ctx = renderCanvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Tidak dapat membuat gambar bacaan.')
  ctx.scale(SCALE, SCALE)

  // Template JPEG tetap dipakai sebagai ilustrasi latar; branding lamanya ditutup oleh identitas baru.
  drawThemeBackground(ctx, selectedTheme, templateImage)
  if (templateImage) drawTemplateBrandCover(ctx, palette)
  drawBodyScrim(ctx, palette)
  drawBrandHeader(ctx, palette, brandLogo, heading, randomShareSlogan())

  // Garis identitas memakai ikon masjid-bulan-bintang dengan ruang lega dari header dan chip.
  ctx.save()
  ctx.translate(0, 249)
  ctx.scale(1, 0.7)
  drawMosqueDivider(ctx, WIDTH / 2, 0, palette, 154)
  ctx.restore()
  const ref = clean(reference)
  if (ref) {
    let referenceSize = 15
    const maxReferenceWidth = WIDTH - 160
    ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    while (ctx.measureText(ref).width > maxReferenceWidth && referenceSize > 10) {
      referenceSize--
      ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    }
    const chipWidth = Math.min(WIDTH - 80, ctx.measureText(ref).width + 56)
    const chipX = (WIDTH - chipWidth) / 2
    roundRect(ctx, chipX, 260, chipWidth, 38, 19)
    ctx.fillStyle = palette.chip
    ctx.fill()
    ctx.strokeStyle = palette.innerFrame
    ctx.lineWidth = 1.4
    ctx.stroke()
    drawRosette(ctx, chipX + 17, 279, 12, palette.accent, 0.88)
    drawRosette(ctx, chipX + chipWidth - 17, 279, 12, palette.accent, 0.88)
    ctx.fillStyle = palette.chipText
    ctx.textAlign = 'center'
    ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    ctx.fillText(ref, WIDTH / 2, 284)
  }

  const layout = measureShareBlocks(ctx, contentBlocks)
  if (layout.contentHeight > BODY_HEIGHT) throw new Error('Konten terlalu panjang untuk satu gambar 9:16. Bagi menjadi beberapa bagian agar tidak ada teks yang terpotong.')
  const bodyY = Math.round(BODY_TOP + Math.max(0, (BODY_HEIGHT - layout.contentHeight) / 2))
  if (!templateImage) drawBodyStars(ctx, bodyY, layout.contentHeight, palette)
  drawContent(ctx, layout, bodyY, palette)
  drawSourceLink(ctx, palette, sourceUrl, Math.min(BODY_BOTTOM + 28, bodyY + layout.contentHeight + 20))

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  drawShareFooter(ctx, palette, cigatasLogo)

  // Ratakan latar belakang kedua sebagai pengaman PNG/JPG di WebView dan aplikasi berbagi.
  ctx.save()
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = palette.backgroundStart
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.restore()

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = WIDTH
  outputCanvas.height = HEIGHT
  const outputCtx = outputCanvas.getContext('2d', { alpha: false })
  if (!outputCtx) throw new Error('Tidak dapat menyiapkan berkas gambar.')
  outputCtx.fillStyle = palette.backgroundStart
  outputCtx.fillRect(0, 0, WIDTH, HEIGHT)
  outputCtx.imageSmoothingEnabled = true
  outputCtx.imageSmoothingQuality = 'high'
  outputCtx.drawImage(renderCanvas, 0, 0, WIDTH, HEIGHT)

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (!blob || blob.type !== mimeType) {
        reject(new Error(`Format ${outputFormat.toUpperCase()} tidak didukung.`))
        return
      }
      resolve(blob)
    }, mimeType, outputFormat === 'jpg' ? 0.94 : undefined)
  })
}

/** Nama lama dipertahankan agar pemanggil fitur ayat dan tes terdahulu tetap kompatibel. */
export const createAyahImage = createShareImage

/** Opsi gambar untuk satu ayat, dipakai bersama oleh pembaca dan Beranda. */
export function ayahImageOption({
  surahNumber, ayahNumber, arabic, latin, translation, reference, sourceUrl,
  showLatin = true, showTranslation = true, heading = 'AYAT PILIHAN HARI INI'
}) {
  return {
    filename: `quranku-ayat-${surahNumber}-${ayahNumber}.png`,
    create: ({ theme, format }) => createShareImage({
      arabic, latin, translation, showLatin, showTranslation, reference, sourceUrl, heading, theme, format
    })
  }
}
