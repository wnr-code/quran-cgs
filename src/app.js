import './styles/tokens.css'
import './styles/theme.css'
import './styles/main.css'
import './styles/reader.css'
import './styles/responsive.css'
import './styles/redesign.css'
import './styles/onboarding.css'
import { App } from '@capacitor/app'
import { initSettings } from './services/storage.js'
import { addRoute, startRouter, navigate } from './router.js'
import { getLastRead } from './services/reading-position.js'
import { renderNavbar, setActiveNav } from './components/navbar.js'
import { initMiniPlayer } from './components/audio-player.js'
import { registerServiceWorker, watchConnectivity } from './services/offline.js'
import { startReminderLoop } from './services/notification.js'
import { initAdzan, adzanTick } from './services/adzan.js'
import { getSurahList } from './api/api-adapter.js'
import { appLinkRoute } from './services/app-links.js'
import { installFetchFailover } from './services/failover.js'
import { initializeNativeShell, hideNativeSplash } from './services/native-shell.js'
import { prepareLegacyNativeData, importLegacyNativeSurahs } from './services/legacy-migration.js'
import { isStandalone } from './utils/helpers.js'
import { isAndroidApp } from './services/platform.js'
import { showFirstRunOnboarding } from './services/onboarding.js'
import { initInbox } from './services/inbox.js'
import { attachAppOpener } from './services/app-opener.js'

installFetchFailover()

initSettings()
initializeNativeShell()

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
addRoute('/notifikasi', () => import('./pages/notifications.js'))
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
initInbox()
// Peramban dalam aplikasi (WhatsApp/Instagram): tawarkan jalan keluar ke aplikasi di halaman mana pun.
attachAppOpener()

/**
 * Durasi minimum layar pembuka terlihat penuh, dihitung sejak splash native Android ditutup.
 * Salam "Assalamu'alaikum" baru muncul utuh pada ~0,85 detik, jadi waktu tahan ini menentukan
 * berapa lama ia benar-benar terbaca sebelum splash memudar.
 * Wajib dideklarasikan sebelum startRouter(): rute pertama dirender sinkron saat modul ini dievaluasi,
 * sehingga hideSplash() sudah berjalan sebelum baris-baris berikutnya sempat dieksekusi.
 */
const SPLASH_MIN_VISIBLE_MS = { standalone: 2600, browser: 1600 }

let firstRoute = true
startRouter(document.getElementById('view'), (path, meta) => {
  setActiveNav(nav, path)
  document.body.classList.toggle('route-reader', !!meta.reader)
  hideSplash()
  if (firstRoute) {
    firstRoute = false
    showFirstRunOnboarding()
  }
})

// App links from the public site use the router's hash URL (/#/surah/...).
function handleAppLink({ url } = {}) {
  const route = appLinkRoute(url)
  if (route) navigate(route, { replace: true })
}

if (isAndroidApp()) {
  void App.addListener('appUrlOpen', handleAppLink).catch(() => {})
  void App.getLaunchUrl().then(handleAppLink).catch(() => {})
}

// Restore legacy preferences without blocking the first route, then import any cached Quran chapters in the background.
void prepareLegacyNativeData()
  .then((migration) => migration && importLegacyNativeSurahs(migration))
  .catch((error) => console.warn('[migration] data Android lama tidak dapat dipindahkan', error))

/** Tutup layar pembuka setelah halaman pertama siap, dengan waktu tahan agar salam sempat terbaca. */
function hideSplash() {
  const el = document.getElementById('splash')
  if (!el || el.dataset.closing) return
  el.dataset.closing = '1'
  void hideNativeSplash()
  // Splash native menutupi WebView, sehingga waktu muat halaman berjalan di baliknya; mulai hitung dari sini.
  window.__splashAt = Date.now()
  const wait = isStandalone() ? SPLASH_MIN_VISIBLE_MS.standalone : SPLASH_MIN_VISIBLE_MS.browser
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
