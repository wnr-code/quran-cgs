// Pengaturan tampilan baca & lembar navigasi (ayat / juz / halaman) untuk QuranKu Reading Mode.
import { openSheet } from './modal.js'
import { icon } from './icons.js'
import { getSettings, saveSettings, READER_DEFAULTS } from '../services/storage.js'
import { qnum } from '../utils/arabic-numbers.js'
import { juzStart, pageStart, TOTAL_PAGES, juzOf, pageOf } from '../utils/quran-meta.js'
import { clamp } from '../utils/helpers.js'

export const PRESETS = {
  theme: 'Ikuti tema aplikasi',
  classic: 'Mushaf Klasik',
  ivory: 'Ivory Reading',
  dark: 'Dark Reading',
  night: 'Night Comfort'
}

/** Terapkan pengaturan baca sebagai CSS custom properties pada elemen pembaca. */
export function applyReaderStyle(el) {
  const r = getSettings().reader
  el.dataset.preset = PRESETS[r.preset] ? r.preset : 'theme'
  el.dataset.mode = r.mode
  el.dataset.fabSide = r.fabSide === 'left' ? 'left' : 'right'
  el.classList.toggle('hide-translation', !r.showTranslation)
  el.classList.toggle('hide-latin', !r.showLatin)
  const st = el.style
  st.setProperty('--rd-font', r.fontSize + 'px')
  st.setProperty('--rd-lh', r.lineHeight)
  st.setProperty('--rd-gap', r.gap + 'px')
  st.setProperty('--rd-width', r.width + 'px')
  st.setProperty('--rd-margin', r.margin + 'px')
  st.setProperty('--rd-tr', r.translationSize + 'px')
  r.customBg ? st.setProperty('--rd-bg', r.customBg) : st.removeProperty('--rd-bg')
  r.customText ? st.setProperty('--rd-text', r.customText) : st.removeProperty('--rd-text')
}

const range = (name, label, min, max, step, value, unit = '') => `
  <label class="field range"><span>${label} <output data-out="${name}">${value}${unit}</output></span>
    <input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}" /></label>`

export function openReaderSettings(onChange) {
  const r = getSettings().reader
  const fontSel = getSettings().arabicFont
  openSheet({
    title: 'Tampilan Membaca',
    content: `
      <div class="field"><span>Mode baca</span>
        <div class="seg" data-seg="mode">
          <button data-v="focus" class="${r.mode === 'focus' ? 'on' : ''}">${icon('list')}Terjemahan</button>
          <button data-v="continuous" class="${r.mode === 'continuous' ? 'on' : ''}">${icon('flow')}Mushaf</button>
          <button data-v="page" class="${r.mode === 'page' ? 'on' : ''}">${icon('book')}Halaman mushaf</button>
        </div></div>
      <div class="field"><span>Preset tampilan</span>
        <div class="preset-grid" data-seg="preset">
          ${Object.entries(PRESETS).map(([k, v]) => `<button data-v="${k}" class="preset preset-${k} ${r.preset === k && !r.customBg && !r.customText ? 'on' : ''}"><b lang="ar">بسم</b><span>${v}</span></button>`).join('')}
        </div></div>
      ${range('fontSize', 'Ukuran font Arab', 20, 56, 1, r.fontSize, 'px')}
      ${range('lineHeight', 'Tinggi baris', 1.8, 3.4, 0.1, r.lineHeight)}
      ${range('gap', 'Jarak antarbaris / antarayat', 4, 48, 2, r.gap, 'px')}
      ${range('width', 'Lebar area bacaan', 360, 1200, 20, r.width, 'px')}
      ${range('margin', 'Margin kiri & kanan', 8, 64, 2, r.margin, 'px')}
      ${range('translationSize', 'Ukuran terjemahan', 12, 28, 1, r.translationSize, 'px')}
      <div class="field"><span>Font Arab</span>
        <div class="seg" data-seg="arabicFont">
          <button data-v="amiri" class="${fontSel === 'amiri' ? 'on' : ''}">Amiri Quran</button>
          <button data-v="scheherazade" class="${fontSel === 'scheherazade' ? 'on' : ''}">Scheherazade New</button>
        </div></div>
      <label class="switch-row"><span>Tampilkan terjemahan (mode Terjemahan)</span><input type="checkbox" name="showTranslation" ${r.showTranslation ? 'checked' : ''} /></label>
      <label class="switch-row"><span>Tampilkan transliterasi Latin (mode Terjemahan)</span><input type="checkbox" name="showLatin" ${r.showLatin ? 'checked' : ''} /></label>
      <label class="switch-row"><span>Penanda Tajwid warna</span><input type="checkbox" name="tajweed" ${r.tajweed ? 'checked' : ''} /></label>
      <p class="hint">Mode halaman mempertahankan ukuran huruf yang Anda pilih; bila teks melebihi tinggi layar, gulir di dalam halaman. Tata letak dapat berbeda dari cetakan. Warna Tajwid berasal dari anotasi riwayat Hafs yang cakupannya terbatas, dan bukan pengganti belajar dengan guru.</p>
      <div class="field"><span>Warna kustom (opsional, menimpa preset)</span>
        <div class="color-row">
          <label>Latar <input type="color" name="customBg" value="${r.customBg || '#faf6ea'}" /></label>
          <label>Teks <input type="color" name="customText" value="${r.customText || '#1f2a24'}" /></label>
          <button class="btn sm" data-clear-colors>Pakai warna preset</button>
        </div></div>
      <p class="hint">“Ikuti tema aplikasi” menyamakan halaman baca dengan tema global; preset dan warna kustom menjadi pilihan khusus pembaca. Kecerahan layar tidak diubah oleh QuranKu.</p>
      <div class="btn-row"><button class="btn" data-reset>Kembalikan ke bawaan</button></div>`,
    onOpen(body, close) {
      const commit = (patch) => {
        saveSettings({ reader: patch })
        onChange && onChange(patch)
      }
      body.addEventListener('input', (e) => {
        const t = e.target
        if (t.type === 'range') {
          const v = parseFloat(t.value)
          body.querySelector(`[data-out="${t.name}"]`).textContent = v + (t.dataset.unit || '')
          commit({ [t.name]: v })
        } else if (t.type === 'checkbox') commit({ [t.name]: t.checked })
        else if (t.type === 'color') {
          commit({ [t.name]: t.value })
          body.querySelectorAll('.preset').forEach((b) => b.classList.remove('on'))
        }
      })
      body.addEventListener('click', (e) => {
        const segBtn = e.target.closest('[data-seg] [data-v]')
        if (segBtn) {
          const key = segBtn.closest('[data-seg]').dataset.seg
          segBtn.parentElement.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b === segBtn))
          if (key === 'arabicFont') {
            saveSettings({ arabicFont: segBtn.dataset.v })
            onChange && onChange({})
          } else if (key === 'preset') commit({ preset: segBtn.dataset.v, customBg: '', customText: '' })
          else commit({ [key]: segBtn.dataset.v })
          return
        }
        if (e.target.closest('[data-clear-colors]')) commit({ customBg: '', customText: '' })
        if (e.target.closest('[data-reset]')) {
          commit({ ...READER_DEFAULTS })
          close()
        }
      })
    }
  })
}

