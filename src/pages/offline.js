import { pageHeader } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { confirmDialog } from '../components/modal.js'
import { getSurahList } from '../api/api-adapter.js'
import { surahRepo, audioRepo } from '../database/repositories.js'
import { storageInfo, downloadSurahs, deleteSurah, clearTextCache, clearAudio, deleteAudio, clearAppCache, requestPersistence } from '../services/offline.js'
import { QARI } from '../config.js'
import { $, esc, toast } from '../utils/helpers.js'
import { formatBytes } from '../utils/format.js'
import { juzList } from '../utils/quran-meta.js'

export default async function offline(root) {
  root.innerHTML = `<div class="page">${pageHeader('Kelola Offline')}<div data-body></div></div>`
  const body = $('[data-body]', root)
  let ctrl = null
  let list = []
  try {
    list = await getSurahList()
  } catch {}

  async function render() {
    const [info, saved, audios] = await Promise.all([storageInfo(), surahRepo.all(), audioRepo.all()])
    saved.sort((a, b) => a.nomor - b.nomor)
    const pct = info.quota ? Math.min(100, (info.usage / info.quota) * 100) : 0
    body.innerHTML = `
      <section class="card"><p class="eyebrow">Penyimpanan</p>
        <h2>${formatBytes(info.usage)} <small class="muted">dari ${info.quota ? formatBytes(info.quota) : '—'}</small></h2>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="stat-grid"><div><b>${info.surahs}</b><small>surah tersimpan</small></div><div><b>${info.tafsir}</b><small>tafsir tersimpan</small></div><div><b>${info.audio}</b><small>audio diunduh</small></div><div><b>${info.persisted ? 'Ya' : 'Tidak'}</b><small>penyimpanan permanen</small></div></div>
        ${info.persisted ? '' : `<button class="btn sm" data-persist>${icon('shield')}Minta penyimpanan permanen</button>`}
        <p class="hint">Angka penyimpanan adalah perkiraan dari browser.</p></section>

      <section class="card"><p class="eyebrow">Unduh teks surah (selektif)</p>
        <p class="muted">Teks Arab, Latin, dan terjemahan disimpan ke perangkat. Tidak termasuk audio.</p>
        <div class="control-grid">
          <label class="field"><span>Pilihan</span><select data-sel>
            <option value="missing">Semua yang belum tersimpan (${114 - info.surahs})</option>
            <option value="all">Seluruh 114 surah</option>
            <option value="juz30">Juz 30 (surah 78–114)</option>
            <option value="range">Rentang nomor surah…</option>
            ${juzList().map((j) => `<option value="juz:${j.juz}">Surah pada Juz ${j.juz}</option>`).join('')}
          </select></label>
          <label class="field" data-range hidden><span>Dari – sampai</span><div class="input-row"><input type="number" min="1" max="114" value="1" data-from /><input type="number" min="1" max="114" value="10" data-to /></div></label>
        </div>
        <label class="switch-row"><span>Sertakan tafsir</span><input type="checkbox" data-tafsir /></label>
        <div class="btn-row"><button class="btn btn-primary" data-start>${icon('download')}Mulai unduh</button><button class="btn" data-stop hidden>Hentikan</button></div>
        <div class="bar" data-dlbar hidden><i style="width:0%"></i></div><p class="hint" data-dlmsg></p></section>

      <section class="card"><p class="eyebrow">Surah tersimpan (${saved.length})</p>
        ${saved.length ? `<div class="list compact">${saved.map((s) => `<div class="row-link with-del"><a href="#/surah/${s.nomor}"><span><strong>${s.nomor}. ${esc(s.namaLatin)}</strong><small>${s.jumlahAyat} ayat · ${esc(s.source === 'equran' ? 'EQuran.id' : 'Al Quran Cloud')}</small></span></a><button class="icon-btn sm" data-del-surah="${s.nomor}" aria-label="Hapus surah ${esc(s.namaLatin)}">${icon('trash')}</button></div>`).join('')}</div>
        <div class="btn-row"><button class="btn btn-danger" data-clear-text>${icon('trash')}Hapus semua teks & tafsir</button></div>` : '<p class="muted">Belum ada surah tersimpan. Surah otomatis disimpan saat dibuka.</p>'}</section>

      <section class="card"><p class="eyebrow">Audio diunduh (${audios.length})</p>
        ${audios.length ? `<div class="list compact">${audios.map((a) => `<div class="row-link with-del"><span><strong>${esc(a.surahName || 'Surah ' + a.surah)}${a.kind === 'ayah' ? ' · ayat ' + a.ayah : ''}</strong><small>${esc(QARI[a.qari] || '')} · ${a.opaque ? 'ukuran tidak diketahui' : formatBytes(a.size)}</small></span><button class="icon-btn sm" data-del-audio="${esc(a.url)}" aria-label="Hapus audio">${icon('trash')}</button></div>`).join('')}</div>
        <div class="btn-row"><button class="btn btn-danger" data-clear-audio>${icon('trash')}Hapus semua audio</button></div>` : '<p class="muted">Belum ada audio diunduh. Unduh dari halaman <a class="link" href="#/murottal">Murottal</a>.</p>'}</section>

      <section class="card"><p class="eyebrow">Cache aplikasi</p>
        <p class="muted">Menghapus cache aset (tampilan, font). Akan diunduh ulang saat online. Data pribadi tidak terhapus.</p>
        <div class="btn-row"><button class="btn" data-clear-app>${icon('refresh')}Hapus cache aplikasi</button></div></section>`
  }

  function selection(saved) {
    const v = $('[data-sel]', body).value
    const all = Array.from({ length: 114 }, (_, i) => i + 1)
    if (v === 'all') return all
    if (v === 'missing') return all.filter((n) => !saved.has(n))
    if (v === 'juz30') return all.filter((n) => n >= 78)
    if (v === 'range') {
      const a = Math.max(1, Math.min(114, parseInt($('[data-from]', body).value, 10) || 1))
      const b = Math.max(1, Math.min(114, parseInt($('[data-to]', body).value, 10) || a))
      return all.filter((n) => n >= Math.min(a, b) && n <= Math.max(a, b))
    }
    const j = juzList()[parseInt(v.split(':')[1], 10) - 1]
    return all.filter((n) => n >= j.start[0] && n <= j.end[0])
  }

  body.addEventListener('change', (e) => {
    if (e.target.matches('[data-sel]')) $('[data-range]', body).hidden = e.target.value !== 'range'
  })
  body.addEventListener('click', async (e) => {
    const t = e.target
    if (t.closest('[data-start]')) {
      if (!navigator.onLine) return toast('Sambungkan internet untuk mengunduh.')
      const nums = selection(new Set(await surahRepo.keys()))
      if (!nums.length) return toast('Semua surah pada pilihan ini sudah tersimpan.')
      ctrl = new AbortController()
      const bar = $('[data-dlbar]', body)
      const msg = $('[data-dlmsg]', body)
      bar.hidden = false
      $('[data-stop]', body).hidden = false
      t.closest('[data-start]').disabled = true
      const r = await downloadSurahs(nums, {
        withTafsir: $('[data-tafsir]', body).checked,
        signal: ctrl.signal,
        onProgress(done, total, n, ok) {
          bar.firstElementChild.style.width = (done / total) * 100 + '%'
          msg.textContent = `${done}/${total} — ${list[n - 1] ? list[n - 1].namaLatin : 'Surah ' + n}${ok ? '' : ' (gagal)'}`
        }
      })
      toast(`Selesai: ${r.done - r.failed} surah tersimpan${r.failed ? ', ' + r.failed + ' gagal' : ''}`)
      ctrl = null
      return render()
    }
    if (t.closest('[data-stop]')) return ctrl && ctrl.abort()
    if (t.closest('[data-persist]')) {
      toast((await requestPersistence()) ? 'Penyimpanan permanen aktif' : 'Browser belum mengizinkan penyimpanan permanen')
      return render()
    }
    let b
    if ((b = t.closest('[data-del-surah]'))) {
      await deleteSurah(+b.dataset.delSurah)
      return render()
    }
    if ((b = t.closest('[data-del-audio]'))) {
      await deleteAudio(b.dataset.delAudio)
      return render()
    }
    if (t.closest('[data-clear-text]') && (await confirmDialog('Hapus semua teks surah & tafsir yang tersimpan?', { danger: true, ok: 'Hapus' }))) {
      await clearTextCache()
      return render()
    }
    if (t.closest('[data-clear-audio]') && (await confirmDialog('Hapus semua audio yang diunduh?', { danger: true, ok: 'Hapus' }))) {
      await clearAudio()
      return render()
    }
    if (t.closest('[data-clear-app]') && (await confirmDialog('Hapus cache aplikasi? Aplikasi perlu online untuk memuat ulang aset.'))) {
      await clearAppCache()
      toast('Cache aplikasi dihapus')
      return render()
    }
  })
  await render()
  return () => ctrl && ctrl.abort()
}
