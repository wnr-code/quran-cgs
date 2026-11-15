import { pageHeader } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { toast } from '../utils/helpers.js'
import { APP } from '../config.js'
import { checkForUpdate } from '../services/offline.js'

const GROUPS = [
  ['Ibadah', [
    ['/salat', 'clock', 'Jadwal Salat', 'Waktu salat & imsak'],
    ['/kiblat', 'compass', 'Arah Kiblat', 'Kompas ke Ka’bah'],
    ['/kalender', 'calendar', 'Kalender Hijriah', 'Tanggal & hari besar'],
    ['/doa', 'hands', 'Doa Harian', 'Arab, Latin, arti'],
    ['/doa/salat', 'beads', 'Wirid & Doa Usai Salat', 'Berurutan sesudah salam'],
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
    ['/pengaturan', 'settings', 'Pengaturan', 'Tema, angka, cadangan'],
    ['/tentang', 'info', 'Tentang', 'Fitur, lisensi, privasi'],
    ['/sumber', 'book', 'Sumber Data', 'Asal data & terima kasih']
  ]]
]
import { installApp, shouldOfferInstall } from '../services/install.js'

export default function more(root) {
  root.innerHTML = `<div class="page more-page">${pageHeader('Lainnya', { back: false })}
    <section class="more-hero"><img src="/icons/icon-192-v2.png" alt="" width="56" height="56" />
      <div><h2>QuranKu</h2><p>Teman ibadah harian — gratis, tanpa iklan.</p><span class="more-chip">Versi ${APP.version}</span></div></section>
    <button class="card install-card" data-install>${icon('download')}<span><strong>Pasang QuranKu</strong><small>Tambahkan ke layar utama agar terbuka layar penuh & bisa offline</small></span></button>
    <a class="more-infaq" href="#/infaq"><span class="more-infaq-ic">${icon('heart')}</span><span><strong>Infaq Pengembang</strong><small>Dukung QuranKu & lihat papan donatur</small></span><span class="more-go" aria-hidden="true">›</span></a>
    ${GROUPS.map(([g, items]) => `<h3 class="section-title">${g}</h3><div class="menu-grid tone-${g.toLowerCase()}">${items.map(([p, i, t, s]) => `<a class="menu-item" href="#${p}"><span class="shortcut-ic">${icon(i)}</span><span><strong>${t}</strong><small>${s}</small></span></a>`).join('')}</div>`).join('')}
    <section class="card version-card">
      <span class="shortcut-ic">${icon('refresh')}</span>
      <span class="version-text"><strong>QuranKu ${APP.version}</strong><small data-version>${APP.versionLabel}</small><small data-update-note>Versi yang berjalan di perangkat ini</small></span>
      <button class="btn btn-sm" data-update>Periksa</button>
    </section>
  </div>`
  const note = root.querySelector('[data-update-note]')
  root.querySelector('[data-update]').onclick = async (e) => {
    e.currentTarget.disabled = true
    note.textContent = 'Memeriksa versi terbaru…'
    const r = await checkForUpdate({ force: true })
    if (r === 'updating') note.textContent = 'Versi baru ditemukan — sedang dipasang, aplikasi akan dimuat ulang…'
    else {
      note.textContent = r === 'offline' ? 'Tidak dapat memeriksa (offline).' : 'Sudah versi terbaru.'
      e.currentTarget.disabled = false
    }
  }
  const card = root.querySelector('[data-install]')
  card.hidden = !shouldOfferInstall()
  card.onclick = async () => {
    if ((await installApp()) === 'accepted') card.hidden = true
  }
}
