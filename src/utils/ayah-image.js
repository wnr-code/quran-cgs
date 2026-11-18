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

export const AYAH_IMAGE_THEMES = [
  {
    id: 'zamrud',
    label: 'Zamrud',
    swatch: '#0f6b4f',
    template: '/share-templates/emerald-courtyard.jpg',
    colors: {
      backgroundStart: '#062b29', backgroundEnd: '#061d2a', card: '#082d2b',
      frame: '#d9b75c', innerFrame: '#9b7a37', headerStart: '#062b29', headerEnd: '#145d46',
      title: '#fff8e6', subtitle: '#f5e5ba', accent: '#e2bd61', arabic: '#f5e4b6',
      latin: '#e5dfce', translation: '#fff9eb', chip: '#062b29', chipText: '#fff0bd', divider: '#d4b65f',
      brand: '#31513f', secondary: '#f1d88d', ornament: '#dfbd63', footer: '#062723', textShadow: 'rgba(0, 10, 12, 0.78)'
    }
  },
  {
    id: 'malam',
    label: 'Malam',
    swatch: '#273d68',
    template: '/share-templates/cosmic-sky.jpg',
    colors: {
      backgroundStart: '#071a35', backgroundEnd: '#1f3e58', card: '#10243b',
      frame: '#e6c878', innerFrame: '#738599', headerStart: '#0b1425', headerEnd: '#2c4162',
      title: '#fffaf0', subtitle: '#d9d5ca', accent: '#f0d483', arabic: '#fff6db',
      latin: '#e4e9ef', translation: '#fffdf5', chip: '#081b31', chipText: '#fff0c2', divider: '#e1c476',
      brand: '#fff4d9', secondary: '#f0dcaa', ornament: '#f0d483', footer: '#071829',
      textShadow: 'rgba(2, 11, 24, 0.9)', contentScrim: true
    }
  },
  {
    id: 'pasir',
    label: 'Pasir',
    swatch: '#9a673a',
    template: '/share-templates/warm-cream.jpg',
    colors: {
      backgroundStart: '#f5ead5', backgroundEnd: '#e8d1ad', card: '#fff8eb',
      frame: '#ad7f43', innerFrame: '#e7d3b3', headerStart: '#69452e', headerEnd: '#92663f',
      title: '#fffaf2', subtitle: '#f1dfc5', accent: '#a77739', arabic: '#21463a',
      latin: '#667468', translation: '#33473d', chip: '#fff7e7', chipText: '#2c493d', divider: '#bd9859',
      brand: '#62452f', secondary: '#4e5a50', ornament: '#a87843', footer: '#092824',
      textShadow: 'rgba(255, 249, 232, 0.86)'
    }
  },
  {
    id: 'ramadan',
    label: 'Ramadan',
    swatch: '#0b5b46',
    template: '/share-templates/emerald-courtyard.jpg',
    colors: {
      backgroundStart: '#062b29', backgroundEnd: '#061d2a', card: '#082d2b',
      frame: '#e3bd59', innerFrame: '#a48542', headerStart: '#073d32', headerEnd: '#0b684d',
      title: '#fff9e8', subtitle: '#f0dfa9', accent: '#e0bb5c', arabic: '#f5e4b6',
      latin: '#e5dfce', translation: '#fff9eb', chip: '#062b29', chipText: '#fff0bd', divider: '#dfbd60',
      brand: '#31513f', secondary: '#f1d88d', ornament: '#c99734', footer: '#062723',
      textShadow: 'rgba(0, 10, 12, 0.82)'
    }
  }
]

export const SHARE_IMAGE_THEMES = AYAH_IMAGE_THEMES
const DEFAULT_THEME = AYAH_IMAGE_THEMES[0]

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

function normalizeBlocks({ blocks, arabic, latin, translation, text }) {
  const source = Array.isArray(blocks) && blocks.length ? blocks : [{ arabic, latin, translation: translation || text }]
  return source.map((block) => ({
    label: clean(block?.label || block?.title),
    arabic: clean(block?.arabic || block?.ar),
    latin: clean(block?.latin),
    translation: clean(block?.translation || block?.arti || block?.text)
  })).filter((block) => block.label || block.arabic || block.latin || block.translation)
}

