// Lembar seragam untuk membagikan doa, ayat, audio, dan konten lain ke media sosial.
import { openSheet } from './modal.js'
import { esc, copyText, toast, canShareText, openExternal, shareText, reportShareResult } from '../utils/helpers.js'
import { APP } from '../config.js'
import { shareContent, shareUrl, shareLinks } from '../utils/doa-share.js'

/** Ikon font (subset Font Awesome Free, lihat public/fonts). */
export const fi = (name, brand) => `<i class="fi fi-${name}${brand ? ' fib' : ''}" aria-hidden="true"></i>`

/** p: { title, text, url } atau bentuk doa lama { title, ar, latin, arti, ref, tab | path }. */
export function openShare(p, { title = 'Bagikan doa', what = 'doa', hint } = {}) {
  const L = shareLinks(p, APP.origin)
  const url = shareUrl(p, APP.origin)
  const text = shareContent(p)
  const opt = (cls, href, ic, label) => `<a class="share-opt ${cls}" href="${esc(href)}" target="_blank" rel="noopener" data-net="${cls}"><span class="share-ic">${fi(ic, true)}</span>${label}</a>`
  openSheet({
    title,
    content: `<p class="share-title">${esc(p.title)}</p>
      <div class="share-grid">
        ${opt('wa', L.whatsapp, 'whatsapp', 'WhatsApp')}
        ${opt('tg', L.telegram, 'telegram', 'Telegram')}
        ${opt('fb', L.facebook, 'facebook', 'Facebook')}
        ${opt('x', L.x, 'x', 'X')}
        ${canShareText() ? `<button type="button" class="share-opt" data-native><span class="share-ic">${fi('share')}</span>Aplikasi lain</button>` : ''}
        <button type="button" class="share-opt" data-copyshare><span class="share-ic">${fi('copy')}</span>Salin teks</button>
      </div>
      <p class="hint">${esc(hint || 'Pilih media sosial atau salin teks. Facebook membagikan tautan; media lain dapat menyertakan teks dan tautan ke QuranKu.')}</p>`,
    onOpen(el, close) {
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
        }
      })
    }
  })
}
