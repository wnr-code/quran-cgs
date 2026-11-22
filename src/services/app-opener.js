// Pemberitahuan "buka di aplikasi" untuk peramban dalam aplikasi (WhatsApp, Instagram, dsb.).
//
// Tautan https sebenarnya sudah bisa membuka aplikasi lewat App Links, tetapi peramban
// bawaan WhatsApp/Instagram menelan tautan itu sehingga aplikasi tidak pernah menerima
// intent dan pengguna tertahan di halaman web. Bar ini muncul di halaman mana pun (termasuk
// halaman baca yang dituju tautan), dan satu ketukan membuka aplikasi lewat intent://
// dengan cadangan ke Google Play bila aplikasi belum terpasang.
import { icon } from '../components/icons.js'
import { currentRoute } from '../router.js'
import { esc } from '../utils/helpers.js'
import { isInAppBrowser, linkOpenerUrl } from './app-links.js'

const DISMISS_KEY = 'quranku:buka-app-dismissed'
let attached = false

/** Kenali ponsel Android (termasuk tablet) — intent:// hanya berarti di Android. */
const isAndroid = (ua = navigator.userAgent) => /Android/i.test(ua)

export const openerDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export const dismissOpener = () => {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* penyimpanan diblokir: bar cukup ditutup untuk sesi ini */
  }
}

/** Tampilkan bar hanya bila halaman sedang dibuka di peramban dalam aplikasi di Android. */
export function attachAppOpener(getPath = () => currentRoute().path) {
  if (attached) return
  attached = true
  if (!isAndroid() || !isInAppBrowser() || openerDismissed()) return
  const bar = document.createElement('div')
  bar.className = 'app-opener'
  bar.setAttribute('role', 'region')
  bar.setAttribute('aria-label', 'Buka QuranKu di aplikasi')
  const render = () => {
    const path = getPath()
    bar.innerHTML = `
      <span class="app-opener-ic">${icon('forward')}</span>
      <p class="app-opener-text"><strong>Buka di aplikasi QuranKu</strong><small>Halaman ini terbaca lengkap di aplikasi, gratis di Google Play.</small></p>
      <a class="btn btn-primary btn-sm" data-opener-open href="${esc(linkOpenerUrl(path))}">Buka</a>
      <button class="icon-btn sm" type="button" data-opener-close aria-label="Tutup pemberitahuan">${icon('close')}</button>`
  }
  render()
  const close = bar.querySelector('[data-opener-close]')
  close.onclick = () => {
    dismissOpener()
    bar.remove()
  }
  const view = document.getElementById('view')
  if (view && view.parentNode) view.parentNode.insertBefore(bar, view)
  else document.body.prepend(bar)
  // Jalur berubah saat pengguna menavigasi: perbarui tautan agar tetap menunjuk halaman aktif.
  document.addEventListener('qk:route', render)
}
