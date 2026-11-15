// QURANKU READING MODE — halaman baca surah (Mushaf Continuous & Ayah Focus) + mode imersif layar penuh.
import { getSurah, getSurahList, friendlyError } from '../api/api-adapter.js'
import { icon } from '../components/icons.js'
import { skeleton, errorState } from '../components/navbar.js'
import { flowHtml, focusHtml, openAyahSheet } from '../components/ayah-card.js'
import { applyReaderStyle, openReaderSettings, openJumpSheet } from '../components/reading-toolbar.js'
import { openSheet } from '../components/modal.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { savePosition, getLastRead, addHistory } from '../services/reading-position.js'
import { markRead } from '../services/progress.js'
import { playAyah, playSurah, toggle as toggleAudio, getAudioState } from '../services/audio.js'
import { bookmarkRepo, noteRepo } from '../database/repositories.js'
import { $, $$, esc, on, throttle, toast, isStandalone } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
import { juzOf, pageOf } from '../utils/quran-meta.js'
import { tempatTurunLabel } from '../utils/format.js'
import { isSurahNo } from '../utils/validation.js'
import { navigate, rerender } from '../router.js'
import { BASMALAH } from '../config.js'

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
      <button class="rd-title" data-act="jump" aria-label="Pergi ke ayat, juz, atau halaman">
        <strong>${esc(surah.namaLatin)}</strong>
        <small>Juz <span class="qn" data-juz></span> · Hal <span class="qn" data-page></span> · Ayat <span class="qn" data-cur></span></small>
      </button>
      <button class="icon-btn" data-act="mode" aria-label="Ganti mode baca">${icon('flow')}</button>
      <button class="icon-btn" data-act="settings" aria-label="Pengaturan tampilan">${icon('type')}</button>
      <button class="icon-btn" data-act="immersive" aria-label="Mode membaca layar penuh">${icon('expand')}</button>
    </header>
    <div class="rd-wrap">
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
      <div class="mushaf" data-content></div>
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

  const threshold = () => (barsHidden ? 0 : topBar.offsetHeight) + 28
  const elOf = (a) => ayahEls[a - 1]

  function renderContent() {
    const mode = getSettings().reader.mode
    applyReaderStyle(readerEl)
    content.className = 'mushaf ' + (mode === 'focus' ? 'mushaf-focus' : 'mushaf-flow')
    if (mode === 'focus') {
      content.removeAttribute('dir')
      content.removeAttribute('lang')
    } else {
      content.setAttribute('dir', 'rtl')
      content.setAttribute('lang', 'ar')
    }
    content.innerHTML = mode === 'focus' ? focusHtml(surah, marks) : flowHtml(surah, marks)
    ayahEls = $$('.ayah', content)
    $('[data-act="mode"]', topBar).innerHTML = icon(mode === 'focus' ? 'flow' : 'list')
    highlightPlaying()
  }

  function updateInfo() {
    elCur.textContent = qnum(current)
    elJuz.textContent = qnum(juzOf(n, current))
    elPage.textContent = qnum(pageOf(n, current))
    const bm = $('[data-act="bookmark"]', $('.rd-bottom', readerEl))
    bm.classList.toggle('on', marks.bookmarks.has(current))
    bm.setAttribute('aria-pressed', marks.bookmarks.has(current))
  }

  function findCurrent() {
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
    const top = el.getBoundingClientRect().top + window.scrollY - (offset ?? threshold() - 8)
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' })
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
      offset: el ? validOffset(Math.round(el.getBoundingClientRect().top)) : null,
      mode: getSettings().reader.mode,
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
    if (immersive && !document.body.classList.contains('sheet-open')) {
      if (y > lastY + 12 && y > 120) setBars(true)
      else if (y < lastY - 12) setBars(false)
    }
    lastY = y
    const c = findCurrent()
    const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 40
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
      // Di PWA/TWA (standalone) tampilan sudah tanpa UI browser; Fullscreen API hanya dicoba di tab browser.
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

  function switchMode() {
    const keep = current
    saveSettings({ reader: { mode: getSettings().reader.mode === 'focus' ? 'continuous' : 'focus' } })
    renderContent()
    scrollToAyah(keep)
    toast(getSettings().reader.mode === 'focus' ? 'Ayah Focus Mode' : 'Mushaf Continuous Mode')
    persist()
  }

  const actions = {
    back: () => navigate('/quran'),
    jump: () => openJumpSheet({ surah, currentAyah: current, surahList, onGo: goTo }),
    mode: switchMode,
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
    prev: () => current > 1 && goTo(n, current - 1),
    next: () => current < total && goTo(n, current + 1),
    play: () => {
      const s = getAudioState()
      if (s.mode === 'ayah' && s.surah && s.surah.nomor === n) toggleAudio()
      else playAyah(surah, current)
    },
    bookmark: () => toggleBookmark(current),
    more: () => openAyahSheet(surah, current, sheetOpts)
  }

  const onClick = (e) => {
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
        return
      }
      if (actions[act]) actions[act]()
      return
    }
    if (e.target.closest('a, button, input, .rd-bar')) return
    const ay = e.target.closest('.mushaf-flow .ayah')
    if (ay) {
      // Mode mushaf: sentuh ayat untuk membuka terjemahan & aksi.
      if (window.getSelection && String(window.getSelection())) return
      openAyahSheet(surah, +ay.dataset.a, sheetOpts)
      return
    }
    // Sentuh area kosong: tampilkan/sembunyikan kontrol (hanya pada mode membaca).
    if (immersive) setBars(!barsHidden)
  }
  const onKey = (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select')) return
    if (document.body.classList.contains('sheet-open')) return
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('ayah')) {
      e.preventDefault()
      openAyahSheet(surah, +e.target.dataset.a, sheetOpts)
    } else if (e.key === 'f') actions.immersive()
  }

  readerEl.addEventListener('click', onClick)
  document.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('fullscreenchange', onFsChange)
  const onHide = () => persist()
  window.addEventListener('pagehide', onHide)
  const offAudio = [on('audio:ayah', (d) => {
    highlightPlaying()
    if (d && d.surah === n && elOf(d.ayah)) {
      const r = elOf(d.ayah).getBoundingClientRect()
      if (r.top < threshold() || r.top > window.innerHeight * 0.75) scrollToAyah(d.ayah, { smooth: true })
    }
  }), on('audio:state', highlightPlaying)]

  renderContent()
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
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('fullscreenchange', onFsChange)
    window.removeEventListener('pagehide', onHide)
    offAudio.forEach((f) => f())
    document.body.classList.remove('reading-mode')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }
}
