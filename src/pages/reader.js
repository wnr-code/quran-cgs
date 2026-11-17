// QURANKU READING MODE — halaman baca surah (Mushaf Continuous & Ayah Focus) + mode imersif layar penuh.
import { getSurah, getSurahList, friendlyError } from '../api/api-adapter.js'
import { icon } from '../components/icons.js'
import { skeleton, errorState } from '../components/page-layout.js'
import { flowHtml, focusHtml, pagesHtml, openAyahSheet, ayahShareText } from '../components/ayah-card.js'
import { applyReaderStyle, openReaderSettings, openJumpSheet } from '../components/reading-toolbar.js'
import { openSheet } from '../components/modal.js'
import { initSelectionMenu } from '../components/selection-menu.js'
import { openShare } from '../components/share-sheet.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { savePosition, getLastRead, addHistory } from '../services/reading-position.js'
import { markRead } from '../services/progress.js'
import { playAyah, playSurah, toggle as toggleAudio, getAudioState } from '../services/audio.js'
import { bookmarkRepo, noteRepo } from '../database/repositories.js'
import { $, $$, esc, on, throttle, toast, isStandalone, copyText } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
import { TAJWEED_GUIDE, createTajweedIndex } from '../utils/tajweed.js'
import { juzOf, pageOf } from '../utils/quran-meta.js'
import { tempatTurunLabel } from '../utils/format.js'
import { isSurahNo } from '../utils/validation.js'
import { navigate, rerender } from '../router.js'
import { BASMALAH, APP } from '../config.js'

