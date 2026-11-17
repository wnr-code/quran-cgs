// Lembar "Bagikan" ke media sosial, dipakai halaman Doa dan Asmaul Husna.
import { openSheet } from './modal.js'
import { esc, copyText, toast, canShareText, openExternal, shareText, reportShareResult } from '../utils/helpers.js'
import { APP } from '../config.js'
import { doaText, doaUrl, shareLinks } from '../utils/doa-share.js'

/** Ikon font (subset Font Awesome Free, lihat public/fonts). */
export const fi = (name, brand) => `<i class="fi fi-${name}${brand ? ' fib' : ''}" aria-hidden="true"></i>`

/** p: { title, ar, latin, arti, ref, tab | path } */
export function openShare(p, { title = 'Bagikan doa', what = 'doa' } = {}) {
  const L = shareLinks(p, APP.origin)
  const url = doaUrl(p, APP.origin)
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
      <p class="hint">Yang dibagikan: judul, tulisan Arab, Latin, arti, dan tautan ke QuranKu. Facebook membagikan tautan; gunakan “Salin teks” terpisah bila ingin menempelkan isi bacaan.</p>`,
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
          toast((await copyText(`${doaText(p)}\n\n${url}`)) ? `Teks ${what} disalin` : 'Gagal menyalin')
          return close()
        }
        if (e.target.closest('[data-native]')) {
          const pending = shareText(p.title, doaText(p), url)
          close()
          reportShareResult(await pending)
        }
      })
    }
  })
}
