import { pageHeader } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { APP } from '../config.js'
import { installApp, shouldOfferInstall } from '../services/install.js'
import { notificationBell, refreshNotificationBell } from '../components/notification-bell.js'
import { on } from '../utils/helpers.js'

export const MORE_SLOGANS = Object.freeze([
  'Menemani Hari, Mendekatkan Hati kepada Kalamullah.',
  'Teman tilawah untuk hari-hari yang terus berjalan.',
  'Satu ayat, satu langkah mendekat.',
  'Temukan ruang tenang di antara kesibukan.'
])

let previousSlogan = -1
export function nextMoreSlogan(random = Math.random) {
  const sample = Number(random())
  const index = Number.isFinite(sample) ? Math.max(0, Math.min(MORE_SLOGANS.length - 1, Math.floor(sample * MORE_SLOGANS.length))) : 0
  const next = index === previousSlogan ? (index + 1) % MORE_SLOGANS.length : index
  previousSlogan = next
  return MORE_SLOGANS[next]
}

const GROUPS = [
  ['Ibadah', [
    ['/salat', 'clock', 'Jadwal Salat', 'Salat, imsak & buka puasa'],
    ['/kiblat', 'compass', 'Arah Kiblat', 'Kompas ke Ka’bah'],
    ['/kalender', 'calendar', 'Kalender Hijriah', 'Tanggal & hari besar'],
    ['/doa', 'hands', 'Doa Harian', 'Arab, Latin, arti'],
    ['/doa/salat', 'beads', 'Wirid & Doa Usai Salat', 'Berurutan sesudah salam'],
    ['/doa/tahlil', 'beads', 'Tahlil & Doa Arwah', 'Rangkaian lengkap · Quran NU Online'],
    ['/doa/wudhu', 'shield', 'Doa Wudhu', 'Niat & doa tiap gerakan'],
    ['/asmaul-husna', 'star', 'Asmaul Husna', '99 nama Allah'],
    ['/tasbih', 'beads', 'Tasbih Digital', 'Penghitung zikir']
  ]],
  ['Tilawah', [
    ['/target', 'target', 'Target Tilawah', 'Target & statistik'],
    ['/cari', 'search', 'Pencarian', 'Surah, ayat, kata'],
    ['/offline', 'download', 'Kelola Offline', 'Unduhan & penyimpanan']
  ]],
  ['Aplikasi', [
    ['/pengaturan', 'settings', 'Pengaturan', 'Tema, cadangan, pembaruan'],
    ['/tentang', 'info', 'Tentang', 'Fitur, lisensi, privasi'],
    ['/sumber', 'book', 'Sumber Data', 'Asal data & terima kasih']
  ]]
]

export default function more(root) {
  root.innerHTML = `<div class="page more-page">${pageHeader('Lainnya', { back: false, actions: notificationBell() })}
    <section class="more-hero" aria-labelledby="more-brand-title">
      <img src="/icons/icon-192-v2.png" alt="" aria-hidden="true" width="56" height="56" />
      <div class="more-brand-copy">
        <div class="more-brand-title"><h2 id="more-brand-title">${APP.name}</h2><span class="more-chip">Versi ${APP.version}</span></div>
        <p class="more-arabic" lang="ar" dir="rtl">كَلَامُ اللَّهِ</p>
        <p class="more-slogan" data-more-slogan>${nextMoreSlogan()}</p>
        <p class="more-promise" aria-label="Gratis, tanpa iklan atau analitik">Gratis <span aria-hidden="true">•</span> Tanpa Iklan <span aria-hidden="true">•</span> Tanpa Analitik</p>
      </div>
    </section>
    <button type="button" class="card install-card" data-install>${icon('download')}<span><strong>Pasang QuranKu</strong><small>Tambahkan ke layar utama agar terbuka layar penuh & bisa offline</small></span></button>
    <a class="more-infaq" href="#/infaq"><span class="more-infaq-ic" aria-hidden="true">${icon('heart')}</span><span><strong>Infaq Pengembang</strong><small>Dukung QuranKu & lihat papan donatur</small></span><span class="more-go" aria-hidden="true">›</span></a>
    ${GROUPS.map(([g, items], index) => `<h3 class="section-title" id="more-group-${index}">${g}</h3><div class="menu-grid tone-${g.toLowerCase()}" role="group" aria-labelledby="more-group-${index}">${items.map(([p, i, t, s]) => `<a class="menu-item" href="#${p}"><span class="shortcut-ic" aria-hidden="true">${icon(i)}</span><span><strong>${t}</strong><small>${s}</small></span></a>`).join('')}</div>`).join('')}
  </div>`

  const card = root.querySelector('[data-install]')
  card.hidden = !shouldOfferInstall()
  card.onclick = async () => {
    if ((await installApp()) === 'accepted') card.hidden = true
  }
  const stopInbox = on('inbox:changed', () => void refreshNotificationBell(root))
  void refreshNotificationBell(root)
  return stopInbox
}
