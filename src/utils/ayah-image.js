export const AYAH_IMAGE_WIDTH = 720
export const AYAH_IMAGE_HEIGHT = 1280

const WIDTH = AYAH_IMAGE_WIDTH
const HEIGHT = AYAH_IMAGE_HEIGHT
const SCALE = 2
const SIDE = 52
const INNER_WIDTH = WIDTH - SIDE * 2
const BODY_TOP = 286
const BODY_BOTTOM = 1082
const BODY_HEIGHT = BODY_BOTTOM - BODY_TOP
const ARABIC_FAMILY = '"Amiri Quran", "Scheherazade New", serif'
const LATIN_FAMILY = 'system-ui, -apple-system, "Segoe UI", sans-serif'

export const AYAH_IMAGE_THEMES = [
  {
    id: 'zamrud',
    label: 'Zamrud',
    swatch: '#0f6b4f',
    colors: {
      backgroundStart: '#f4efdf', backgroundEnd: '#e7ddc8', card: '#fffdf8',
      frame: '#b8923a', innerFrame: '#eadfca', headerStart: '#0b3d2e', headerEnd: '#145d46',
      title: '#fffdf8', subtitle: '#e2d6b9', accent: '#b8923a', arabic: '#163f32',
      translation: '#36453d', chip: '#f2ead8', chipText: '#315a46', divider: '#dfd2bb',
      brand: '#31513f', secondary: '#68736a', ornament: '#b8923a'
    }
  },
  {
    id: 'malam',
    label: 'Malam',
    swatch: '#273d68',
    colors: {
      backgroundStart: '#101827', backgroundEnd: '#263958', card: '#16243a',
      frame: '#d2b66f', innerFrame: '#46536a', headerStart: '#0b1425', headerEnd: '#2c4162',
      title: '#fffaf0', subtitle: '#d9d5ca', accent: '#d2b66f', arabic: '#fff9e9',
      translation: '#e4e9f1', chip: '#263650', chipText: '#f2d99d', divider: '#516078',
      brand: '#fff4d9', secondary: '#d0d7e2', ornament: '#d2b66f'
    }
  },
  {
    id: 'pasir',
    label: 'Pasir',
    swatch: '#9a673a',
    colors: {
      backgroundStart: '#f5e8d1', backgroundEnd: '#e3c69e', card: '#fff8eb',
      frame: '#a87843', innerFrame: '#e7d3b3', headerStart: '#69452e', headerEnd: '#92663f',
      title: '#fffaf2', subtitle: '#f1dfc5', accent: '#bb8a4e', arabic: '#493523',
      translation: '#554638', chip: '#f1e2c9', chipText: '#714e2e', divider: '#dfc8a7',
      brand: '#62452f', secondary: '#76644f', ornament: '#a87843'
    }
  }
]

const DEFAULT_THEME = AYAH_IMAGE_THEMES[0]

/** Bungkus teks sesuai ukuran font canvas; semua kata tetap dipertahankan. */
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

function drawDiamond(ctx, x, y, size, color, alpha = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 4)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.4
  ctx.strokeRect(-size / 2, -size / 2, size, size)
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

