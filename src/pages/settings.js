import { pageHeader } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { confirmDialog } from '../components/modal.js'
import { getSettings, saveSettings, replaceSettings } from '../services/storage.js'
import { wipeUserData } from '../database/repositories.js'
import { clearAudio, clearAppCache } from '../services/offline.js'
import { clearMemory } from '../api/api-adapter.js'
import { doExport, doImport } from './bookmark.js'
import { $, toast } from '../utils/helpers.js'
import { toArabicIndic } from '../utils/arabic-numbers.js'
import { formatHijri } from '../utils/hijri.js'
import { APP, BASMALAH } from '../config.js'
import { clearLegacyNativeData } from '../services/legacy-migration.js'
import { THEME_PRESETS, deriveTheme } from '../utils/theme.js'

const seg = (key, opts, cur) => `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`

/** Panel tema kustom: palet siap pakai + tiga warna pilihan sendiri. */
const sw = (p) => `linear-gradient(135deg, ${deriveTheme(p).vars['--hero-2']} 0 50%, ${p.bg} 50% 100%)`
const customPanel = (c) => `<div class="theme-custom">
    <p class="theme-label">Palet siap pakai</p>
    <div class="theme-presets">${THEME_PRESETS.map((p) => `<button class="theme-sw${p.primary === c.primary && p.accent === c.accent && p.bg === c.bg ? ' on' : ''}" data-preset="${p.id}" aria-label="Palet ${p.name}"><i style="background:${sw(p)}"><b style="background:${p.accent}"></b></i><span>${p.name}</span></button>`).join('')}</div>
    <p class="theme-label">Warna sendiri</p>
    <div class="theme-pick">
      ${[['primary', 'Utama', 'tombol & tautan'], ['accent', 'Aksen', 'hiasan & label'], ['bg', 'Latar', 'terang atau gelap']].map(([k, l, d]) => `<label><input type="color" data-color="${k}" value="${c[k]}" aria-label="Warna ${l}" /><span><strong>${l}</strong><small>${d}</small></span></label>`).join('')}
    </div>
    <div class="theme-preview" aria-hidden="true"><div class="tp-hero"><strong>QuranKu</strong><small>Pratinjau tema</small></div><div class="tp-body"><span class="tp-chip">Label</span><p>Teks contoh di atas latar pilihan Anda.</p><span class="btn btn-primary sm">Tombol</span></div></div>
    <p class="hint">Latar gelap atau terang dikenali otomatis dari warna latar. Bila warna utama terlalu mirip latar, aplikasi menggesernya sedikit agar tulisan tetap terbaca. Warna halaman baca Al-Qur'an diatur terpisah lewat tombol “Aa”.</p>
  </div>`

export default function settings(root) {
  root.innerHTML = `<div class="page">${pageHeader('Pengaturan')}<div data-body></div></div>`
  const body = $('[data-body]', root)
  const render = () => {
    const s = getSettings()
    body.innerHTML = `
      <section class="card"><p class="eyebrow">Tampilan</p>
        <div class="field"><span>Tema</span>${seg('theme', [['auto', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap'], ['custom', 'Kustom']], s.theme)}</div>
        ${s.theme === 'custom' ? customPanel(s.customTheme) : ''}
        <div class="field"><span>Format angka Al-Qur'an</span>${seg('numerals', [['arabic', `Arab-Indic (${toArabicIndic(123)})`], ['latin', 'Latin (123)']], s.numerals)}</div>
        <div class="field"><span>Font Arab</span>${seg('arabicFont', [['amiri', 'Amiri Quran'], ['scheherazade', 'Scheherazade New']], s.arabicFont)}</div>
        <p class="sample-ar" lang="ar" dir="rtl">${BASMALAH}</p>
        <p class="hint">Ukuran font, preset warna, dan mode baca diatur dari tombol “Aa” di halaman baca.</p></section>
      <section class="card"><p class="eyebrow">Kalender Hijriah</p>
        <div class="field"><span>Koreksi tanggal (hari)</span>${seg('hijriAdjust', [[-2, '−2'], [-1, '−1'], [0, '0'], [1, '+1'], [2, '+2']], s.hijriAdjust)}</div>
        <p class="muted">Hari ini: ${formatHijri(new Date(), s.hijriAdjust) || 'tidak didukung perangkat'}</p></section>
      <section class="card"><p class="eyebrow">Cadangan data</p>
        <p class="muted">Bookmark, catatan, riwayat, progres, dan pengaturan disimpan lokal. Ekspor ke berkas JSON untuk dipindahkan ke perangkat lain.</p>
        <div class="btn-row"><button class="btn" data-export>${icon('download')}Ekspor cadangan</button><button class="btn" data-import>${icon('upload')}Impor cadangan</button></div></section>
      <section class="card"><p class="eyebrow">Lainnya</p>
        <div class="menu-list">
          <a href="#/target">${icon('target')}<span>Target & pengingat tilawah</span>${icon('forward')}</a>
          <a href="#/offline">${icon('download')}<span>Kelola penyimpanan offline</span>${icon('forward')}</a>
          <a href="#/tentang">${icon('info')}<span>Tentang & privasi</span>${icon('forward')}</a>
          <a href="#/sumber">${icon('book')}<span>Sumber data</span>${icon('forward')}</a>
        </div></section>
      <section class="card danger-zone"><p class="eyebrow">Hapus data</p>
        <p class="muted">Menghapus seluruh data QuranKu di perangkat ini: bookmark, catatan, riwayat, progres, pengaturan, lokasi, teks & audio tersimpan.</p>
        <div class="btn-row"><button class="btn btn-danger" data-wipe>${icon('trash')}Hapus semua data saya</button></div></section>
      <p class="hint pad center">${APP.name} v${APP.version}</p>`
  }
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-seg] [data-v]')
    if (b) {
      const key = b.closest('[data-seg]').dataset.seg
      saveSettings({ [key]: key === 'hijriAdjust' ? +b.dataset.v : b.dataset.v })
      return render()
    }
    const ps = e.target.closest('[data-preset]')
    if (ps) {
      const p = THEME_PRESETS.find((x) => x.id === ps.dataset.preset)
      saveSettings({ theme: 'custom', customTheme: { primary: p.primary, accent: p.accent, bg: p.bg } })
      return render()
    }
    if (e.target.closest('[data-export]')) return doExport()
    if (e.target.closest('[data-import]')) return doImport(render)
    if (e.target.closest('[data-wipe]')) {
      if (!(await confirmDialog('Semua data QuranKu di perangkat ini akan dihapus permanen dan tidak dapat dikembalikan. Lanjutkan?', { danger: true, ok: 'Hapus semua' }))) return
      await wipeUserData()
      await clearAudio()
      await clearAppCache()
      clearMemory()
      let legacyDataError = false
      try {
        await clearLegacyNativeData()
      } catch (error) {
        legacyDataError = true
        console.warn('[migration] data Android lama belum sepenuhnya terhapus', error)
      }
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {}
      replaceSettings({})
      toast(legacyDataError ? 'Data lokal dihapus; sebagian cache Android lama belum dapat dihapus' : 'Semua data telah dihapus')
      render()
    }
  })
  // Pemilih warna: terapkan langsung saat digeser (tanpa menggambar ulang agar pemilih tidak tertutup).
  body.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.color
    if (!k) return
    saveSettings({ theme: 'custom', customTheme: { [k]: e.target.value } })
    body.querySelectorAll('.theme-sw.on').forEach((b) => b.classList.remove('on'))
  })
  render()
}