export default async function reader(root, { params, query, initial }) {
  const n = parseInt(params.n, 10)
  if (!isSurahNo(n)) {
    navigate('/quran', { replace: true })
    return
  }
  root.innerHTML = `<div class="reader" data-preset="ivory"><div class="rd-wrap">${skeleton(1, 'sk-hero')}${skeleton(8, 'sk-line')}</div></div>`
  const readerEl = $('.reader', root)
  applyReaderStyle(readerEl)

  let surah
  try {
    surah = await getSurah(n)
  } catch (e) {
    readerEl.innerHTML = `<header class="rd-top"><button class="icon-btn" data-back="/quran" aria-label="Kembali">${icon('back')}</button><div class="rd-title"><strong>Surah ${n}</strong></div></header><div class="rd-wrap">${errorState(esc(friendlyError(e)))}</div>`
    $('[data-retry]', readerEl).onclick = rerender
    return
  }
  let surahList = null
  getSurahList().then((l) => (surahList = l)).catch(() => {})

  const total = surah.ayat.length
  const marks = { bookmarks: new Set(), notes: new Set() }
  const loadMarks = async () => {
    marks.bookmarks = await bookmarkRepo.forSurah(n)
    marks.notes = new Set((await noteRepo.all()).filter((x) => x.surah === n).map((x) => x.ayah))
  }
  await loadMarks()

  let tajweedIndex = null
  let tajweedLoadPromise = null
  const ensureTajweedData = async () => {
    if (tajweedIndex) return tajweedIndex
    if (!tajweedLoadPromise) {
      tajweedLoadPromise = import('../data/tajweed-spans.json').then((module) => {
        tajweedIndex = createTajweedIndex(module.default)
        return tajweedIndex
      }).catch((error) => {
        tajweedLoadPromise = null
        throw error
      })
    }
    return tajweedLoadPromise
  }
  if (getSettings().reader.tajweed) {
    try {
      await ensureTajweedData()
    } catch {
      saveSettings({ reader: { tajweed: false } })
    }
  }

  const last = await getLastRead()
  // Pulihkan posisi bila diminta (Lanjutkan Membaca) atau saat aplikasi dibuka/dimuat ulang langsung di surah yang sama.
  const resume = (query.resume === '1' || initial) && !params.a && last && last.surah === n ? last : null
  let current = Math.min(total, Math.max(1, parseInt(params.a, 10) || (resume ? resume.ayah : 1)))
  let immersive = false
  let fabOpen = false
  let settingsRestoreTimer = 0
  let audioDockHidden = false
  let pageMode = false
  let ayahEls = []
  let lastMarked = current
  let destroyed = false

  const showBasmalah = n !== 1 && n !== 9
  readerEl.innerHTML = `
    <header class="rd-top rd-bar">
      <button class="icon-btn" data-act="back" aria-label="Kembali ke daftar surah">${icon('back')}</button>
      <button class="rd-title" data-act="jump" aria-label="${esc(surah.namaLatin)} — Pergi ke ayat, juz, atau halaman">
        <strong>${esc(surah.namaLatin)}</strong>
        <small>Juz <span class="reader-juz-chip qn" data-juz></span> · Hal <span class="qn" data-page></span> · Ayat <span class="qn" data-cur></span></small>
      </button>
      <span class="rd-progress" aria-hidden="true"><i data-progress></i></span>
    </header>
    <div class="rd-wrap">
      <section class="surah-hero">
        <div class="surah-frame">
          <p class="surah-frame-ar" lang="ar" dir="rtl">${esc(surah.nama)}</p>
          <h1>${esc(surah.namaLatin)}</h1>
          <p class="surah-frame-sub">${esc(surah.arti)} · ${esc(tempatTurunLabel(surah.tempatTurun))} · <span class="qn">${qnum(total)}</span> ayat · Surah ke-<span class="qn">${qnum(n)}</span></p>
        </div>
        ${surah.source !== 'equran' ? `<p class="source-note">${icon('info')} Sumber cadangan: ${esc(surah.edition ? surah.edition.label : surah.source)} — edisi teks & terjemahan dapat berbeda dari sumber utama.</p>` : ''}
      </section>
      ${showBasmalah ? `<p class="basmalah basmalah-cartouche" lang="ar" dir="rtl">${BASMALAH}</p>` : ''}
      <div class="mushaf" id="reader-mode-panel" data-content role="tabpanel" tabindex="0"></div>
      <nav class="surah-nav">
        ${n > 1 ? `<a class="btn" href="#/surah/${n - 1}">${icon('back')}Surah sebelumnya</a>` : '<span></span>'}
        ${n < 114 ? `<a class="btn" href="#/surah/${n + 1}">Surah berikutnya${icon('forward')}</a>` : '<span></span>'}
      </nav>
      <p class="edition-note">Teks: ${esc(surah.edition ? surah.edition.text : '-')}<br/>Terjemahan: ${esc(surah.edition ? surah.edition.translation : '-')}<br/>Juz & halaman: Mushaf Madinah (604 hlm).</p>
    </div>
    <div class="reader-audio-float" role="group" aria-label="Pemutar audio ayat">
      <div class="reader-audio-dock" id="reader-audio-dock">
        <button class="reader-audio-step" data-act="prev" aria-label="Ayat sebelumnya">${icon('prev')}</button>
        <button class="icon-btn rd-play reader-audio-play" data-act="play" aria-label="Putar audio ayat">${icon('play')}</button>
        <span class="reader-audio-current" data-audio-current aria-live="polite">Ayat ${qnum(current)}</span>
        <button class="reader-audio-step" data-act="next" aria-label="Ayat berikutnya">${icon('next')}</button>
      </div>
      <button class="reader-audio-toggle" data-act="audio-toggle" aria-controls="reader-audio-dock" aria-expanded="true" aria-label="Sembunyikan pemutar audio">${icon('close')}</button>
    </div>
    <nav class="reader-float" aria-label="Kontrol baca">
      <div class="reader-fab-panel" id="reader-fab-panel" hidden>
        <div class="reader-fab-panel-head">
          <span class="reader-fab-caption">Tampilan &amp; fitur baca</span>
          <button type="button" class="reader-fab-close" data-act="fab-toggle" aria-controls="reader-fab-panel" aria-label="Tutup panel kontrol baca">${icon('close')}</button>
        </div>
        <div class="rd-tabs" role="tablist" aria-label="Mode baca">
          <button type="button" id="reader-mode-focus" role="tab" aria-controls="reader-mode-panel" data-mode="focus">${icon('list')}<span>Terjemahan</span></button>
          <button type="button" id="reader-mode-continuous" role="tab" aria-controls="reader-mode-panel" data-mode="continuous">${icon('flow')}<span>Mushaf</span></button>
          <button type="button" id="reader-mode-page" role="tab" aria-controls="reader-mode-panel" data-mode="page">${icon('book')}<span>Halaman</span></button>
        </div>
        <div class="reader-fab-grid">
          <button class="reader-fab-action" data-act="back">${icon('back')}<span>Kembali ke daftar surah</span></button>
          <button class="reader-fab-action" data-act="prev">${icon('up')}<span data-reader-prev>Sebelumnya</span></button>
          <button class="reader-fab-action" data-act="next">${icon('down')}<span data-reader-next>Berikutnya</span></button>
          <button class="reader-fab-action" data-act="play">${icon('play')}<span>Putar ayat ini</span></button>
          <button class="reader-fab-action" data-act="bookmark" aria-pressed="false">${icon('bookmark')}<span>Simpan ayat ini</span></button>
          <button class="reader-fab-action" data-act="more">${icon('more')}<span>Aksi ayat ini</span></button>
          <button class="reader-fab-action" data-act="immersive">${icon('expand')}<span data-immersive-label>Mode membaca</span></button>
          <button class="reader-fab-action" data-act="play-surah">${icon('headphones')}<span>Putar surah</span></button>
          <a class="reader-fab-action" href="#/tafsir/${n}">${icon('book')}<span>Tafsir</span></a>
          <button class="reader-fab-action" data-act="info">${icon('info')}<span>Info surah</span></button>
          <button class="reader-fab-action" data-act="settings">${icon('type')}<span>Tampilan</span></button>
          <button class="reader-fab-action" data-act="tajweed" aria-pressed="${getSettings().reader.tajweed}">${icon('beads')}<span data-tajweed-label>Tajwid: ${getSettings().reader.tajweed ? 'Aktif' : 'Nonaktif'}</span></button>
          <button class="reader-fab-action" data-act="tajweed-guide">${icon('info')}<span>Panduan Tajwid</span></button>
          <button class="reader-fab-action" data-act="fab-side">${icon('forward')}<span data-fab-side-label>Pindah kontrol ke kiri</span></button>
        </div>
      </div>
      <button class="reader-juz-fab" data-act="jump" aria-label="Pergi ke Juz"><small>Juz</small><strong data-fab-juz></strong></button>
      <button class="reader-fab-toggle" data-act="fab-toggle" aria-controls="reader-fab-panel" aria-expanded="false" aria-label="Buka menu baca">${icon('more')}</button>
    </nav>`

  const content = $('[data-content]', readerEl)
  const elCur = $('[data-cur]', readerEl)
  const elJuz = $('[data-juz]', readerEl)
  const elPage = $('[data-page]', readerEl)
  const topBar = $('.rd-top', readerEl)
  const rdTitle = $('.rd-title', readerEl)
  const tablist = $('.rd-tabs', readerEl)
  const fabPanel = $('.reader-fab-panel', readerEl)
  const fabToggle = $('[data-act="fab-toggle"]', readerEl)
  const audioDock = $('.reader-audio-dock', readerEl)
  const audioToggle = $('[data-act="audio-toggle"]', readerEl)
  const audioPlayButton = $('.reader-audio-play', readerEl)
  const elAudioCurrent = $('[data-audio-current]', readerEl)
  const elProgress = $('[data-progress]', readerEl)
  const elFabJuz = $('[data-fab-juz]', readerEl)
  const elTajweedToggle = $('[data-act="tajweed"]', readerEl)
  const elTajweedLabel = $('[data-tajweed-label]', readerEl)
  const elSideLabel = $('[data-fab-side-label]', readerEl)
  const elFabPrev = $('.reader-fab-panel [data-act="prev"]', readerEl)
  const elFabNext = $('.reader-fab-panel [data-act="next"]', readerEl)
  const elFabBookmark = $('.reader-fab-panel [data-act="bookmark"]', readerEl)

  const threshold = () => topBar.offsetHeight + 28
  const scrollBehavior = (smooth) => (smooth && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant')
  const elOf = (a) => ayahEls[a - 1]
  const modeNow = () => {
    const m = getSettings().reader.mode
    return m === 'focus' || m === 'page' ? m : 'continuous'
  }
  let pageEls = []
  const pageIdx = () => Math.min(pageEls.length - 1, Math.max(0, Math.round(Math.abs(content.scrollLeft) / (content.clientWidth || 1))))
  const scrollToPage = (i, smooth = false) => {
    const el = pageEls[i]
    if (!el) return
    // Arah RTL: geseran bernilai negatif di peramban modern; posisi dihitung dari letak lembar agar aman di semua mesin.
    const left = el.getBoundingClientRect().left - content.getBoundingClientRect().left + content.scrollLeft
    content.scrollTo({ left, behavior: scrollBehavior(smooth) })
  }

  function updateFloatingControls() {
    const r = getSettings().reader
    const side = r.fabSide === 'left' ? 'left' : 'right'
    readerEl.dataset.fabSide = side
    elSideLabel.textContent = `Pindah kontrol ke ${side === 'left' ? 'kanan' : 'kiri'}`
    const tajweedActive = !!r.tajweed && !!tajweedIndex
    elTajweedLabel.textContent = `Tajwid: ${tajweedActive ? 'Aktif' : 'Nonaktif'}`
    elTajweedToggle.setAttribute('aria-pressed', String(tajweedActive))
    elTajweedToggle.classList.toggle('is-on', tajweedActive)
    elFabPrev.innerHTML = `${icon(pageMode ? 'forward' : 'up')}<span>${pageMode ? 'Halaman sebelumnya' : 'Ayat sebelumnya'}</span>`
    elFabNext.innerHTML = `${icon(pageMode ? 'back' : 'down')}<span>${pageMode ? 'Halaman berikutnya' : 'Ayat berikutnya'}</span>`
  }

  function setFabMenu(open) {
    if (!open && fabOpen && fabPanel.contains(document.activeElement)) fabToggle.focus()
    fabOpen = open
    fabPanel.hidden = !open
    fabToggle.setAttribute('aria-expanded', String(open))
    fabToggle.setAttribute('aria-label', open ? 'Tutup menu baca' : 'Buka menu baca')
    fabToggle.innerHTML = icon(open ? 'close' : 'more')
    readerEl.classList.toggle('fab-open', open)
  }

  function setAudioDockHidden(hidden) {
    audioDockHidden = hidden
    readerEl.classList.toggle('audio-dock-hidden', hidden)
    audioDock.setAttribute('aria-hidden', String(hidden))
    audioDock.inert = hidden
    audioToggle.setAttribute('aria-expanded', String(!hidden))
    audioToggle.setAttribute('aria-label', hidden ? 'Tampilkan pemutar audio' : 'Sembunyikan pemutar audio')
    audioToggle.innerHTML = icon(hidden ? 'headphones' : 'close')
  }

  function renderContent() {
    const wasPageMode = pageMode
    const mode = modeNow()
    pageMode = mode === 'page'
    applyReaderStyle(readerEl)
    const tajweed = !!getSettings().reader.tajweed && !!tajweedIndex
    readerEl.classList.toggle('tajweed-on', tajweed)
    readerEl.classList.toggle('mode-page', pageMode)
    document.body.classList.toggle('reader-paged', pageMode)
    content.className = 'mushaf ' + (mode === 'focus' ? 'mushaf-focus' : pageMode ? 'mushaf-pages' : 'mushaf-flow')
    if (mode === 'focus') {
      content.removeAttribute('dir')
      content.removeAttribute('lang')
    } else {
      content.setAttribute('dir', 'rtl')
      content.setAttribute('lang', 'ar')
    }
    content.innerHTML = mode === 'focus' ? focusHtml(surah, marks, { tajweed, tajweedIndex }) : pageMode ? pagesHtml(surah, marks, { basmalah: showBasmalah ? BASMALAH : '', tajweed, tajweedIndex }) : flowHtml(surah, marks, { tajweed, tajweedIndex })
    ayahEls = $$('.ayah', content)
    pageEls = pageMode ? $$('.mpage', content) : []
    $$('.rd-tabs [data-mode]', readerEl).forEach((b) => {
      const selected = b.dataset.mode === mode
      b.classList.toggle('on', selected)
      b.setAttribute('aria-selected', String(selected))
      b.tabIndex = selected ? 0 : -1
    })
    content.setAttribute('aria-labelledby', `reader-mode-${mode}`)
    if (pageMode && !wasPageMode) window.scrollTo({ top: 0, behavior: 'instant' })
    updateFloatingControls()
    highlightPlaying()
  }

  function updateInfo() {
    elCur.textContent = qnum(current)
    elJuz.textContent = qnum(juzOf(n, current))
    elFabJuz.textContent = qnum(juzOf(n, current))
    elPage.textContent = qnum(pageOf(n, current))
    rdTitle.setAttribute('aria-label', `${surah.namaLatin} Juz ${elJuz.textContent} · Hal ${elPage.textContent} · Ayat ${elCur.textContent}. Pilih untuk pergi ke ayat, juz, atau halaman`)
    elProgress.style.width = `${Math.max(2, Math.round((current / total) * 100))}%`
    const audioState = getAudioState()
    elAudioCurrent.textContent = `Ayat ${qnum(audioState.mode === 'ayah' && audioState.surah?.nomor === n && audioState.playing ? audioState.ayah : current)}`
    const bookmarked = marks.bookmarks.has(current)
    elFabBookmark.classList.toggle('is-on', bookmarked)
    elFabBookmark.setAttribute('aria-pressed', String(bookmarked))
    $('span', elFabBookmark).textContent = bookmarked ? 'Hapus bookmark ayat' : 'Simpan ayat ini'
  }

  function findCurrent() {
    if (pageMode) {
      const el = pageEls[pageIdx()]
      if (!el || el.hasAttribute('data-end')) return total
      const f = +el.dataset.first
      return current >= f && current <= +el.dataset.last ? current : f
    }
    const y = threshold()
    let lo = 0
    let hi = ayahEls.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (ayahEls[mid].getBoundingClientRect().top <= y) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }

  function scrollToAyah(a, { smooth = false, offset = null, flash = false } = {}) {
    const el = elOf(a)
    if (!el) return
    if (pageMode) {
      const pg = el.closest('.mpage')
      scrollToPage(pageEls.indexOf(pg), smooth)
      const box = $('.mpage-body', pg)
      box.scrollTop = a === +pg.dataset.first ? 0 : Math.max(0, el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12)
      if (flash) {
        el.classList.add('flash')
        setTimeout(() => el.classList.remove('flash'), 1800)
      }
      return
    }
    const top = el.getBoundingClientRect().top + window.scrollY - (offset ?? threshold() - 8)
    window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior(smooth) })
    if (flash) {
      el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1800)
    }
  }

  let ready = false // posisi lama tidak boleh tertimpa sebelum pemulihan pertama selesai
  function persist() {
    if (!ready) return
    const el = elOf(current)
    savePosition({
      surah: n,
      ayah: current,
      surahName: surah.namaLatin,
      surahNameAr: surah.nama,
      total,
      offset: el && !pageMode ? validOffset(Math.round(el.getBoundingClientRect().top)) : null,
      mode: modeNow(),
      immersive
    })
  }
  const validOffset = (v) => (v >= 0 && v < window.innerHeight ? v : null)
  const persistSoon = throttle(persist, 800)
  let userMoved = false
  const onMove = () => (userMoved = true)
  window.addEventListener('wheel', onMove, { passive: true, once: true })
  window.addEventListener('touchmove', onMove, { passive: true, once: true })

  const onScroll = throttle(() => {
    if (destroyed || !ready) return
    const y = window.scrollY
    const c = findCurrent()
    const atEnd = pageMode ? pageIdx() === pageEls.length - 1 : window.innerHeight + y >= document.documentElement.scrollHeight - 40
    if (c !== current) {
      // Tandai ayat yang telah dilewati sebagai terbaca (hanya gerak maju wajar, bukan lompatan jauh).
      if (c > lastMarked && c - lastMarked <= 25) markRead(n, lastMarked, c - 1)
      lastMarked = c
      current = c
      updateInfo()
      persistSoon()
    }
    if (atEnd && total - lastMarked <= 25) {
      markRead(n, lastMarked, total)
      lastMarked = total
    }
  }, 120)

  async function setImmersive(v) {
    if (immersive === v) return
    immersive = v
    document.body.classList.toggle('reading-mode', v)
    $$('[data-act="immersive"]', readerEl).forEach((b) => {
      b.innerHTML = `${icon(v ? 'shrink' : 'expand')}<span>${v ? 'Keluar mode membaca' : 'Mode membaca'}</span>`
    })
    $$('[data-immersive-label]', readerEl).forEach((label) => { label.textContent = v ? 'Keluar mode membaca' : 'Mode membaca' })
    if (v) {
      let fs = false
      // PWA terpasang dan Capacitor sudah tampil tanpa UI browser; Fullscreen API hanya dicoba di tab browser.
      if (!isStandalone() && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
          fs = true
        } catch {}
      }
      toast(fs ? 'Mode membaca layar penuh aktif. Panel kontrol tidak hilang otomatis.' : isStandalone() ? 'Mode membaca aktif. Panel kontrol tidak hilang otomatis.' : 'Mode membaca aktif (layar penuh sistem tidak tersedia). Panel kontrol tidak hilang otomatis.', 3200)
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
    requestAnimationFrame(() => scrollToAyah(current))
    persist()
  }
  const onFsChange = () => {
    if (!document.fullscreenElement && immersive) setImmersive(false)
  }

  function highlightPlaying() {
    const s = getAudioState()
    $$('.ayah.playing', content).forEach((e) => e.classList.remove('playing'))
    const playingHere = s.mode === 'ayah' && s.surah?.nomor === n
    const active = playingHere && s.playing
    if (playingHere && elOf(s.ayah)) elOf(s.ayah).classList.add('playing')
    audioPlayButton.innerHTML = icon(active ? 'pause' : 'play')
    audioPlayButton.setAttribute('aria-label', active ? `Jeda audio ayat ${qnum(s.ayah)}` : `Putar audio ayat ${qnum(current)}`)
    const panelPlay = $('.reader-fab-panel [data-act="play"]', readerEl)
    panelPlay.innerHTML = `${icon(active ? 'pause' : 'play')}<span>${active ? 'Jeda audio ayat' : 'Putar ayat ini'}</span>`
    elAudioCurrent.textContent = `Ayat ${qnum(active ? s.ayah : current)}`
  }

  async function refreshMarks() {
    await loadMarks()
    ayahEls.forEach((el, i) => {
      const bm = marks.bookmarks.has(i + 1)
      el.classList.toggle('is-bookmarked', bm)
      el.classList.toggle('has-note', marks.notes.has(i + 1))
      const b = el.querySelector('.bm-btn')
      if (b) b.setAttribute('aria-pressed', bm)
    })
    updateInfo()
  }

  async function toggleBookmark(a) {
    const onNow = await bookmarkRepo.toggle({ surah: n, ayah: a, surahName: surah.namaLatin })
    toast(onNow ? `Bookmark ayat ${a} disimpan` : `Bookmark ayat ${a} dihapus`)
    refreshMarks()
  }

  function goTo(s, a) {
    if (s === n) {
      current = a
      lastMarked = a
      scrollToAyah(a, { smooth: true, flash: true })
      updateInfo()
      persist()
    } else navigate(`/surah/${s}/${a}`)
  }

  const sheetOpts = {
    onChange: refreshMarks,
    onMarkLast: (a) => {
      current = a
      lastMarked = a
      updateInfo()
      persist()
    }
  }

  const MODE_LABEL = { focus: 'Terjemahan per ayat', continuous: 'Mushaf (gulir ke bawah)', page: 'Mushaf per halaman — geser untuk pindah halaman' }
  function setMode(mode) {
    if (mode === modeNow()) return
    const keep = current
    saveSettings({ reader: { mode } })
    renderContent()
    scrollToAyah(keep, { smooth: true })
    toast(MODE_LABEL[mode])
    persist()
  }
  const goPage = (d) => scrollToPage(pageIdx() + d, true)

  const actions = {
    back: () => navigate('/quran'),
    jump: () => openJumpSheet({ surah, currentAyah: current, surahList, onGo: goTo }),
    mode: () => setMode(modeNow() === 'focus' ? 'continuous' : 'focus'),
    settings: () =>
      openReaderSettings(async (patch) => {
        if (patch && patch.tajweed) {
          try {
            await ensureTajweedData()
          } catch {
            saveSettings({ reader: { tajweed: false } })
            toast('Data Tajwid belum dapat dimuat; warna dinonaktifkan.')
          }
        }
        const keep = current
        clearTimeout(settingsRestoreTimer)
        if (patch && ('mode' in patch || 'tajweed' in patch)) {
          renderContent()
          scrollToAyah(keep)
        } else {
          applyReaderStyle(readerEl)
          updateFloatingControls()
          settingsRestoreTimer = setTimeout(() => {
            settingsRestoreTimer = 0
            if (!destroyed) scrollToAyah(keep)
          }, 80)
        }
      }),
    immersive: () => {
      setFabMenu(false)
      setImmersive(!immersive)
    },
    'play-surah': () => playSurah(surah),
    info: () =>
      openSheet({
        title: `Tentang Surah ${surah.namaLatin}`,
        content: `<p class="prose">${esc(surah.deskripsi || 'Deskripsi tidak tersedia dari sumber data.')}</p><p class="hint">Sumber: ${esc(surah.edition ? surah.edition.label : surah.source)}</p>`
      }),
    tajweed: async () => {
      const enabled = !getSettings().reader.tajweed
      if (enabled) {
        try {
          await ensureTajweedData()
        } catch {
          toast('Data Tajwid belum dapat dimuat; teks tetap ditampilkan tanpa warna.')
          return
        }
      }
      saveSettings({ reader: { tajweed: enabled } })
      renderContent()
      setFabMenu(true)
      toast(`Penanda Tajwid ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`)
    },
    'tajweed-guide': () => openSheet({
      title: 'Panduan warna Tajwid',
      content: `<p class="hint">Warna berasal dari anotasi yang diterbitkan untuk riwayat Hafs, bukan dari tebakan huruf otomatis. Penanda dicocokkan terhadap teks ayat; bila ejaan tidak cocok, warnanya sengaja tidak ditampilkan. Sebagian ayat tidak memiliki anotasi pada data sumber. Cakupan aturan dan tanda waqaf terbatas. Jadikan pengingat belajar, bukan pengganti talaqqi, mushaf Tajwid tepercaya, atau bimbingan guru.</p><div class="tajweed-guide">${TAJWEED_GUIDE.map((rule) => `<div class="tajweed-guide-row"><span class="tajweed-swatch tajweed-${rule.id}"></span><div><strong>${esc(rule.name)}</strong><p>${esc(rule.description)}</p></div></div>`).join('')}</div><p class="hint">Sumber anotasi: <a href="https://github.com/SadaqaWorks/quran-tajweed/tree/40753ddd0cc815851dda73a5ae43c022e17496c3/output/tajweed.hafs.uthmani-pause-sajdah.json" target="_blank" rel="noopener noreferrer">quran-tajweed (riwayat Hafs)</a> · lisensi <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Data diadaptasi: offset sumber dipetakan ke teks ayat aplikasi dan diverifikasi per ayat; QS 12:39 dan 12:41 dilewati karena ejaannya tidak cocok.</p>`
    }),
    'fab-side': () => {
      const side = getSettings().reader.fabSide === 'left' ? 'right' : 'left'
      saveSettings({ reader: { fabSide: side } })
      applyReaderStyle(readerEl)
      updateFloatingControls()
      setFabMenu(true)
    },
    'fab-toggle': () => setFabMenu(!fabOpen),
    'audio-toggle': () => setAudioDockHidden(!audioDockHidden),
    prev: () => (pageMode ? goPage(-1) : current > 1 && goTo(n, current - 1)),
    next: () => (pageMode ? goPage(1) : current < total && goTo(n, current + 1)),
    play: () => {
      const s = getAudioState()
      const playingHere = s.mode === 'ayah' && s.surah?.nomor === n
      if (playingHere && (s.playing || s.ayah === current)) toggleAudio()
      else playAyah(surah, current)
    },
    bookmark: () => toggleBookmark(current),
    more: () => openAyahSheet(surah, current, sheetOpts)
  }

  const onClick = (e) => {
    if (fabOpen && !e.target.closest('.reader-float')) setFabMenu(false)
    const tajweedEl = e.target.closest('[data-rule-label]')
    if (tajweedEl && readerEl.contains(tajweedEl)) {
      e.preventDefault()
      toast(tajweedEl.dataset.ruleLabel)
      return
    }
    const tabEl = e.target.closest('.rd-tabs [data-mode]')
    if (tabEl) {
      setFabMenu(false)
      return setMode(tabEl.dataset.mode)
    }
    const actEl = e.target.closest('[data-act]')
    if (actEl && readerEl.contains(actEl)) {
      const act = actEl.dataset.act
      const ayEl = actEl.closest('.ayah')
      if (ayEl) {
        // Tombol di dalam blok ayat (mode fokus)
        const a = +ayEl.dataset.a
        if (act === 'play') playAyah(surah, a)
        else if (act === 'bookmark') toggleBookmark(a)
        else if (act === 'more') openAyahSheet(surah, a, sheetOpts)
        else if (act === 'copy') copyText(ayahShareText(surah, surah.ayat[a - 1])).then((ok) => toast(ok ? `Ayat ${a} disalin` : 'Gagal menyalin'))
        else if (act === 'share')
          openShare(
            { title: `QS. ${surah.namaLatin} ${n}:${a}`, text: ayahShareText(surah, surah.ayat[a - 1]), url: `${APP.origin}/#/surah/${n}/${a}` },
            { title: 'Bagikan ayat', what: 'ayat' }
          )
        return
      }
      if (actions[act]) {
        if (!['fab-toggle', 'tajweed', 'fab-side'].includes(act)) setFabMenu(false)
        actions[act]()
      }
      return
    }
    if (e.target.closest('a, button, input, .rd-bar, mark.hl')) return
    if (window.getSelection && !window.getSelection().isCollapsed) return // sedang memilih teks
    // Mode mushaf/halaman: menyentuh teks TIDAK membuka apa pun agar bacaan tidak terganggu.
    // Terjemahan & aksi ayat hanya dibuka lewat nomor ayat (seperti quran.com).
    const num = e.target.closest('.mushaf-flow .ayah-num, .mushaf-pages .ayah-num')
    if (num) openAyahSheet(surah, +num.closest('.ayah').dataset.a, sheetOpts)
  }
  const onTabKeydown = (e) => {
    const currentTab = e.target.closest('[role="tab"]')
    if (!currentTab) return
    const tabs = [...tablist.querySelectorAll('[role="tab"]')]
    const index = tabs.indexOf(currentTab)
    const next = e.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : e.key === 'ArrowLeft' ? tabs[(index - 1 + tabs.length) % tabs.length] : e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : null
    if (!next) return
    e.preventDefault()
    next.focus()
    setFabMenu(false)
    setMode(next.dataset.mode)
  }
  const onKey = (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select, [role="tablist"]')) return
    if (document.body.classList.contains('sheet-open')) return
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('ayah')) {
      e.preventDefault()
      openAyahSheet(surah, +e.target.dataset.a, sheetOpts)
    } else if (e.key === 'f') actions.immersive()
    else if (pageMode && e.key === 'ArrowLeft') goPage(1)
    else if (pageMode && e.key === 'ArrowRight') goPage(-1)
  }

  readerEl.addEventListener('click', onClick)
  tablist.addEventListener('keydown', onTabKeydown)
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, { passive: true })
  content.addEventListener('scroll', onScroll, { passive: true, capture: true })
  document.addEventListener('fullscreenchange', onFsChange)
  const onHide = () => persist()
  window.addEventListener('pagehide', onHide)
  const offAudio = [on('audio:ayah', (d) => {
    highlightPlaying()
    if (d && d.surah === n && elOf(d.ayah)) {
      const r = elOf(d.ayah).getBoundingClientRect()
      if (pageMode) {
        if (elOf(d.ayah).closest('.mpage') !== pageEls[pageIdx()] || r.bottom > content.getBoundingClientRect().bottom || r.top < content.getBoundingClientRect().top) scrollToAyah(d.ayah, { smooth: true })
      } else if (r.top < threshold() || r.top > window.innerHeight * 0.75) scrollToAyah(d.ayah, { smooth: true })
    }
  }), on('audio:state', highlightPlaying)]

  renderContent()
  // Tekan lama lalu geser untuk memilih teks → menu kecil (Salin, Tandai, Bookmark, Bagikan, Lainnya).
  const offSelection = initSelectionMenu(content, { surah, onBookmark: (a) => toggleBookmark(a), onMore: (a) => openAyahSheet(surah, a, sheetOpts) })
  updateInfo()
  addHistory(n, current, surah.namaLatin)

  // Pulihkan posisi setelah font & tata letak siap.
  const restore = () => {
    if (destroyed) return
    if (resume && !params.a) scrollToAyah(resume.ayah, { offset: typeof resume.offset === 'number' ? Math.max(0, resume.offset) : null })
    else if (current > 1) scrollToAyah(current, { flash: !!params.a })
    lastMarked = current
    if (!ready) {
      ready = true
      if (!resume) persist()
    }
  }
  requestAnimationFrame(restore)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(() => !userMoved && restore(), 30))
  if (resume && resume.immersive) setImmersive(true)

  return () => {
    persist()
    destroyed = true
    clearTimeout(settingsRestoreTimer)
    readerEl.removeEventListener('click', onClick)
    tablist.removeEventListener('keydown', onTabKeydown)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll)
    content.removeEventListener('scroll', onScroll, true)
    document.removeEventListener('fullscreenchange', onFsChange)
    window.removeEventListener('pagehide', onHide)
    offAudio.forEach((f) => f())
    offSelection()
    document.body.classList.remove('reading-mode', 'reader-paged')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }
}