function measureShareBlocks(ctx, blocks) {
  let best = null
  for (let scale = 1; scale >= 0.19; scale -= 0.025) {
    const sizes = {
      arabic: Math.max(14, Math.round(60 * scale)),
      latin: Math.max(10, Math.round(21 * scale)),
      translation: Math.max(10, Math.round(26 * scale)),
      label: Math.max(10, Math.round(12 * scale))
    }
    const lineHeights = {
      arabic: Math.ceil(sizes.arabic * 1.62),
      latin: Math.ceil(sizes.latin * 1.5),
      translation: Math.ceil(sizes.translation * 1.48),
      label: Math.ceil(sizes.label * 1.35)
    }
    const segments = []
    let height = 0
    const addText = (kind, value, direction, maxWidth) => {
      if (!value) return
      ctx.direction = direction
      ctx.font = `${kind === 'label' ? '700 ' : ''}${sizes[kind]}px ${kind === 'arabic' ? ARABIC_FAMILY : LATIN_FAMILY}`
      const lines = wrapCanvasText(ctx, value, maxWidth)
      if (!lines.length) return
      segments.push({ kind, lines, fontSize: sizes[kind], lineHeight: lineHeights[kind], offset: height })
      height += lines.length * lineHeights[kind]
    }

    blocks.forEach((block, index) => {
      if (index) {
        segments.push({ kind: 'small-divider', offset: height, segmentHeight: 22 })
        height += 22
      }
      if (block.label) {
        addText('label', block.label, 'ltr', INNER_WIDTH - 76)
        height += 2
      }
      if (block.arabic) {
        addText('arabic', block.arabic, 'rtl', INNER_WIDTH - 28)
        if (block.latin || block.translation) {
          segments.push({ kind: 'mosque-divider', offset: height, segmentHeight: 38 })
          height += 38
        }
      }
      if (block.latin) {
        addText('label', 'LATIN', 'ltr', INNER_WIDTH - 76)
        height += 1
        addText('latin', block.latin, 'ltr', INNER_WIDTH - 52)
        height += 4
      }
      if (block.translation) {
        addText('label', block.latin ? 'ARTI / TERJEMAHAN' : 'TERJEMAHAN', 'ltr', INNER_WIDTH - 76)
        height += 1
        addText('translation', block.translation, 'ltr', INNER_WIDTH - 52)
      }
    })
    best = { sizes, lineHeights, segments, contentHeight: height }
    if (height <= BODY_HEIGHT) return best
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
      ctx.fillText(line, WIDTH / 2, bodyY + segment.offset + Math.round(segment.lineHeight * (index + baseline)))
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

function drawRamadanFooter(ctx, palette) {
  drawKetupat(ctx, 268, 1164, 27, palette.accent)
  drawBedug(ctx, WIDTH / 2, 1167, 62, 31, palette)
  drawKetupat(ctx, WIDTH - 268, 1164, 27, palette.accent)
  drawStar(ctx, WIDTH / 2, 1124, 4, palette.accent, 0.8)
}

function drawCoverTemplate(ctx, image) {
  const scale = Math.max(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight)
  const sourceWidth = WIDTH / scale
  const sourceHeight = HEIGHT / scale
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, WIDTH, HEIGHT)
}

function drawContentScrim(ctx) {
  const gradient = ctx.createLinearGradient(0, BODY_TOP - 18, 0, BODY_BOTTOM + 18)
  gradient.addColorStop(0, 'rgba(3, 17, 38, 0.18)')
  gradient.addColorStop(0.56, 'rgba(3, 17, 38, 0.31)')
  gradient.addColorStop(1, 'rgba(3, 17, 38, 0.52)')
  ctx.save()
  roundRect(ctx, 38, BODY_TOP - 18, WIDTH - 76, BODY_HEIGHT + 36, 28)
  ctx.fillStyle = gradient
  ctx.fill()
  ctx.restore()
}

function drawTemplateFooter(ctx, palette, cigatasLogo, sourceUrl, isRamadan) {
  const source = String(sourceUrl ?? '').replace(/^https?:\/\//i, '')
  ctx.save()
  ctx.direction = 'ltr'
  ctx.textAlign = 'right'
  ctx.fillStyle = palette.secondary
  ctx.font = `8px ${LATIN_FAMILY}`
  ctx.fillText(source, WIDTH - 38, 1101)

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

  if (cigatasLogo) ctx.drawImage(cigatasLogo, 18, 1135, 210, 140)
  else {
    ctx.textAlign = 'left'
    ctx.fillStyle = palette.title
    ctx.font = `700 18px ${LATIN_FAMILY}`
    ctx.fillText('Cigatas', 28, 1191)
    ctx.font = `700 11px ${LATIN_FAMILY}`
    ctx.fillText('#TongEureunNgaji', 28, 1211)
  }

  const globeX = 495
  const globeY = 1204
  const globeRadius = 15
  ctx.strokeStyle = palette.title
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(globeX, globeY, globeRadius, 0, Math.PI * 2)
  ctx.moveTo(globeX - globeRadius, globeY)
  ctx.lineTo(globeX + globeRadius, globeY)
  ctx.moveTo(globeX, globeY - globeRadius)
  ctx.lineTo(globeX, globeY + globeRadius)
  ctx.moveTo(globeX, globeY - globeRadius)
  ctx.quadraticCurveTo(globeX - 18, globeY, globeX, globeY + globeRadius)
  ctx.moveTo(globeX, globeY - globeRadius)
  ctx.quadraticCurveTo(globeX + 18, globeY, globeX, globeY + globeRadius)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(520, 1183)
  ctx.lineTo(520, 1225)
  ctx.stroke()
  ctx.direction = 'ltr'
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.title
  ctx.font = `600 18px ${LATIN_FAMILY}`
  ctx.fillText('quran.cgs.my.id', 533, 1211)

  if (isRamadan) {
    drawKetupat(ctx, 288, 1200, 24, palette.accent)
    drawBedug(ctx, WIDTH / 2, 1201, 52, 28, palette)
    drawKetupat(ctx, 432, 1200, 24, palette.accent)
  }
  ctx.restore()
}

/**
 * Render ayat, doa, atau dzikir langsung lewat Canvas (bukan screenshot). Pratinjau dan ekspor
 * memakai Blob yang sama; kanvas kerja 2× menghasilkan berkas akhir tepat 720×1280 piksel.
 */
export async function createShareImage({
  arabic, latin, translation, text, blocks, reference, sourceUrl,
  heading = 'RENUNGAN AL-QUR’AN', theme = 'zamrud', format = 'png'
} = {}) {
  if (typeof document === 'undefined') throw new Error('Canvas tidak tersedia di perangkat ini.')

  const contentBlocks = normalizeBlocks({ blocks, arabic, latin, translation, text })
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
  const [quranLogo, cigatasLogo] = await Promise.all([
    templateImage ? Promise.resolve(null) : loadImage('/icons/icon-192-v2.png'),
    loadImage('/cigatas-identity.png')
  ])

  const renderCanvas = document.createElement('canvas')
  renderCanvas.width = WIDTH * SCALE
  renderCanvas.height = HEIGHT * SCALE
  const ctx = renderCanvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Tidak dapat membuat gambar bacaan.')
  ctx.scale(SCALE, SCALE)

  // Template pengguna dipakai sebagai latar penuh; jalur ilustrasi Canvas tetap menjadi fallback.
  if (templateImage) {
    ctx.fillStyle = palette.backgroundStart
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    drawCoverTemplate(ctx, templateImage)
    if (palette.contentScrim) drawContentScrim(ctx)
  } else {
    // Latar dan bingkai digambar penuh agar tidak ada piksel transparan di tepi.
    const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
    background.addColorStop(0, palette.backgroundStart)
    background.addColorStop(1, palette.backgroundEnd)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    drawRosette(ctx, 22, 22, 42, palette.ornament, 0.5)
    drawRosette(ctx, WIDTH - 22, 22, 42, palette.ornament, 0.5)
    drawRosette(ctx, 22, HEIGHT - 22, 42, palette.ornament, 0.5)
    drawRosette(ctx, WIDTH - 22, HEIGHT - 22, 42, palette.ornament, 0.5)

    roundRect(ctx, 24, 24, WIDTH - 48, HEIGHT - 48, 30)
    ctx.fillStyle = palette.card
    ctx.fill()
    ctx.strokeStyle = palette.frame
    ctx.lineWidth = 2
    ctx.stroke()
    roundRect(ctx, 32, 32, WIDTH - 64, HEIGHT - 64, 25)
    ctx.strokeStyle = palette.innerFrame
    ctx.lineWidth = 1
    ctx.stroke()

    // Panel QuranKu di bagian atas, lentera dan bintang digambar simetris pada semua tema.
    roundRect(ctx, 42, 42, WIDTH - 84, 184, 23)
    const header = ctx.createLinearGradient(42, 42, WIDTH - 42, 226)
    header.addColorStop(0, palette.headerStart)
    header.addColorStop(1, palette.headerEnd)
    ctx.fillStyle = header
    ctx.fill()
    drawLantern(ctx, 84, 124, 39, palette.accent, 0.78)
    drawLantern(ctx, WIDTH - 84, 124, 39, palette.accent, 0.78)
    drawStar(ctx, 131, 67, 4.5, palette.subtitle, 0.74)
    drawStar(ctx, WIDTH - 131, 67, 4.5, palette.subtitle, 0.74)
    drawStar(ctx, 139, 190, 3.5, palette.accent, 0.7)
    drawStar(ctx, WIDTH - 139, 190, 3.5, palette.accent, 0.7)
    if (quranLogo) ctx.drawImage(quranLogo, WIDTH / 2 - 41, 47, 82, 82)
    ctx.direction = 'ltr'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = palette.subtitle
    ctx.font = `600 13px ${LATIN_FAMILY}`
    ctx.fillText('Al-Qur’an Digital', WIDTH / 2, 153)
    ctx.fillStyle = palette.title
    let headingSize = 12
    const cleanHeading = clean(heading) || 'RENUNGAN AL-QUR’AN'
    ctx.font = `700 ${headingSize}px ${LATIN_FAMILY}`
    while (ctx.measureText(cleanHeading).width > WIDTH - 180 && headingSize > 10) {
      headingSize--
      ctx.font = `700 ${headingSize}px ${LATIN_FAMILY}`
    }
    ctx.fillText(cleanHeading, WIDTH / 2, 179)
  }

  // Garis identitas memakai ikon masjid-bulan-bintang dengan ruang lega dari header dan chip.
  ctx.save()
  ctx.translate(0, 249)
  ctx.scale(1, 0.7)
  drawMosqueDivider(ctx, WIDTH / 2, 0, palette, 154)
  ctx.restore()
  const ref = clean(reference)
  if (ref) {
    let referenceSize = 15
    const maxReferenceWidth = templateImage ? WIDTH - 180 : WIDTH - 112
    ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    while (ctx.measureText(ref).width > maxReferenceWidth && referenceSize > 10) {
      referenceSize--
      ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    }
    const chipWidth = Math.min(WIDTH - 96, ctx.measureText(ref).width + (templateImage ? 76 : 32))
    const chipX = (WIDTH - chipWidth) / 2
    roundRect(ctx, chipX, 260, chipWidth, 38, 19)
    ctx.fillStyle = palette.chip
    ctx.fill()
    ctx.strokeStyle = palette.innerFrame
    ctx.lineWidth = templateImage ? 1.8 : 1
    ctx.stroke()
    if (templateImage) {
      drawRosette(ctx, chipX + 18, 279, 13, palette.accent, 0.92)
      drawRosette(ctx, chipX + chipWidth - 18, 279, 13, palette.accent, 0.92)
    }
    ctx.fillStyle = palette.chipText
    ctx.textAlign = 'center'
    ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    ctx.fillText(ref, WIDTH / 2, 284)
  }

  const layout = measureShareBlocks(ctx, contentBlocks)
  const bodyY = Math.round(BODY_TOP + Math.max(0, (BODY_HEIGHT - layout.contentHeight) / 2))
  if (!templateImage) drawBodyStars(ctx, bodyY, layout.contentHeight, palette)
  drawContent(ctx, layout, bodyY, palette)

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  if (templateImage) {
    drawTemplateFooter(ctx, palette, cigatasLogo, sourceUrl, selectedTheme.id === 'ramadan')
  } else {
    // Identitas Cigatas tetap di kiri bawah; QuranKu sudah berada di panel atas.
    const footerDividerY = 1080
    ctx.strokeStyle = palette.divider
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(50, footerDividerY)
    ctx.lineTo(WIDTH - 50, footerDividerY)
    ctx.stroke()
    drawStar(ctx, WIDTH / 2, footerDividerY, 5, palette.accent, 0.9)
    if (cigatasLogo) ctx.drawImage(cigatasLogo, 44, 1098, 162, 108)
    else {
      ctx.direction = 'ltr'
      ctx.textAlign = 'left'
      ctx.fillStyle = palette.brand
      ctx.font = `700 16px ${LATIN_FAMILY}`
      ctx.fillText('Cigatas', 48, 1158)
      ctx.font = `11px ${LATIN_FAMILY}`
      ctx.fillText('#TongEureunNgaji', 48, 1178)
    }
    if (selectedTheme.id === 'ramadan') drawRamadanFooter(ctx, palette)

    const source = String(sourceUrl ?? '').replace(/^https?:\/\//i, '')
    ctx.direction = 'ltr'
    ctx.textAlign = 'right'
    ctx.fillStyle = palette.secondary
    let sourceSize = 11
    ctx.font = `${sourceSize}px ${LATIN_FAMILY}`
    while (ctx.measureText(source).width > WIDTH - 390 && sourceSize > 8) {
      sourceSize--
      ctx.font = `${sourceSize}px ${LATIN_FAMILY}`
    }
    ctx.fillText(source, WIDTH - 48, 1234)
  }

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
export function ayahImageOption({ surahNumber, ayahNumber, arabic, latin, translation, reference, sourceUrl, heading = 'AYAT PILIHAN HARI INI' }) {
  return {
    filename: `quranku-ayat-${surahNumber}-${ayahNumber}.png`,
    create: ({ theme, format }) => createShareImage({
      arabic, latin, translation, reference, sourceUrl, heading, theme, format
    })
  }
}
