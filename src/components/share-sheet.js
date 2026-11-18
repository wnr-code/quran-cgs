// Lembar seragam untuk membagikan doa, ayat, audio, dan konten lain ke media sosial.
import { openSheet } from './modal.js'
import {
  esc, copyText, toast, canShareText, openExternal, shareText, shareImage,
  reportShareResult, downloadFile
} from '../utils/helpers.js'
import { APP } from '../config.js'
import { shareContent, shareUrl, shareLinks } from '../utils/doa-share.js'
import { AYAH_IMAGE_THEMES } from '../utils/ayah-image.js'

/** Ikon font (subset Font Awesome Free, lihat public/fonts). */
export const fi = (name, brand) => `<i class="fi fi-${name}${brand ? ' fib' : ''}" aria-hidden="true"></i>`

/** p: { title, text, url } atau bentuk doa lama; image.create menerima pilihan tema dan format. */
export function openShare(p, { title = 'Bagikan doa', what = 'doa', hint, image = null } = {}) {
  const L = shareLinks(p, APP.origin)
  const url = shareUrl(p, APP.origin)
  const text = shareContent(p)
  const imageKind = what === 'doa' ? 'doa' : 'ayat'
  const opt = (cls, href, ic, label) => `<a class="share-opt ${cls}" href="${esc(href)}" target="_blank" rel="noopener" data-net="${cls}"><span class="share-ic">${fi(ic, true)}</span>${label}</a>`
  const selectedTheme = image?.theme || (document.documentElement.dataset.theme === 'ramadan' ? 'ramadan' : AYAH_IMAGE_THEMES[0].id)
  const themeOptions = image
    ? AYAH_IMAGE_THEMES.map((theme) => `<button type="button" class="share-theme-opt" data-image-theme="${esc(theme.id)}" aria-pressed="${theme.id === selectedTheme}">
        <span class="share-theme-swatch" style="--share-swatch:${theme.swatch}"></span><span>${esc(theme.label)}</span>
      </button>`).join('')
    : ''
  const imageOption = image
    ? `<section class="share-image-section" aria-label="Buat pratinjau gambar ${imageKind}">
        <p class="share-mode-label">Gambar untuk Status WhatsApp</p>
        <p class="share-image-intro">Pilih tema dan format. Pratinjau yang tampil akan sama persis dengan berkas yang dibagikan atau diunduh.</p>
        <div class="share-theme-grid" role="group" aria-label="Tema gambar">${themeOptions}</div>
        <div class="share-format-row" role="group" aria-label="Format gambar">
          <button type="button" class="share-format-opt" data-image-format="png" aria-pressed="true">PNG</button>
          <button type="button" class="share-format-opt" data-image-format="jpg" aria-pressed="false">JPG</button>
        </div>
        <button type="button" class="btn btn-primary btn-block share-image-create" data-image-create>Buat pratinjau 720 × 1280</button>
        <p class="share-image-status" data-image-status role="status" aria-live="polite">Rasio vertikal 9:16 · pilih gaya yang disukai.</p>
        <div class="share-image-preview-wrap" data-image-preview-wrap hidden>
          <img class="share-image-preview" data-image-preview alt="Pratinjau gambar ${imageKind} untuk Status WhatsApp" />
        </div>
        <div class="share-image-actions" data-image-actions hidden>
          <button type="button" class="btn btn-primary" data-image-share>Bagikan gambar</button>
          <button type="button" class="btn" data-image-download>Unduh PNG</button>
        </div>
      </section>`
    : ''
  let previewUrl = null
  let sheetClosed = false

  openSheet({
    title,
    content: `<p class="share-title">${esc(p.title)}</p>
      ${image ? '<p class="share-mode-label">Bagikan sebagai teks</p>' : ''}
      <div class="share-grid">
        ${opt('wa', L.whatsapp, 'whatsapp', 'WhatsApp')}
        ${opt('tg', L.telegram, 'telegram', 'Telegram')}
        ${opt('fb', L.facebook, 'facebook', 'Facebook')}
        ${opt('x', L.x, 'x', 'X')}
        ${canShareText() ? `<button type="button" class="share-opt" data-native><span class="share-ic">${fi('share')}</span>Aplikasi lain</button>` : ''}
        <button type="button" class="share-opt" data-copyshare><span class="share-ic">${fi('copy')}</span>Salin teks</button>
      </div>
      ${imageOption}
      <p class="hint">${esc(hint || 'Pilih media sosial atau salin teks. Facebook membagikan tautan; media lain dapat menyertakan teks dan tautan ke QuranKu.')}</p>`,
    onOpen(el, close) {
      let imageBlob = null
      let imageBusy = false
      let currentTheme = selectedTheme
      let currentFormat = 'png'
      const previewWrap = el.querySelector('[data-image-preview-wrap]')
      const previewImage = el.querySelector('[data-image-preview]')
      const imageActions = el.querySelector('[data-image-actions]')
      const createButton = el.querySelector('[data-image-create]')
      const downloadButton = el.querySelector('[data-image-download]')
      const status = el.querySelector('[data-image-status]')
      const filenameFor = (format) => {
        const base = String(image?.filename || 'quranku-ayat').replace(/\.(?:png|jpe?g)$/i, '')
        return `${base}.${format === 'jpg' ? 'jpg' : 'png'}`
      }
      const resetPreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        previewUrl = null
        imageBlob = null
        previewImage?.removeAttribute('src')
        if (previewWrap) previewWrap.hidden = true
        if (imageActions) imageActions.hidden = true
        if (createButton) {
          createButton.hidden = false
          createButton.disabled = false
          createButton.removeAttribute('aria-busy')
          createButton.textContent = `Buat pratinjau ${currentFormat.toUpperCase()} 720 × 1280`
        }
        if (downloadButton) downloadButton.textContent = `Unduh ${currentFormat.toUpperCase()}`
        if (status) status.textContent = 'Rasio vertikal 9:16 · pilih gaya yang disukai.'
      }
      const disableSelectors = (disabled) => {
        el.querySelectorAll('[data-image-theme], [data-image-format]').forEach((button) => { button.disabled = disabled })
      }
      const createPreview = async () => {
        if (!image?.create || imageBusy) return
        imageBusy = true
        if (createButton) {
          createButton.disabled = true
          createButton.setAttribute('aria-busy', 'true')
          createButton.textContent = 'Membuat pratinjau…'
        }
        if (status) status.textContent = 'Menyusun bacaan, terjemahan, dan ornamen…'
        disableSelectors(true)
        try {
          const blob = await image.create({ theme: currentTheme, format: currentFormat })
          if (sheetClosed || !el.isConnected) return
          if (!blob || typeof blob.size !== 'number' || blob.size === 0) throw new Error('Gambar belum berhasil dibuat.')
          if (previewUrl) URL.revokeObjectURL(previewUrl)
          imageBlob = blob
          previewUrl = URL.createObjectURL(blob)
          previewImage.src = previewUrl
          previewImage.alt = `Pratinjau ${currentFormat.toUpperCase()} ${imageKind} ${p.title}, tema ${currentTheme}, ukuran 720 × 1280.`
          previewWrap.hidden = false
          imageActions.hidden = false
          createButton.textContent = 'Perbarui pratinjau'
          if (status) status.textContent = `${currentFormat.toUpperCase()} · 720 × 1280 · hasil ini yang akan dibagikan atau diunduh.`
          previewWrap.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
        } catch (error) {
          if (!el.isConnected) return
          if (status) status.textContent = error?.message || 'Gagal membuat pratinjau. Silakan coba lagi.'
          toast(error?.message || `Gagal membuat gambar ${imageKind}. Coba lagi.`)
        } finally {
          imageBusy = false
          if (createButton?.isConnected) {
            createButton.disabled = false
            createButton.removeAttribute('aria-busy')
          }
          disableSelectors(false)
        }
      }

      el.addEventListener('click', async (e) => {
        const social = e.target.closest('[data-net]')
        if (social) {
          e.preventDefault()
          const opening = openExternal(social.href)
          close()
          if (!(await opening)) toast(`Tidak dapat membuka ${social.textContent.trim()}`)
          return
        }
        if (e.target.closest('[data-copyshare]')) {
          toast((await copyText(`${text}\n\n${url}`)) ? `Teks ${what} disalin` : 'Gagal menyalin')
          return close()
        }
        if (e.target.closest('[data-native]')) {
          const pending = shareText(p.title, text, url)
          close()
          reportShareResult(await pending)
          return
        }

        const themeButton = e.target.closest('[data-image-theme]')
        if (themeButton) {
          currentTheme = themeButton.dataset.imageTheme
          el.querySelectorAll('[data-image-theme]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button === themeButton))
          })
          resetPreview()
          return
        }
        const formatButton = e.target.closest('[data-image-format]')
        if (formatButton) {
          currentFormat = formatButton.dataset.imageFormat
          el.querySelectorAll('[data-image-format]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button === formatButton))
          })
          resetPreview()
          return
        }
        if (e.target.closest('[data-image-create]')) {
          e.preventDefault()
          await createPreview()
          return
        }
        if (e.target.closest('[data-image-download]')) {
          if (!imageBlob) return
          downloadFile(filenameFor(currentFormat), imageBlob, imageBlob.type || (currentFormat === 'jpg' ? 'image/jpeg' : 'image/png'))
          toast(`Gambar ${currentFormat.toUpperCase()} diunduh.`)
          return
        }
        if (e.target.closest('[data-image-share]')) {
          if (!imageBlob) return
          const pending = shareImage(imageBlob, {
            filename: filenameFor(currentFormat),
            title: p.title,
            text: `${text}\n\n${url}`
          })
          close()
          const result = await pending
          if (result === 'downloaded') toast(`Gambar ${currentFormat.toUpperCase()} diunduh, siap dibagikan.`)
          else if (result === 'failed') toast(`Gagal membagikan gambar ${imageKind}.`)
        }
      })
    },
    onClose: () => {
      sheetClosed = true
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  })
}
