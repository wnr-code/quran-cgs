import { getSurahList, friendlyError } from '../api/api-adapter.js'
import { QARI, QARI_AYAH, QARI_SURAH, APP } from '../config.js'
import { pageHeader, skeleton, errorState } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { openSheet } from '../components/modal.js'
import * as audio from '../services/audio.js'
import { downloadAudio, isAudioDownloaded, deleteAudio } from '../services/offline.js'
import { getSettings } from '../services/storage.js'
import { $, esc, on, toast, debounce } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
import { formatTime, formatBytes } from '../utils/format.js'
import { openShare } from '../components/share-sheet.js'
import { rerender } from '../router.js'

// Piringan hias (bintang delapan/rub el hizb) yang berputar pelan selama audio diputar.
const DISC_SVG = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor"><circle cx="50" cy="50" r="46" stroke-width="1.5"/><circle cx="50" cy="50" r="39" stroke-width=".8" stroke-dasharray="1.5 4"/><rect x="24" y="24" width="52" height="52" rx="3" stroke-width="1.6"/><rect x="24" y="24" width="52" height="52" rx="3" stroke-width="1.6" transform="rotate(45 50 50)"/><circle cx="50" cy="50" r="15" stroke-width="1.4"/><circle cx="50" cy="50" r="4" fill="currentColor" stroke="none"/></svg>`

const qariOption = (current) => (k) => `<option value="${k}" ${k === current ? 'selected' : ''}>${esc(QARI[k])}</option>`