async function loadBrandImage() {
  const image = document.createElement('img')
  const src = new URL('/icons/icon-192-v2.png', document.baseURI).href
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

function measureAyah(ctx, arabic, translation) {
  let best = null
  // Skala dicoba dari besar ke kecil. Panjang baris tidak dibatasi, jadi teks tak pernah dipotong.
  for (let scale = 1; scale >= 0.25; scale -= 0.025) {
    const arabicSize = Math.max(15, Math.round(58 * scale))
    const translationSize = Math.max(10, Math.round(27 * scale))
    ctx.direction = 'rtl'
    ctx.font = `${arabicSize}px ${ARABIC_FAMILY}`
    const arabicLines = wrapCanvasText(ctx, arabic, INNER_WIDTH - 28)
    const arabicLineHeight = Math.ceil(arabicSize * 1.62)

    let translationLines = []
    let translationLineHeight = 0
    if (translation) {
      ctx.direction = 'ltr'
      ctx.font = `${translationSize}px ${LATIN_FAMILY}`
      translationLines = wrapCanvasText(ctx, translation, INNER_WIDTH - 44)
      translationLineHeight = Math.ceil(translationSize * 1.48)
    }

    const dividerGap = translation ? Math.max(22, Math.round(arabicSize * 0.48)) : 0
    const labelGap = translation ? 20 : 0
    const translationGap = translation ? Math.max(19, Math.round(translationSize * 0.9)) : 0
    const translationLead = dividerGap + labelGap + translationGap
    const arabicHeight = arabicLines.length * arabicLineHeight
    const contentHeight = arabicHeight + translationLead + translationLines.length * translationLineHeight
    best = {
      arabicSize, arabicLines, arabicLineHeight, arabicHeight,
      translationSize, translationLines, translationLineHeight,
      dividerGap, labelGap, translationGap, translationLead, contentHeight
    }
    if (contentHeight <= BODY_HEIGHT) return best
  }
  return best
}

function resolveTheme(themeId) {
  return AYAH_IMAGE_THEMES.find((theme) => theme.id === themeId) || DEFAULT_THEME
}

/**
 * Render gambar langsung lewat Canvas (tanpa screenshot DOM), lalu tampilkan/ekspor Blob yang sama.
 * Kanvas kerja 2× untuk ketajaman; berkas akhir tetap tepat 720×1280 piksel.
 */
export async function createAyahImage({ arabic, translation, reference, sourceUrl, theme = 'zamrud', format = 'png' }) {
  if (typeof document === 'undefined') throw new Error('Canvas tidak tersedia di perangkat ini.')

  const cleanArabic = String(arabic ?? '').trim()
  const cleanTranslation = String(translation ?? '').trim()
  if (!cleanArabic) throw new Error('Teks ayat belum tersedia.')
  const palette = resolveTheme(theme).colors
  const outputFormat = /^(jpe?g|jpg)$/i.test(String(format)) ? 'jpg' : 'png'
  const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : 'image/png'

  if (document.fonts?.load) {
    await Promise.allSettled([
      document.fonts.load(`58px "Amiri Quran"`),
      document.fonts.load(`58px "Scheherazade New"`)
    ])
  }
  const brandImage = await loadBrandImage()

  const renderCanvas = document.createElement('canvas')
  renderCanvas.width = WIDTH * SCALE
  renderCanvas.height = HEIGHT * SCALE
  const ctx = renderCanvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('Tidak dapat membuat gambar ayat.')
  ctx.scale(SCALE, SCALE)

  // Seluruh ornamen dan teks digambar langsung ke kanvas ekspor agar preview dan berkas identik.
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

  roundRect(ctx, 42, 42, WIDTH - 84, 154, 23)
  const header = ctx.createLinearGradient(42, 42, WIDTH - 42, 196)
  header.addColorStop(0, palette.headerStart)
  header.addColorStop(1, palette.headerEnd)
  ctx.fillStyle = header
  ctx.fill()
  drawRosette(ctx, 73, 119, 34, palette.accent, 0.34)
  drawRosette(ctx, WIDTH - 73, 119, 34, palette.accent, 0.34)

  ctx.direction = 'ltr'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette.title
  ctx.font = `700 25px ${LATIN_FAMILY}`
  ctx.fillText('AYAT PILIHAN HARI INI', WIDTH / 2, 108)
  ctx.fillStyle = palette.subtitle
  ctx.font = `15px ${LATIN_FAMILY}`
  ctx.fillText('Renungan Al-Qur’an', WIDTH / 2, 140)

  ctx.strokeStyle = palette.frame
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(174, 215)
  ctx.lineTo(324, 215)
  ctx.moveTo(WIDTH - 324, 215)
  ctx.lineTo(WIDTH - 174, 215)
  ctx.stroke()
  drawDiamond(ctx, WIDTH / 2, 215, 11, palette.accent)

  const ref = String(reference ?? '').trim()
  if (ref) {
    let referenceSize = 15
    ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    while (ctx.measureText(ref).width > WIDTH - 112 && referenceSize > 11) {
      referenceSize--
      ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    }
    const chipWidth = Math.min(WIDTH - 96, ctx.measureText(ref).width + 32)
    roundRect(ctx, (WIDTH - chipWidth) / 2, 233, chipWidth, 38, 19)
    ctx.fillStyle = palette.chip
    ctx.fill()
    ctx.strokeStyle = palette.innerFrame
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = palette.chipText
    ctx.textAlign = 'center'
    ctx.font = `600 ${referenceSize}px ${LATIN_FAMILY}`
    ctx.fillText(ref, WIDTH / 2, 257)
  }

  const layout = measureAyah(ctx, cleanArabic, cleanTranslation)
  const bodyY = Math.round(BODY_TOP + Math.max(0, (BODY_HEIGHT - layout.contentHeight) / 2))
  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.fillStyle = palette.arabic
  ctx.font = `${layout.arabicSize}px ${ARABIC_FAMILY}`
  layout.arabicLines.forEach((line, index) => {
    ctx.fillText(line, WIDTH / 2, bodyY + Math.round(layout.arabicLineHeight * (index + 0.84)))
  })

  if (cleanTranslation) {
    const dividerY = bodyY + layout.arabicHeight + layout.dividerGap
    ctx.strokeStyle = palette.divider
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(118, dividerY)
    ctx.lineTo(WIDTH - 118, dividerY)
    ctx.stroke()
    drawDiamond(ctx, WIDTH / 2, dividerY, 8, palette.accent)

    const labelY = dividerY + layout.labelGap
    ctx.direction = 'ltr'
    ctx.textAlign = 'center'
    ctx.fillStyle = palette.accent
    ctx.font = `700 11px ${LATIN_FAMILY}`
    ctx.fillText('TERJEMAHAN INDONESIA', WIDTH / 2, labelY)
    ctx.fillStyle = palette.translation
    ctx.font = `${layout.translationSize}px ${LATIN_FAMILY}`
    layout.translationLines.forEach((line, index) => {
      ctx.fillText(line, WIDTH / 2, labelY + layout.translationGap + Math.round(layout.translationLineHeight * (index + 0.82)))
    })
  }

  const footerDividerY = 1120
  ctx.strokeStyle = palette.divider
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(50, footerDividerY)
  ctx.lineTo(WIDTH - 50, footerDividerY)
  ctx.stroke()
  drawDiamond(ctx, WIDTH / 2, footerDividerY, 8, palette.accent)

  ctx.direction = 'ltr'
  if (brandImage) ctx.drawImage(brandImage, 50, 1144, 72, 72)
  ctx.textAlign = 'left'
  ctx.fillStyle = palette.brand
  ctx.font = `700 18px ${LATIN_FAMILY}`
  ctx.fillText('QuranKu', 136, 1179)
  ctx.fillStyle = palette.secondary
  ctx.font = `12px ${LATIN_FAMILY}`
  ctx.fillText('Al-Qur’an Digital', 136, 1199)

  const source = String(sourceUrl ?? '').replace(/^https?:\/\//i, '')
  ctx.textAlign = 'right'
  ctx.fillStyle = palette.secondary
  let sourceSize = 11
  ctx.font = `${sourceSize}px ${LATIN_FAMILY}`
  while (ctx.measureText(source).width > WIDTH - 390 && sourceSize > 8) {
    sourceSize--
    ctx.font = `${sourceSize}px ${LATIN_FAMILY}`
  }
  ctx.fillText(source, WIDTH - 48, 1200)

  // Lapisan latar belakang kedua menjamin piksel seluruh tepi ikut terisi, termasuk saat JPEG dibuat.
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
