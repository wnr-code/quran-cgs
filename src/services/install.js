// Pemasangan PWA. Chrome/Edge/Samsung memberi `beforeinstallprompt`; peramban lain (Firefox, Opera, Mi Browser,
// Safari, peramban dalam aplikasi) tidak — untuk mereka ditampilkan panduan langkah demi langkah.
import { openSheet } from '../components/modal.js'
import { icon } from '../components/icons.js'
import { isStandalone, copyText, toast } from '../utils/helpers.js'

const DISMISS_KEY = 'quranku:install-dismissed'
const SITE = 'quran.cgs.my.id'

/** Kenali peramban dari user agent (hanya untuk memilih teks panduan). */
export function detectBrowser(ua = navigator.userAgent) {
  const android = /Android/i.test(ua)
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|TikTok|musical_ly|Telegram|Twitter|MicroMessenger/i.test(ua) || (android && /; wv\)/.test(ua))) return { id: 'inapp', android, ios }
  if (ios) return { id: /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) ? 'ios-other' : 'ios-safari', android, ios }
  if (/SamsungBrowser/i.test(ua)) return { id: 'samsung', android, ios }
  if (/Firefox|FxiOS/i.test(ua)) return { id: 'firefox', android, ios }
  if (/OPR\/|Opera/i.test(ua)) return { id: 'opera', android, ios }
  if (/EdgA?\//i.test(ua)) return { id: 'edge', android, ios }
  if (/MiuiBrowser|XiaoMi/i.test(ua)) return { id: 'mi', android, ios }
  if (/UCBrowser|UBrowser/i.test(ua)) return { id: 'uc', android, ios }
  if (/HuaweiBrowser|VivoBrowser|HeyTapBrowser|OppoBrowser|PHX\//i.test(ua)) return { id: 'vendor', android, ios }
  if (/Brave/i.test(ua)) return { id: 'brave', android, ios }
  if (/Chrome\//i.test(ua)) return { id: 'chrome', android, ios }
  return { id: 'other', android, ios }
}

const GUIDES = {
  chrome: { name: 'Chrome', steps: ['Ketuk menu <b>⋮</b> di kanan atas.', 'Pilih <b>Tambahkan ke layar utama</b> atau <b>Instal aplikasi</b>.', 'Ketuk <b>Instal</b>.'] },
  brave: { name: 'Brave', steps: ['Ketuk menu <b>⋮</b> di kanan bawah/atas.', 'Pilih <b>Tambahkan ke layar utama</b> / <b>Instal aplikasi</b>.', 'Ketuk <b>Instal</b>.'] },
  edge: { name: 'Edge', steps: ['Ketuk menu <b>≡</b> di bagian bawah.', 'Pilih <b>Tambahkan ke ponsel</b>.', 'Ketuk <b>Instal</b>.'] },
  samsung: { name: 'Samsung Internet', steps: ['Ketuk menu <b>≡</b> di kanan bawah.', 'Pilih <b>Tambah halaman ke</b> → <b>Layar depan</b> (atau ikon unduh di kolom alamat).', 'Ketuk <b>Tambah</b>.'] },
  firefox: { name: 'Firefox', steps: ['Ketuk menu <b>⋮</b>.', 'Pilih <b>Tambahkan ke layar beranda</b> (atau <b>Instal</b>).', 'Ketuk <b>Tambah</b>.'] },
  opera: { name: 'Opera', steps: ['Ketuk menu <b>⋮</b> di kanan atas.', 'Pilih <b>Tambahkan ke…</b> → <b>Layar utama</b>.', 'Ketuk <b>Tambah</b>.'] },
  'ios-safari': { name: 'Safari', steps: ['Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas).', 'Gulir lalu pilih <b>Tambah ke Layar Utama</b>.', 'Ketuk <b>Tambah</b>.'] },
  'ios-other': { name: 'peramban ini', steps: ['Ketuk tombol <b>Bagikan</b>.', 'Pilih <b>Tambah ke Layar Utama</b>.', 'Bila tidak ada, buka situs ini di <b>Safari</b> lalu ulangi.'] }
}
// Peramban yang umumnya tidak bisa memasang PWA dengan benar → arahkan ke Chrome.
const WEAK = { mi: 'Mi Browser', uc: 'UC Browser', vendor: 'peramban bawaan ponsel', inapp: 'peramban di dalam aplikasi (WhatsApp, Facebook, Instagram, dll.)', other: 'peramban ini' }

export const canPromptInstall = () => !!window.__installPrompt
export const shouldOfferInstall = () => !isStandalone()

/** URL intent untuk membuka situs langsung di Chrome (Android). */
export const chromeIntentUrl = () => `intent://${location.host || SITE}/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome')};end`

export function installGuideHtml(b = detectBrowser()) {
  const g = GUIDES[b.id]
  const list = (steps) => `<ol class="install-steps">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>`
  if (g) {
    return `<p class="muted">Cara memasang di <strong>${g.name}</strong>:</p>${list(g.steps)}
      <p class="muted small">Setelah terpasang, QuranKu terbuka layar penuh dari layar utama dan tetap bisa dipakai tanpa internet.</p>
      ${b.android && b.id !== 'chrome' ? `<a class="btn btn-ghost btn-block" data-chrome href="${chromeIntentUrl()}">Tidak berhasil? Buka di Chrome</a>` : ''}`
  }
  return `<p class="muted">Pemasangan aplikasi kurang didukung di <strong>${WEAK[b.id] || WEAK.other}</strong>. Buka QuranKu di <strong>${b.ios ? 'Safari' : 'Chrome'}</strong>, lalu pasang dari sana:</p>
    ${list(b.ios ? GUIDES['ios-safari'].steps : GUIDES.chrome.steps)}
    ${b.android ? `<a class="btn btn-primary btn-block" data-chrome href="${chromeIntentUrl()}">Buka di Chrome</a>` : ''}
    <button class="btn btn-ghost btn-block" data-copy-link>${icon('copy')} Salin alamat situs</button>`
}

/** Pasang aplikasi: dialog bawaan peramban bila tersedia, selain itu panduan. */
export async function installApp() {
  const p = window.__installPrompt
  if (p) {
    try {
      p.prompt()
      const choice = await p.userChoice
      window.__installPrompt = null
      document.documentElement.classList.remove('can-install')
      if (choice && choice.outcome === 'accepted') return 'accepted'
      return 'dismissed'
    } catch {
      window.__installPrompt = null
    }
  }
  openSheet({
    title: 'Pasang QuranKu',
    content: installGuideHtml(),
    onOpen: (el) => {
      const c = el.querySelector('[data-copy-link]')
      if (c) c.onclick = async () => toast((await copyText(location.origin + '/')) !== false ? 'Alamat disalin — tempel di Chrome' : 'Gagal menyalin')
    }
  })
  return 'guide'
}

export function installDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return !!t && Date.now() - t < 14 * 864e5 // tawarkan lagi setelah 14 hari
  } catch {
    return false
  }
}
export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {}
}
