const WIDTH = 1080
const HEIGHT = 1920 // 9:16 — ukuran vertikal Full HD untuk Status WhatsApp
const SIDE = 72
const INNER_WIDTH = WIDTH - SIDE * 2
const CARD_INSET = 34
const CARD_RADIUS = 38

/** Pecah teks menjadi baris berdasarkan lebar yang benar-benar dapat digambar di canvas. */
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

function fitLines(ctx, text, maxWidth, { family, size, minSize, maxLines }) {
  let fontSize = size
  let lines = []
  while (fontSize > minSize) {
    ctx.font = `${fontSize}px ${family}`
    lines = wrapCanvasText(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { fontSize, lines }
    fontSize -= 2
  }
  ctx.font = `${minSize}px ${family}`
  return { fontSize: minSize, lines: wrapCanvasText(ctx, text, maxWidth) }
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

function drawCenteredLines(ctx, lines, { x, firstY, lineHeight, color }) {
  ctx.textAlign = 'center'
  ctx.fillStyle = color
  lines.forEach((line, index) => ctx.fillText(line, x, firstY + index * lineHeight))
}

function drawDiamond(ctx, x, y, size, color) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 4)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.strokeRect(-size / 2, -size / 2, size, size)
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

/** Membuat PNG vertikal Status WhatsApp (1080×1920), seluruhnya di perangkat. */
export async function createAyahImage({ arabic, translation, reference, sourceUrl }) {
  if (typeof document === 'undefined') throw new Error('Canvas tidak tersedia di perangkat ini.')

  // Pastikan tulisan Arab di gambar memakai font Quran yang sudah dibundel agar tetap benar saat offline.
  if (document.fonts?.load) {
    await Promise.allSettled([
      document.fonts.load('82px "Amiri Quran"'),
      document.fonts.load('82px "Scheherazade New"')
    ])
  }
  const brandImage = await loadBrandImage()

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tidak dapat membuat gambar ayat.')
  ctx.direction = 'rtl'

  const cleanArabic = String(arabic ?? '').trim()
  const cleanTranslation = String(translation ?? '').trim()
  if (!cleanArabic) throw new Error('Teks ayat belum tersedia.')

  const makeArabicLayout = (size) => {
    ctx.direction = 'rtl'
    return fitLines(ctx, cleanArabic, INNER_WIDTH - 80, {
      family: '"Amiri Quran", "Scheherazade New", serif',
      size,
      minSize: 38,
      maxLines: 8
    })
  }
  const makeTranslationLayout = (size) => {
    ctx.direction = 'ltr'
    return fitLines(ctx, cleanTranslation, INNER_WIDTH - 120, {
      family: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      size,
      minSize: 22,
      maxLines: 12
    })
  }

  let arabicLayout = makeArabicLayout(78)
  let translationLayout = cleanTranslation ? makeTranslationLayout(33) : { fontSize: 22, lines: [] }
  const bodyTop = 430
  const bodyBottom = 1585
  const availableBodyHeight = bodyBottom - bodyTop
  const translationLead = cleanTranslation ? 172 : 0
  const layoutMetrics = () => {
    const arabicLineHeight = Math.ceil(arabicLayout.fontSize * 1.72)
    const arabicHeight = arabicLayout.lines.length * arabicLineHeight
    const translationLineHeight = cleanTranslation ? Math.ceil(translationLayout.fontSize * 1.56) : 0
    const contentHeight = arabicHeight + translationLead + translationLayout.lines.length * translationLineHeight
    return { arabicLineHeight, arabicHeight, translationLineHeight, contentHeight }
  }
  let metrics = layoutMetrics()
  while (metrics.contentHeight > availableBodyHeight) {
    if (cleanTranslation && translationLayout.fontSize > 22) {
      translationLayout = makeTranslationLayout(Math.max(22, translationLayout.fontSize - 2))
    } else if (arabicLayout.fontSize > 38) {
      arabicLayout = makeArabicLayout(Math.max(38, arabicLayout.fontSize - 2))
    } else {
      break
    }
    metrics = layoutMetrics()
  }
  const { arabicLineHeight, arabicHeight, translationLineHeight, contentHeight } = metrics
  const bodyY = Math.max(bodyTop, Math.min(bodyTop + 100, (bodyTop + bodyBottom - contentHeight) / 2))
  const footerLineY = 1680
  const footerY = footerLineY + 123
  const height = HEIGHT

  canvas.width = WIDTH
  canvas.height = height
  ctx.direction = 'ltr'
  ctx.textBaseline = 'alphabetic'

  // Latar hangat dengan bingkai QuranKu bernuansa hijau dan emas lembut.
  const background = ctx.createLinearGradient(0, 0, WIDTH, height)
  background.addColorStop(0, '#f1ecdf')
  background.addColorStop(1, '#e9e0cf')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, WIDTH, height)

  roundRect(ctx, CARD_INSET, CARD_INSET, WIDTH - CARD_INSET * 2, height - CARD_INSET * 2, CARD_RADIUS)
  ctx.fillStyle = '#fffdf8'
  ctx.fill()
  ctx.strokeStyle = '#c8ad78'
  ctx.lineWidth = 2
  ctx.stroke()

  roundRect(ctx, 58, 58, WIDTH - 116, 185, 28)
  const header = ctx.createLinearGradient(58, 58, WIDTH - 58, 243)
  header.addColorStop(0, '#0b3d2e')
  header.addColorStop(1, '#145d46')
  ctx.fillStyle = header
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#fffdf8'
  ctx.font = '700 32px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText('AYAT PILIHAN HARI INI', WIDTH / 2, 139)
  ctx.fillStyle = '#e2d6b9'
  ctx.font = '19px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText('Renungan ayat untuk hari ini', WIDTH / 2, 180)

  ctx.strokeStyle = '#d8c18e'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(247, 284)
  ctx.lineTo(385, 284)
  ctx.moveTo(695, 284)
  ctx.lineTo(833, 284)
  ctx.stroke()
  drawDiamond(ctx, WIDTH / 2, 284, 12, '#b8923a')

  const ref = String(reference ?? '').trim()
  if (ref) {
    ctx.font = '600 23px system-ui, -apple-system, "Segoe UI", sans-serif'
    const refWidth = Math.min(INNER_WIDTH - 48, ctx.measureText(ref).width + 58)
    roundRect(ctx, (WIDTH - refWidth) / 2, 315, refWidth, 48, 24)
    ctx.fillStyle = '#f2ead8'
    ctx.fill()
    ctx.strokeStyle = '#e3d4b3'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#315a46'
    ctx.textAlign = 'center'
    ctx.fillText(ref, WIDTH / 2, 347)
  }

  ctx.font = `${arabicLayout.fontSize}px "Amiri Quran", "Scheherazade New", serif`
  ctx.direction = 'rtl'
  drawCenteredLines(ctx, arabicLayout.lines, {
    x: WIDTH / 2,
    firstY: bodyY + arabicLineHeight,
    lineHeight: arabicLineHeight,
    color: '#163f32'
  })

  if (cleanTranslation) {
    const dividerY = bodyY + arabicHeight + 50
    ctx.strokeStyle = '#e6dcc8'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(160, dividerY)
    ctx.lineTo(WIDTH - 160, dividerY)
    ctx.stroke()
    drawDiamond(ctx, WIDTH / 2, dividerY, 9, '#b8923a')

    const labelY = dividerY + 52
    ctx.direction = 'ltr'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#997d45'
    ctx.font = '700 17px system-ui, -apple-system, "Segoe UI", sans-serif'
    ctx.fillText('TERJEMAHAN INDONESIA', WIDTH / 2, labelY)
    drawCenteredLines(ctx, translationLayout.lines, {
      x: WIDTH / 2,
      firstY: labelY + 70,
      lineHeight: translationLineHeight,
      color: '#36453d'
    })
  }

  ctx.strokeStyle = '#e8dfce'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(106, footerLineY)
  ctx.lineTo(WIDTH - 106, footerLineY)
  ctx.stroke()

  ctx.direction = 'ltr'
  if (brandImage) ctx.drawImage(brandImage, 104, footerLineY + 36, 112, 112)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#31513f'
  ctx.font = '700 27px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText('QuranKu', 238, footerY - 8)
  ctx.fillStyle = '#69746a'
  ctx.font = '17px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText("Al-Qur'an Digital", 238, footerY + 22)
  ctx.textAlign = 'right'
  ctx.font = '16px system-ui, -apple-system, "Segoe UI", sans-serif'
  const source = String(sourceUrl ?? '').replace(/^https?:\/\//i, '')
  ctx.fillText(source, WIDTH - 108, footerY + 22)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result)
      else reject(new Error('Gagal membuat berkas PNG.'))
    }, 'image/png')
  })
  return blob
}
