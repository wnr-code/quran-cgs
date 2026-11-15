import { pageHeader } from '../components/navbar.js'
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

const seg = (key, opts, cur) => `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`

export default function settings(root) {
  root.innerHTML = `<div class="page">${pageHeader('Pengaturan')}<div data-body></div></div>`
  const body = $('[data-body]', root)
  const render = () => {
    const s = getSettings()
    body.innerHTML = `
      <section class="card"><p class="eyebrow">Tampilan</p>
        <div class="field"><span>Tema</span>${seg('theme', [['auto', 'Otomatis'], ['light', 'Terang'], ['dark', 'Gelap']], s.theme)}</div>
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
          <a href="#/tentang">${icon('info')}<span>Tentang, sumber data & privasi</span>${icon('forward')}</a>
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
    if (e.target.closest('[data-export]')) return doExport()
    if (e.target.closest('[data-import]')) return doImport(render)
    if (e.target.closest('[data-wipe]')) {
      if (!(await confirmDialog('Semua data QuranKu di perangkat ini akan dihapus permanen dan tidak dapat dikembalikan. Lanjutkan?', { danger: true, ok: 'Hapus semua' }))) return
      await wipeUserData()
      await clearAudio()
      await clearAppCache()
      clearMemory()
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {}
      replaceSettings({})
      toast('Semua data telah dihapus')
      render()
    }
  })
  render()
}
