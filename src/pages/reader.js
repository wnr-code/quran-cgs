// QURANKU READING MODE — halaman baca surah (Mushaf Continuous & Ayah Focus) + mode imersif layar penuh.
import { getSurah, getSurahList, friendlyError } from '../api/api-adapter.js'
import { icon } from '../components/icons.js'
import { skeleton, errorState } from '../components/page-layout.js'
import { flowHtml, focusHtml, pagesHtml, openAyahSheet, ayahShareText } from '../components/ayah-card.js'
import { applyReaderStyle, openReaderSettings, openJumpSheet } from '../components/reading-toolbar.js'
import { openSheet } from '../components/modal.js'
import { initSelectionMenu } from '../components/selection-menu.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { savePosition, getLastRead, addHistory } from '../services/reading-position.js'
import { markRead } from '../services/progress.js'
import { playAyah, playSurah, toggle as toggleAudio, getAudioState } from '../services/audio.js'
import { bookmarkRepo, noteRepo } from '../database/repositories.js'
import { $, $$, esc, on, throttle, toast, isStandalone, copyText, shareText, reportShareResult } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
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

  const last = await getLastRead()
  // Pulihkan posisi bila diminta (Lanjutkan Membaca) atau saat aplikasi dibuka/dimuat ulang langsung di surah yang sama.
  const resume = (query.resume === '1' || initial) && !params.a && last && last.surah === n ? last : null
  let current = Math.min(total, Math.max(1, parseInt(params.a, 10) || (resume ? resume.ayah : 1)))
  let immersive = false
  let barsHidden = false
  let ayahEls = []
  let lastMarked = current
  let destroyed = false

  const showBasmalah = n !== 1 && n !== 9
  readerEl.innerHTML = `
    <header class="rd-top rd-bar">
      <button class="icon-btn" data-act="back" aria-label="Kembali ke daftar surah">${icon('back')}</button>
      <button class="rd-title" data-act="jump" aria-label="${esc(surah.namaLatin)} — Pergi ke ayat, juz, atau halaman">
        <strong>${esc(surah.namaLatin)}</strong>
        <small>Juz <span class="qn" data-juz></span> · Hal <span class="qn" data-page></span> · Ayat <span class="qn" data-cur></span></small>
      </button>
      <button class="icon-btn" data-act="play-surah" aria-label="Putar murottal surah ini">${icon('headphones')}</button>
      <button class="icon-btn" data-act="settings" aria-label="Pengaturan tampilan">${icon('type')}</button>
      <button class="icon-btn" data-act="immersive" aria-label="Mode membaca layar penuh">${icon('expand')}</button>
      <span class="rd-progress" aria-hidden="true"><i data-progress></i></span>
    </header>
    <div class="rd-wrap">
      <div class="rd-tabs" role="tablist" aria-label="Mode baca">
        <button type="button" id="reader-mode-focus" role="tab" aria-controls="reader-mode-panel" data-mode="focus">${icon('list')}<span>Terjemahan</span></button>
        <button type="button" id="reader-mode-continuous" role="tab" aria-controls="reader-mode-panel" data-mode="continuous">${icon('flow')}<span>Mushaf</span></button>
        <button type="button" id="reader-mode-page" role="tab" aria-controls="reader-mode-panel" data-mode="page">${icon('book')}<span>Halaman</span></button>
      </div>
      <section class="surah-hero">
        <div class="surah-frame">
          <p class="surah-frame-ar" lang="ar" dir="rtl">${esc(surah.nama)}</p>
          <h1>${esc(surah.namaLatin)}</h1>
          <p class="surah-frame-sub">${esc(surah.arti)} · ${esc(tempatTurunLabel(surah.tempatTurun))} · <span class="qn">${qnum(total)}</span> ayat · Surah ke-<span class="qn">${qnum(n)}</span></p>
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary" data-act="immersive">${icon('expand')}Masuk Mode Membaca</button>
          <button class="btn" data-act="play-surah">${icon('headphones')}Putar surah</button>
          <a class="btn" href="#/tafsir/${n}">${icon('book')}Tafsir</a>
          <button class="btn" data-act="info">${icon('info')}Info</button>
        </div>
        ${surah.source !== 'equran' ? `<p class="source-note">${icon('info')} Sumber cadangan: ${esc(surah.edition ? surah.edition.label : surah.source)} — edisi teks & terjemahan dapat berbeda dari sumber utama.</p>` : ''}
      </section>
      ${showBasmalah ? `<p class="basmalah" lang="ar" dir="rtl">${BASMALAH}</p>` : ''}
      <div class="mushaf" id="reader-mode-panel" data-content role="tabpanel" tabindex="0"></div>
      <nav class="surah-nav">
        ${n > 1 ? `<a class="btn" href="#/surah/${n - 1}">${icon('back')}Surah sebelumnya</a>` : '<span></span>'}
        ${n < 114 ? `<a class="btn" href="#/surah/${n + 1}">Surah berikutnya${icon('forward')}</a>` : '<span></span>'}
      </nav>
      <p class="edition-note">Teks: ${esc(surah.edition ? surah.edition.text : '-')}<br/>Terjemahan: ${esc(surah.edition ? surah.edition.translation : '-')}<br/>Juz & halaman: Mushaf Madinah (604 hlm).</p>
    </div>
    <footer class="rd-bottom rd-bar">
      <button class="icon-btn" data-act="prev" aria-label="Ayat sebelumnya">${icon('up')}</button>
      <button class="icon-btn" data-act="next" aria-label="Ayat berikutnya">${icon('down')}</button>
      <button class="icon-btn rd-play" data-act="play" aria-label="Putar audio ayat">${icon('play')}</button>
      <button class="icon-btn" data-act="bookmark" aria-label="Bookmark ayat ini">${icon('bookmark')}</button>
      <button class="icon-btn" data-act="more" aria-label="Terjemahan, tafsir, salin, bagikan, catatan">${icon('more')}</button>
    </footer>`

  const content = $('[data-content]', readerEl)
  const elCur = $('[data-cur]', readerEl)
  const elJuz = $('[data-juz]', readerEl)
  const elPage = $('[data-page]', readerEl)
  const topBar = $('.rd-top', readerEl)
  const rdTitle = $('.rd-title', readerEl)
  const tablist = $('.rd-tabs', readerEl)
  const elProgress = $('[data-progress]', readerEl)

  const threshold = () => (barsHidden ? 0 : topBar.offsetHeight) + 28
  const scrollBehavior = (smooth) => (smooth && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant')
  const elOf = (a) => ayahEls[a - 1]
  const modeNow = () => {
    const m = getSettings().reader.mode
    return m === 'focus' || m === 'page' ? m : 'continuous'
  }
  let pageMode = false
  let pageEls = []
  const pageIdx = () => Math.min(pageEls.length - 1, Math.max(0, Math.round(Math.abs(content.scrollLeft) / (content.clientWidth || 1))))
  const scrollToPage = (i, smooth = false) => {
    const el = pageEls[i]
    if (!el) return
    // Arah RTL: geseran bernilai negatif di peramban modern; posisi dihitung dari letak lembar agar aman di semua mesin.
    const left = el.getBoundingClientRect().left - content.getBoundingClientRect().left + content.scrollLeft
    content.scrollTo({ left, behavior: scrollBehavior(smooth) })
  }

  function renderContent() {
    const mode = modeNow()
    pageMode = mode === 'page'
    applyReaderStyle(readerEl)
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
    content.innerHTML = mode === 'focus' ? focusHtml(surah, marks) : pageMode ? pagesHtml(surah, marks, { basmalah: showBasmalah ? BASMALAH : '' }) : flowHtml(surah, marks)
    ayahEls = $$('.ayah', content)
    pageEls = pageMode ? $$('.mpage', content) : []
    $$('.rd-tabs [data-mode]', readerEl).forEach((b) => {
      const selected = b.dataset.mode === mode
      b.classList.toggle('on', selected)
      b.setAttribute('aria-selected', String(selected))
      b.tabIndex = selected ? 0 : -1
    })
    content.setAttribute('aria-labelledby', `reader-mode-${mode}`)
    // Mode Halaman: tombol bawah berpindah halaman (halaman berikutnya ada di sebelah kiri, seperti mushaf).
    const bottom = $('.rd-bottom', readerEl)
    const prevBtn = $('[data-act="prev"]', bottom)
    const nextBtn = $('[data-act="next"]', bottom)
    prevBtn.innerHTML = icon(pageMode ? 'forward' : 'up')
    nextBtn.innerHTML = icon(pageMode ? 'back' : 'down')
    prevBtn.setAttribute('aria-label', pageMode ? 'Halaman sebelumnya' : 'Ayat sebelumnya')
    nextBtn.setAttribute('aria-label', pageMode ? 'Halaman berikutnya' : 'Ayat berikutnya')
    if (pageMode) {
      bottom.insertBefore(nextBtn, prevBtn)
      window.scrollTo(0, 0)
    } else bottom.insertBefore(prevBtn, nextBtn)
    highlightPlaying()
  }

  function updateInfo() {
    elCur.textContent = qnum(current)
    elJuz.textContent = qnum(juzOf(n, current))
    elPage.textContent = qnum(pageOf(n, current))
    rdTitle.setAttribute('aria-label', `${surah.namaLatin} Juz ${elJuz.textContent} · Hal ${elPage.textContent} · Ayat ${elCur.textContent}. Pilih untuk pergi ke ayat, juz, atau halaman`)
    elProgress.style.width = `${Math.max(2, Math.round((current / total) * 100))}%`
    const bm = $('[data-act="bookmark"]', $('.rd-bottom', readerEl))
    bm.classList.toggle('on', marks.bookmarks.has(current))
    bm.setAttribute('aria-pressed', marks.bookmarks.has(current))
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

  let lastY = window.scrollY
  const onScroll = throttle(() => {
    if (destroyed || !ready) return
    const y = window.scrollY
    if (!pageMode && immersive && !document.body.classList.contains('sheet-open')) {
      if (y > lastY + 12 && y > 120) setBars(true)
      else if (y < lastY - 12) setBars(false)
    }
    lastY = y
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

  function setBars(hidden) {
    if (barsHidden === hidden) return
    barsHidden = hidden
    readerEl.classList.toggle('bars-hidden', hidden)
  }

  async function setImmersive(v) {
    if (immersive === v) return
    immersive = v
    document.body.classList.toggle('reading-mode', v)
    $$('[data-act="immersive"]', readerEl).forEach((b) => b.classList.contains('icon-btn') && (b.innerHTML = icon(v ? 'shrink' : 'expand')))
    if (v) {
      let fs = false
      // PWA terpasang dan Capacitor sudah tampil tanpa UI browser; Fullscreen API hanya dicoba di tab browser.
      if (!isStandalone() && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
          fs = true
        } catch {}
      }
      toast(fs ? 'Mode membaca layar penuh aktif. Sentuh tepi layar untuk menampilkan kontrol.' : isStandalone() ? 'Mode membaca aktif. Sentuh tepi layar untuk menampilkan kontrol.' : 'Mode membaca aktif (layar penuh sistem tidak tersedia di browser ini).', 3200)
    } else {
      setBars(false)
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
    const playingHere = s.mode === 'ayah' && s.surah && s.surah.nomor === n
    if (playingHere && elOf(s.ayah)) elOf(s.ayah).classList.add('playing')
    $('.rd-play', readerEl).innerHTML = icon(playingHere && s.playing ? 'pause' : 'play')
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
      scrollToAyah(a, { flash: true })
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

  const MODE_LABEL = { focus: 'Terjemahan per ayat', continuous: 'Mushaf (gulir ke bawah)', page: 'Halaman — geser ke kiri/kanan untuk pindah halaman' }
  function setMode(mode) {
    if (mode === modeNow()) return
    const keep = current
    saveSettings({ reader: { mode } })
    renderContent()
    scrollToAyah(keep)
    toast(MODE_LABEL[mode])
    persist()
  }
  const goPage = (d) => scrollToPage(pageIdx() + d, true)

  const actions = {
    back: () => navigate('/quran'),
    jump: () => openJumpSheet({ surah, currentAyah: current, surahList, onGo: goTo }),
    mode: () => setMode(modeNow() === 'focus' ? 'continuous' : 'focus'),
    settings: () =>
      openReaderSettings((patch) => {
        const keep = current
        if (patch && 'mode' in patch) renderContent()
        else applyReaderStyle(readerEl)
        scrollToAyah(keep)
      }),
    immersive: () => setImmersive(!immersive),
    'play-surah': () => playSurah(surah),
    info: () =>
      openSheet({
        title: `Tentang Surah ${surah.namaLatin}`,
        content: `<p class="prose">${esc(surah.deskripsi || 'Deskripsi tidak tersedia dari sumber data.')}</p><p class="hint">Sumber: ${esc(surah.edition ? surah.edition.label : surah.source)}</p>`
      }),
    prev: () => (pageMode ? goPage(-1) : current > 1 && goTo(n, current - 1)),
    next: () => (pageMode ? goPage(1) : current < total && goTo(n, current + 1)),
    play: () => {
      const s = getAudioState()
      if (s.mode === 'ayah' && s.surah && s.surah.nomor === n) toggleAudio()
      else playAyah(surah, current)
    },
    bookmark: () => toggleBookmark(current),
    more: () => openAyahSheet(surah, current, sheetOpts)
  }

  const onClick = (e) => {
    const tabEl = e.target.closest('.rd-tabs [data-mode]')
    if (tabEl) return setMode(tabEl.dataset.mode)
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
          shareText(`QS. ${surah.namaLatin} ${n}:${a}`, ayahShareText(surah, surah.ayat[a - 1]), `${APP.origin}/#/surah/${n}/${a}`).then(reportShareResult)
        return
      }
      if (actions[act]) actions[act]()
      return
    }
    if (e.target.closest('a, button, input, .rd-bar, mark.hl')) return
    if (window.getSelection && !window.getSelection().isCollapsed) return // sedang memilih teks
    // Mode mushaf/halaman: menyentuh teks TIDAK membuka apa pun agar bacaan tidak terganggu.
    // Terjemahan & aksi ayat hanya dibuka lewat nomor ayat (seperti quran.com).
    const num = e.target.closest('.mushaf-flow .ayah-num, .mushaf-pages .ayah-num')
    if (num) {
      openAyahSheet(surah, +num.closest('.ayah').dataset.a, sheetOpts)
      return
    }
    // Sentuh area kosong: tampilkan/sembunyikan kontrol (hanya pada mode membaca).
    if (immersive) setBars(!barsHidden)
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
  content.addEventListener('scroll', onScroll, { passive: true })
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
    readerEl.removeEventListener('click', onClick)
    tablist.removeEventListener('keydown', onTabKeydown)
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('fullscreenchange', onFsChange)
    window.removeEventListener('pagehide', onHide)
    offAudio.forEach((f) => f())
    offSelection()
    document.body.classList.remove('reading-mode', 'reader-paged')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }
}
