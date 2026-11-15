import { pageHeader } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { toast } from '../utils/helpers.js'

const GROUPS = [
  ['Ibadah', [
    ['/salat', 'clock', 'Jadwal Salat', 'Waktu salat & imsak'],
    ['/kiblat', 'compass', 'Arah Kiblat', 'Kompas ke Ka’bah'],
    ['/kalender', 'calendar', 'Kalender Hijriah', 'Tanggal & hari besar'],
    ['/doa', 'hands', 'Doa Harian', 'Arab, Latin, arti'],
    ['/asmaul-husna', 'star', 'Asmaul Husna', '99 nama Allah'],
    ['/tasbih', 'beads', 'Tasbih Digital', 'Penghitung zikir']
  ]],
  ['Tilawah', [
    ['/target', 'target', 'Target Tilawah', 'Target & statistik'],
    ['/cari', 'search', 'Pencarian', 'Surah, ayat, kata'],
    ['/offline', 'download', 'Kelola Offline', 'Unduhan & penyimpanan']
  ]],
  ['Aplikasi', [
    ['/infaq', 'heart', 'Infaq Pengembang', 'Dukung & papan donatur'],
    ['/pengaturan', 'settings', 'Pengaturan', 'Tema, angka, cadangan'],
    ['/tentang', 'info', 'Tentang & Privasi', 'Sumber data, kebijakan']
  ]]
]

export default function more(root) {
  root.innerHTML = `<div class="page">${pageHeader('Lainnya', { back: false })}
    <button class="card install-card" data-install>${icon('download')}<span><strong>Pasang QuranKu</strong><small>Tambahkan ke layar utama agar terbuka layar penuh & bisa offline</small></span></button>
    ${GROUPS.map(([g, items]) => `<h3 class="section-title">${g}</h3><div class="menu-grid">${items.map(([p, i, t, s]) => `<a class="menu-item" href="#${p}"><span class="shortcut-ic">${icon(i)}</span><span><strong>${t}</strong><small>${s}</small></span></a>`).join('')}</div>`).join('')}
  </div>`
  root.querySelector('[data-install]').onclick = async () => {
    const p = window.__installPrompt
    if (!p) return toast('Gunakan menu browser → “Tambahkan ke layar utama / Instal aplikasi”.')
    p.prompt()
    await p.userChoice
    window.__installPrompt = null
    document.documentElement.classList.remove('can-install')
  }
}
