// Lembar seragam untuk membagikan doa, ayat, audio, dan konten lain ke media sosial.
import { openSheet } from './modal.js'
import { icon } from './icons.js'
import { esc, copyText, toast, canShareText, openExternal, shareText, shareImage, reportShareResult } from '../utils/helpers.js'
import { APP } from '../config.js'
import { shareContent, shareUrl, shareLinks } from '../utils/doa-share.js'

/** Ikon font (subset Font Awesome Free, lihat public/fonts). */
export const fi = (name, brand) => `<i class="fi fi-${name}${brand ? ' fib' : ''}" aria-hidden="true"></i>`

/** p: { title, text, url } atau bentuk doa lama; opsi image.create membuat Blob PNG bila diperlukan. */
export function openShare(p, { title = 'Bagikan doa', what = 'doa', hint, image = null } = {}) {
  const L = shareLinks(p, APP.origin)
  const url = shareUrl(p, APP.origin)
  const text = shareContent(p)
  const opt = (cls, href, ic, label) => `<a class="share-opt ${cls}" href="${esc(href)}" target="_blank" rel="noopener" data-net="${cls}"><span class="share-ic">${fi(ic, true)}</span>${label}</a>`
  const imageOption = image
    ? `<div class="share-image-section">
        <p class="share-mode-label">Atau bagikan sebagai gambar</p>
        <button type="button" class="share-image-opt" data-image-share>
          <span class="share-ic">${icon('image')}</span>
          <span class="share-image-copy"><strong data-image-label>Bagikan sebagai gambar</strong><small data-image-hint>PNG 1080 × 1920 · ukuran Status WhatsApp</small></span>
          <span class="share-image-arrow">${icon('forward')}</span>
        </button>
      </div>`
    : ''
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
      let imagePromise = null
      const prepareImage = () => {
        if (imageBlob) return Promise.resolve(imageBlob)
        if (!imagePromise) {
          imagePromise = Promise.resolve()
            .then(() => image.create())
            .then((blob) => {
              if (!blob || typeof blob.size !== 'number' || blob.size === 0) throw new Error('Berkas PNG tidak tersedia.')
              imageBlob = blob
              return blob
            })
            .catch((error) => {
              imagePromise = null
              throw error
            })
        }
        return imagePromise
      }
      if (image?.create) prepareImage().catch(() => {})

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
        const imageButton = e.target.closest('[data-image-share]')
        if (imageButton) {
          e.preventDefault()
          if (!imageBlob) {
            const label = imageButton.querySelector('[data-image-label]')
            const detail = imageButton.querySelector('[data-image-hint]')
            imageButton.disabled = true
            imageButton.setAttribute('aria-busy', 'true')
            if (label) label.textContent = 'Menyiapkan gambar…'
            if (detail) detail.textContent = 'Ayat dan terjemahan sedang disusun menjadi PNG.'
            try {
              await prepareImage()
              if (!imageButton.isConnected) return
              imageButton.disabled = false
              imageButton.removeAttribute('aria-busy')
              imageButton.dataset.imageReady = 'true'
              if (label) label.textContent = 'Gambar siap · ketuk untuk membagikan'
              if (detail) detail.textContent = '1080 × 1920 · ayat, terjemahan, dan tautan sumber QuranKu.'
            } catch {
              if (!imageButton.isConnected) return
              imageButton.disabled = false
              imageButton.removeAttribute('aria-busy')
              if (label) label.textContent = 'Coba siapkan gambar lagi'
              if (detail) detail.textContent = 'Gambar belum dapat dibuat di perangkat ini.'
              toast('Gagal membuat gambar ayat. Coba lagi.')
            }
            return
          }

          const pending = shareImage(imageBlob, {
            filename: image.filename || 'quranku-ayat.png',
            title: p.title,
            text: `${text}\n\n${url}`
          })
          close()
          const result = await pending
          if (result === 'downloaded') toast('Gambar ayat diunduh, siap dibagikan.')
          else if (result === 'failed') toast('Gagal membagikan gambar ayat.')
        }
      })
    }
  })
}
