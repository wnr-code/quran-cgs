import './styles/theme.css'
import './styles/main.css'
import './styles/reader.css'
import './styles/responsive.css'
import { initSettings } from './services/storage.js'
import { addRoute, startRouter, navigate } from './router.js'
import { getLastRead } from './services/reading-position.js'
import { renderNavbar, setActiveNav } from './components/navbar.js'
import { initMiniPlayer } from './components/audio-player.js'
import { registerServiceWorker, watchConnectivity } from './services/offline.js'
import { startReminderLoop } from './services/notification.js'
import { initAdzan, adzanTick } from './services/adzan.js'
import { getSurahList } from './api/api-adapter.js'
import { installFetchFailover } from './services/failover.js'

installFetchFailover()

initSettings()

// Lazy loading + code splitting: setiap halaman dimuat saat dibutuhkan.
addRoute('/', () => import('./pages/home.js'))
addRoute('/quran', () => import('./pages/quran.js'))
addRoute('/cari', () => import('./pages/search.js'))
addRoute('/surah/:n', () => import('./pages/reader.js'), { reader: true })
addRoute('/surah/:n/:a', () => import('./pages/reader.js'), { reader: true })
addRoute('/tafsir/:n', () => import('./pages/tafsir.js'))
addRoute('/tafsir/:n/:a', () => import('./pages/tafsir.js'))
addRoute('/murottal', () => import('./pages/murottal.js'))
addRoute('/bookmark', () => import('./pages/bookmark.js'))
addRoute('/lainnya', () => import('./pages/more.js'))
addRoute('/salat', () => import('./pages/prayer.js'))
addRoute('/kalender', () => import('./pages/calendar.js'))
addRoute('/asmaul-husna', () => import('./pages/asmaul.js'))
addRoute('/doa', () => import('./pages/doa.js'))
addRoute('/doa/:tab', () => import('./pages/doa.js'))
addRoute('/tasbih', () => import('./pages/tasbih.js'))
addRoute('/kiblat', () => import('./pages/qibla.js'))
addRoute('/target', () => import('./pages/goal.js'))
addRoute('/offline', () => import('./pages/offline.js'))
addRoute('/infaq', () => import('./pages/infaq.js'))
addRoute('/pengaturan', () => import('./pages/settings.js'))
addRoute('/tentang', () => import('./pages/about.js'))
addRoute('/sumber', () => import('./pages/sources.js'))
// Pintasan PWA "Lanjutkan membaca"
addRoute('/lanjut', async () => ({
  default: async () => {
    const last = await getLastRead()
    navigate(last ? `/surah/${last.surah}?resume=1` : '/quran', { replace: true })
  }
}))

const nav = document.getElementById('navbar')
renderNavbar(nav)
initMiniPlayer(document.getElementById('mini-player'))
watchConnectivity()

startRouter(document.getElementById('view'), (path, meta) => {
  setActiveNav(nav, path)
  document.body.classList.toggle('route-reader', !!meta.reader)
  hideSplash()
})

/** Tutup layar pembuka setelah halaman pertama siap. Di aplikasi terpasang ditahan sebentar agar salam sempat terbaca. */
function hideSplash() {
  const el = document.getElementById('splash')
  if (!el || el.dataset.closing) return
  el.dataset.closing = '1'
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  const wait = Math.max(0, (standalone ? 1400 : 500) - (Date.now() - (window.__splashAt || 0)))
  setTimeout(() => {
    el.classList.add('hide')
    setTimeout(() => el.remove(), 700)
  }, wait)
}
// Pengaman: bila halaman pertama gagal dirender, layar pembuka tetap ditutup.
setTimeout(hideSplash, 5000)


registerServiceWorker()
startReminderLoop()
// Adzan otomatis: diperiksa tiap 15 detik selama aplikasi hidup (juga saat kembali ke layar).
initAdzan()
setInterval(adzanTick, 15000)
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && adzanTick())
adzanTick()
// Saat pertama online: simpan daftar surah & metadata untuk pemakaian offline.
getSurahList().catch(() => {})

// PWA install prompt (ditampilkan lewat tombol di halaman Lainnya/Pengaturan).
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__installPrompt = e
  document.documentElement.classList.add('can-install')
})
window.addEventListener('appinstalled', () => {
  window.__installPrompt = null
  document.documentElement.classList.remove('can-install')
})