/** Lembar "Pergi ke": ayat dalam surah ini, juz, atau halaman mushaf. onGo(surah, ayah) */
export function openJumpSheet({ surah, currentAyah, surahList, onGo }) {
  const n = surah.nomor
  const curPage = pageOf(n, currentAyah)
  const curJuz = juzOf(n, currentAyah)
  openSheet({
    title: 'Pergi ke…',
    content: `
      <form class="jump" data-kind="ayah"><label class="field"><span>Ayat di surah ini (1–${surah.jumlahAyat})</span>
        <div class="input-row"><input type="number" inputmode="numeric" name="v" min="1" max="${surah.jumlahAyat}" value="${currentAyah}" required /><button class="btn btn-primary">Buka ayat</button></div></label></form>
      <form class="jump" data-kind="page"><label class="field"><span>Halaman mushaf (1–${TOTAL_PAGES}) · sekarang <span class="qn">${qnum(curPage)}</span></span>
        <div class="input-row"><input type="number" inputmode="numeric" name="v" min="1" max="${TOTAL_PAGES}" value="${curPage}" required /><button class="btn btn-primary">Buka halaman</button></div></label>
        <div class="btn-row"><button type="button" class="btn sm" data-page="${curPage - 1}" ${curPage <= 1 ? 'disabled' : ''}>${icon('back')}Halaman sebelumnya</button><button type="button" class="btn sm" data-page="${curPage + 1}" ${curPage >= TOTAL_PAGES ? 'disabled' : ''}>Halaman berikutnya${icon('forward')}</button></div></form>
      <form class="jump" data-kind="juz"><label class="field"><span>Juz · sekarang <span class="qn">${qnum(curJuz)}</span></span>
        <div class="input-row"><select name="v">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}" ${i + 1 === curJuz ? 'selected' : ''}>Juz ${i + 1}</option>`).join('')}</select><button class="btn btn-primary">Buka juz</button></div></label></form>
      ${surahList ? `<form class="jump" data-kind="surah"><label class="field"><span>Surah</span>
        <div class="input-row"><select name="v">${surahList.map((s) => `<option value="${s.nomor}" ${s.nomor === n ? 'selected' : ''}>${s.nomor}. ${s.namaLatin}</option>`).join('')}</select><button class="btn btn-primary">Buka surah</button></div></label></form>` : ''}
      <p class="hint">Nomor halaman mengikuti Mushaf Madinah (604 halaman). Sumber metadata: paket <code>quran-meta</code>.</p>`,
    onOpen(body, close) {
      const go = (s, a) => {
        close()
        onGo(s, a)
      }
      body.addEventListener('submit', (e) => {
        e.preventDefault()
        const f = e.target
        const v = parseInt(f.elements.v.value, 10)
        if (!Number.isFinite(v)) return
        const kind = f.dataset.kind
        if (kind === 'ayah') go(n, clamp(v, 1, surah.jumlahAyat))
        else if (kind === 'page') go(...pageStart(clamp(v, 1, TOTAL_PAGES)))
        else if (kind === 'juz') go(...juzStart(clamp(v, 1, 30)))
        else if (kind === 'surah') go(clamp(v, 1, 114), 1)
      })
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-page]')
        if (b && !b.disabled) go(...pageStart(clamp(parseInt(b.dataset.page, 10), 1, TOTAL_PAGES)))
      })
    }
  })
}