export default async function murottal(root) {
  const a0 = getSettings().audio
  root.innerHTML = `<div class="page mur-page">
    ${pageHeader('Murottal', { back: false, subtitle: 'Dengarkan tilawah para qari' })}
    <section class="card now-playing ornament" data-np>
      <div class="np-art" aria-hidden="true">
        <span class="np-ring"></span><span class="np-ring r2"></span>
        <span class="np-disc">${DISC_SVG}</span>
      </div>
      <div class="np-body" data-np-body></div>
    </section>
    <section class="card mur-qari">
      <span class="shortcut-ic">${icon('headphones')}</span>
      <label class="field"><span>Qari</span><select data-qari>
        <optgroup label="Per ayat & surah penuh">${Object.keys(QARI_AYAH).map(qariOption(a0.qari)).join('')}</optgroup>
        <optgroup label="Surah penuh saja">${Object.keys(QARI_SURAH).map(qariOption(a0.qari)).join('')}</optgroup>
      </select></label>
      <p class="hint" data-qari-note ${QARI_SURAH[a0.qari] ? '' : 'hidden'}>Qari ini hanya memiliki audio surah penuh. Audio per ayat di halaman baca tetap memakai qari per-ayat terakhir yang Anda pilih.</p>
    </section>
    <details class="card mur-settings">
      <summary>${icon('settings')}<span>Pengaturan pemutar</span>${icon('down', 'chev')}</summary>
      <div class="control-grid">
        <label class="field"><span>Ulangi</span><select data-repeat><option value="none">Tidak</option><option value="ayah">Ulangi ayat</option><option value="surah">Ulangi surah</option></select></label>
        <label class="field"><span>Kecepatan</span><select data-rate>${[0.75, 1, 1.25, 1.5].map((r) => `<option value="${r}">${r}×</option>`).join('')}</select></label>
      </div>
      <label class="field range"><span>${icon('volume')} Volume <output data-vol-out></output></span><input type="range" data-vol min="0" max="1" step="0.05" /></label>
      <label class="switch-row"><span>Putar otomatis ayat berikutnya</span><input type="checkbox" data-auto /></label>
    </details>
    <div class="search-box">${icon('search')}<input type="search" placeholder="Cari surah…" aria-label="Cari surah" autocomplete="off" /></div>
    <div data-list>${skeleton(8)}</div>
    <p class="hint pad">Audio diputar langsung (streaming) dari server sumber. Audio hanya disimpan ke perangkat bila Anda menekan tombol unduh.</p>
  </div>`
  const npCard = $('[data-np]', root)
  const np = $('[data-np-body]', root)
  const listEl = $('[data-list]', root)
  $('[data-repeat]', root).value = a0.repeat
  $('[data-rate]', root).value = String(a0.rate)
  $('[data-vol]', root).value = a0.volume
  $('[data-vol-out]', root).textContent = Math.round(a0.volume * 100) + '%'
  $('[data-auto]', root).checked = a0.autoPlay

  /** Menandai surah aktif, status putarnya, dan apakah audio surah sedang diulang. */
  const markRows = (s = audio.getAudioState()) => {
    const cur = s.mode && s.surah ? String(s.surah.nomor) : ''
    const repeatingSurah = audio.audioSettings().repeat === 'surah'
    for (const row of listEl.querySelectorAll('.audio-row')) {
      const on = row.dataset.n === cur
      row.classList.toggle('is-current', on)
      row.classList.toggle('is-playing', on && !!s.playing)
      const repeat = row.querySelector('[data-repeat-surah]')
      if (repeat) {
        const active = on && s.mode === 'surah' && repeatingSurah
        repeat.classList.toggle('on', active)
        repeat.setAttribute('aria-pressed', String(active))
      }
    }
  }
  const renderNP = (s = audio.getAudioState()) => {
    $('[data-repeat]', root).value = audio.audioSettings().repeat
    npCard.classList.toggle('is-playing', !!s.playing)
    npCard.classList.toggle('is-idle', !s.mode)
    markRows(s)
    if (!s.mode) {
      np.innerHTML = `<p class="eyebrow">Sedang diputar</p><h2>Belum ada audio</h2><p class="np-sub">Pilih surah di bawah untuk mulai mendengarkan.</p>`
      return
    }
    np.innerHTML = `<p class="eyebrow"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${s.playing ? 'Sedang diputar' : 'Dijeda'}${s.local ? ' · offline' : ''}</p>
      <h2>${esc(s.surah.namaLatin)}${s.mode === 'ayah' ? ` · Ayat <span class="qn">${qnum(s.ayah)}</span>` : ''}</h2>
      <p class="np-sub">${esc(QARI[s.qari] || '')} · ${s.mode === 'ayah' ? 'Audio per ayat' : 'Audio seluruh surah'}${s.loading ? ' · memuat…' : ''}</p>
      <input type="range" class="seek" min="0" max="1000" value="${s.duration ? Math.round((s.currentTime / s.duration) * 1000) : 0}" aria-label="Posisi audio" />
      <div class="np-time"><span data-cur>${formatTime(s.currentTime)}</span><span data-dur>${formatTime(s.duration)}</span></div>
      <div class="np-controls">
        <a class="icon-btn on-dark" href="/surah/${s.surah.nomor}${s.mode === 'ayah' ? '/' + s.ayah : ''}" aria-label="Buka di pembaca">${icon('book')}</a>
        <button class="icon-btn on-dark" data-act="prev" aria-label="Sebelumnya">${icon('prev')}</button>
        <button class="icon-btn on-dark np-main" data-act="toggle" aria-label="${s.playing ? 'Jeda' : 'Lanjutkan'}">${icon(s.playing ? 'pause' : 'play')}</button>
        <button class="icon-btn on-dark" data-act="next" aria-label="Berikutnya" ${s.mode !== 'ayah' ? 'disabled' : ''}>${icon('next')}</button>
        <button class="icon-btn on-dark" data-act="stop" aria-label="Stop">${icon('stop')}</button>
      </div>`
  }
  let seeking = false
  np.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]')
    if (b && audio[b.dataset.act]) audio[b.dataset.act]()
  })
  np.addEventListener('input', (e) => {
    if (e.target.classList.contains('seek')) seeking = true
  })
  np.addEventListener('change', (e) => {
    if (e.target.classList.contains('seek')) {
      audio.seek(e.target.value / 1000)
      seeking = false
    }
  })
  const offs = [
    on('audio:state', renderNP),
    on('audio:time', ({ currentTime, duration }) => {
      const seek = $('.seek', np)
      if (!seek) return
      if (!seeking) seek.value = duration ? Math.round((currentTime / duration) * 1000) : 0
      $('[data-cur]', np).textContent = formatTime(currentTime)
      $('[data-dur]', np).textContent = formatTime(duration)
    })
  ]
  renderNP()

  $('[data-qari]', root).onchange = (e) => {
    audio.setQari(e.target.value)
    $('[data-qari-note]', root).hidden = !QARI_SURAH[e.target.value]
    if (listReady) renderList() // daftar surah mungkin masih dimuat
  }
  $('[data-repeat]', root).onchange = (e) => audio.setRepeat(e.target.value)
  $('[data-rate]', root).onchange = (e) => audio.setRate(parseFloat(e.target.value))
  $('[data-vol]', root).oninput = (e) => {
    audio.setVolume(parseFloat(e.target.value))
    $('[data-vol-out]', root).textContent = Math.round(e.target.value * 100) + '%'
  }
  $('[data-auto]', root).onchange = (e) => audio.setAutoPlay(e.target.checked)

  let list
  let listReady = false
  try {
    list = await getSurahList()
  } catch (e) {
    listEl.innerHTML = errorState(esc(friendlyError(e)))
    $('[data-retry]', listEl).onclick = rerender
    return () => offs.forEach((f) => f())
  }
  const input = $('.search-box input', root)
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')

  listReady = true
  async function renderList() {
    const q = norm(input.value)
    const items = q ? list.filter((s) => norm(s.namaLatin).includes(q) || String(s.nomor) === q) : list
    listEl.innerHTML = `<div class="list">${items
      .map((s) => `<div class="surah-row audio-row" data-n="${s.nomor}">
        <button class="icon-btn play-full" data-play aria-label="Putar surah ${esc(s.namaLatin)}">${icon('play')}<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></button>
        <span class="surah-meta"><strong>${s.nomor}. ${esc(s.namaLatin)}</strong><small>${esc(s.arti || '')}${s.arti ? ' · ' : ''}<span class="qn">${qnum(s.jumlahAyat)}</span> ayat</small></span>
        <span class="surah-ar" lang="ar" dir="rtl">${esc(s.nama)}</span>
        <button class="icon-btn sm" data-repeat-surah aria-label="Ulangi surah ${esc(s.namaLatin)}" aria-pressed="false" title="Putar surah berulang">${icon('repeat')}</button>
        <button class="icon-btn sm" data-dl aria-label="Unduh audio surah untuk offline">${icon('download')}</button>
        <button class="icon-btn sm" data-share-audio title="Bagikan audio surah" aria-label="Bagikan audio surah">${icon('share')}</button>
      </div>`)
      .join('')}</div>`
    markRows()
    // Tandai yang sudah diunduh
    for (const row of listEl.querySelectorAll('.audio-row')) {
      const s = list[row.dataset.n - 1]
      const pick = audio.pickSurahAudio(s)
      if (pick && (await isAudioDownloaded(pick.url))) row.querySelector('[data-dl]').classList.add('on')
    }
  }

  listEl.addEventListener('click', async (e) => {
    const row = e.target.closest('.audio-row')
    if (!row) return
    const s = list[row.dataset.n - 1]
    if (e.target.closest('[data-play]')) {
      const st = audio.getAudioState()
      if (st.mode === 'surah' && st.surah && st.surah.nomor === s.nomor) return audio.toggle()
      return audio.playSurah(s)
    }
    if (e.target.closest('[data-repeat-surah]')) {
      const current = audio.getAudioState()
      const sameSurah = current.mode === 'surah' && current.surah && current.surah.nomor === s.nomor
      const repeating = sameSurah && audio.audioSettings().repeat === 'surah'
      if (repeating) {
        audio.setRepeat('none')
        return
      }
      audio.setRepeat('surah')
      if (!sameSurah) return audio.playSurah(s)
      if (!current.playing) audio.resume()
      return
    }
    if (e.target.closest('[data-share-audio]')) {
      // Jangan berhenti ketika audio belum diketahui: daftar surah dari sumber cadangan tidak
      // menyertakan audioFull (dan proxy /api/quran memang tidak meneruskannya), sehingga
      // pickSurahAudio() mengembalikan null dan tombol bagikan tampak mati. Halaman Murottal
      // tetap bermakna untuk dibagikan, jadi teruskan tautannya dengan keterangan seadanya.
      const pick = audio.pickSurahAudio(s)
      const qari = pick ? QARI[pick.qari] || 'Murottal' : ''
      const title = pick ? `${s.namaLatin} — Murottal ${qari}` : `${s.namaLatin} — Murottal`
      const text = pick
        ? `Dengarkan murottal Surah ${s.namaLatin} oleh ${qari}.\nTautan audio: ${pick.url}`
        : `Dengarkan murottal Surah ${s.namaLatin} di QuranKu.`
      openShare(
        { title, text, url: `${APP.origin}/murottal` },
        { title: 'Bagikan audio', what: 'audio', hint: 'Bagikan tautan audio langsung dan halaman Murottal melalui media sosial atau aplikasi lain.' }
      )
      return
    }
    const dl = e.target.closest('[data-dl]')
    if (dl) {
      const pick = audio.pickSurahAudio(s)
      if (!pick) return toast('Audio surah tidak tersedia.')
      if (dl.classList.contains('on')) {
        await deleteAudio(pick.url)
        dl.classList.remove('on')
        return toast('Unduhan audio dihapus')
      }
      dl.disabled = true
      dl.classList.add('busy')
      toast(`Mengunduh audio ${s.namaLatin} (${QARI[pick.qari]})…`, 4000)
      try {
        const r = await downloadAudio(pick.url, { surah: s.nomor, surahName: s.namaLatin, qari: pick.qari, kind: 'surah' })
        dl.classList.add('on')
        toast(`Audio tersimpan untuk offline${r.size ? ' (' + formatBytes(r.size) + ')' : ''}`)
      } catch {
        toast('Gagal mengunduh audio. Periksa koneksi.')
      }
      dl.disabled = false
      dl.classList.remove('busy')
    }
  })
  input.addEventListener('input', debounce(renderList, 150))
  renderList()
  return () => offs.forEach((f) => f())
}
