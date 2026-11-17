import { LOGO_SVG, icon } from '../components/icons.js'
import { ramadanLanterns } from '../components/page-layout.js'
import { getSurah } from '../api/api-adapter.js'
import { getLastRead } from '../services/reading-position.js'
import { todayProgress, goalPages, GOAL_TYPES } from '../services/progress.js'
import { getSettings } from '../services/storage.js'
import { nextPrayer } from '../api/prayer-api.js'
import { ayatHariIni, dayKey } from '../data/ayat-pilihan.js'
import { formatHijri } from '../utils/hijri.js'
import { formatGregorian, greeting, greetingIcon, formatClock } from '../utils/format.js'
import { MUTIARA } from '../data/mutiara.js'
import { qnum, ayahRef } from '../utils/arabic-numbers.js'
import { $, esc, on, toast, copyText } from '../utils/helpers.js'
import { playAyah } from '../services/audio.js'
import { ayahShareText } from '../components/ayah-card.js'
import { rerender } from '../router.js'
import { APP } from '../config.js'
import { openShare } from '../components/share-sheet.js'
import { installApp, shouldOfferInstall, installDismissed, dismissInstall } from '../services/install.js'

const SHORTCUTS = [
  ['/quran', 'book', 'Baca Quran'],
  ['/murottal', 'headphones', 'Murottal'],
  ['/bookmark', 'bookmark', 'Bookmark'],
  ['/salat', 'clock', 'Jadwal Salat'],
  ['/doa', 'hands', 'Doa Harian'],
  ['/asmaul-husna', 'star', 'Asmaul Husna'],
  ['/kiblat', 'compass', 'Arah Kiblat'],
  ['/kalender', 'calendar', 'Kalender']
]

const CIGATAS_MOTTOS = [
  'Hayu ngaji unggal poé.',
  'Saeutik-saeutik, nu penting istiqamah.',
  'Ngaji ayeuna, haté leuwih caang.'
]

export default async function home(root) {
  const s = getSettings()
  const now = new Date()
  const hijri = formatHijri(now, s.hijriAdjust)
  root.innerHTML = `<div class="page home">
    <header class="home-hero ornament">
      ${ramadanLanterns()}
      <div class="brand">${LOGO_SVG}<div><h1>QuranKu</h1><small>Al-Qur'an Digital</small></div>
        <a class="icon-btn on-dark" href="#/cari" aria-label="Cari">${icon('search')}</a>
        <a class="icon-btn on-dark" href="#/pengaturan" aria-label="Pengaturan">${icon('settings')}</a></div>
      <div class="salutation">
        <span class="salutation-label">Assalamu’alaikum</span>
        <p class="salam" lang="ar" dir="rtl" aria-label="Assalamu’alaikum">اَلسَّلَامُ عَلَيْكُمْ</p>
      </div>
      <p class="greet"><i class="fi fi-${greetingIcon(now)} greet-ic" aria-hidden="true"></i><span><strong>${esc(greeting(now))}</strong><small>Semoga harimu penuh berkah.</small></span></p>
      <div class="dates hero-date-line" role="group" aria-label="Tanggal Masehi dan Hijriah">
        <span class="hero-date-item">${icon('calendar')}<span class="hero-date-text">${esc(formatGregorian(now))}</span></span>
        ${hijri ? `<span class="hero-date-separator" aria-hidden="true">·</span><span class="hero-date-item">${icon('moon')}<span class="hero-date-text">${esc(hijri)}</span></span>` : ''}
      </div>
      <a class="mutiara" data-mutiara href="#"></a>
    </header>

    <section class="card continue" data-continue>
      <div class="continue-empty"><p class="eyebrow">Mulai membaca</p><h2>Belum ada bacaan terakhir</h2>
        <a class="btn btn-primary" href="#/surah/1">${icon('book')}Mulai dari Al-Fatihah</a></div>
    </section>

    <section class="card goal-card" data-goal></section>

    <section class="home-shortcuts" aria-label="Pintasan"><p class="section-title">Akses cepat</p><div class="shortcut-grid">
      ${SHORTCUTS.map(([p, i, l]) => `<a class="shortcut" href="#${p}"><span class="shortcut-ic">${icon(i)}</span><span>${l}</span></a>`).join('')}
    </div></section>

    <section class="card prayer-mini" data-prayer hidden></section>

    <section class="card ayah-day" data-ayah>
      <p class="eyebrow">Ayat pilihan hari ini</p>
      <div class="skeleton sk-line"></div><div class="skeleton sk-line"></div>
    </section>

    <footer class="cigatas-signature" aria-label="Ajakan mengaji dari Cigatas">
      <a class="cigatas-signature-link" href="#/tentang">
        <span class="sr-only">Buka halaman Tentang Cigatas: </span><span class="cigatas-signature-hashtag">#TongEureunNgaji</span>
        <span class="cigatas-signature-motto" data-cigatas-motto aria-hidden="true">Hayu ngaji unggal poé.</span>
      </a>
    </footer>
  </div>`

  // Penyemangat acak: potongan terjemahan ayat, berganti tiap beranda dibuka.
  const m = MUTIARA[Math.floor(Math.random() * MUTIARA.length)]
  const mu = root.querySelector('[data-mutiara]')
  mu.href = `#/surah/${m.s}/${m.a}`
  mu.innerHTML = `<i class="fi fi-quote" aria-hidden="true"></i><span>${esc(m.t)} <small>${esc(m.r)}</small></span>`

  const cigatasMotto = $('[data-cigatas-motto]', root)
  let cigatasMottoIndex = 0
  let cigatasMottoTimer = null
  let cigatasMottoSwap = null
  if (cigatasMotto && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    cigatasMottoTimer = setInterval(() => {
      if (!cigatasMotto.isConnected) return
      cigatasMotto.classList.add('is-changing')
      clearTimeout(cigatasMottoSwap)
      cigatasMottoSwap = setTimeout(() => {
        if (!cigatasMotto.isConnected) return
        cigatasMottoIndex = (cigatasMottoIndex + 1) % CIGATAS_MOTTOS.length
        cigatasMotto.textContent = CIGATAS_MOTTOS[cigatasMottoIndex]
        cigatasMotto.classList.remove('is-changing')
      }, 220)
    }, 4200)
  }

  // Ajakan memasang aplikasi (semua peramban; disembunyikan bila sudah terpasang atau ditutup pengguna).
  if (shouldOfferInstall() && !installDismissed()) {
    $('.home-hero', root).insertAdjacentHTML(
      'afterend',
      `<div class="install-banner" data-install-banner>
        <span class="shortcut-ic">${icon('download')}</span>
        <span class="install-banner-text"><strong>Pasang QuranKu</strong><small>Layar penuh & bisa offline</small></span>
        <button class="btn btn-primary btn-sm" data-install-now>Pasang</button>
        <button class="icon-btn" data-install-close aria-label="Tutup ajakan pasang">${icon('close')}</button>
      </div>`
    )
    const bn = $('[data-install-banner]', root)
    $('[data-install-now]', bn).onclick = async () => {
      if ((await installApp()) === 'accepted') bn.remove()
    }
    $('[data-install-close]', bn).onclick = () => {
      dismissInstall()
      bn.remove()
    }
  }

  // Lanjutkan membaca + info surah terakhir
  const renderContinue = async () => {
    const last = await getLastRead()
    if (!last) return
    const pct = last.total ? Math.round((last.ayah / last.total) * 100) : 0
    $('[data-continue]', root).innerHTML = `
      <p class="eyebrow">Terakhir dibaca</p>
      <div class="continue-row">
        <div><h2>${esc(last.surahName || 'Surah ' + last.surah)}</h2>
          <p class="muted">Ayat <span class="qn">${qnum(last.ayah)}</span> · Juz <span class="qn">${qnum(last.juz)}</span> · Halaman <span class="qn">${qnum(last.page)}</span></p></div>
        ${last.surahNameAr ? `<span class="continue-ar" lang="ar" dir="rtl">${esc(last.surahNameAr)}</span>` : ''}
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <a class="btn btn-primary btn-block" href="#/surah/${last.surah}?resume=1">${icon('book')}Lanjutkan membaca</a>`
  }

  const renderGoal = async () => {
    const p = await todayProgress()
    const target = goalPages(getSettings().goal)
    const ratio = Math.min(1, p.pages / target)
    const C = 2 * Math.PI * 34
    $('[data-goal]', root).innerHTML = `
      <div class="ring" role="img" aria-label="Progres ${Math.round(ratio * 100)} persen">
        <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="ring-bg"/><circle cx="40" cy="40" r="34" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - ratio)}"/></svg>
        <b>${Math.round(ratio * 100)}%</b></div>
      <div class="goal-info"><p class="eyebrow">Progres tilawah hari ini</p>
        <h2>${p.pages} / ${target} halaman</h2>
        <p class="muted">${p.ayahs} ayat dibaca · Target: ${esc((GOAL_TYPES[getSettings().goal.type] || GOAL_TYPES.p2).label)}</p>
        <a class="link" href="#/target">Atur target & lihat statistik ${icon('forward')}</a></div>`
  }

  const renderPrayer = () => {
    const loc = getSettings().location
    const el = $('[data-prayer]', root)
    if (!loc) return
    try {
      const np = nextPrayer(loc, getSettings().prayerMethod)
      el.hidden = false
      el.innerHTML = `<a href="#/salat" class="prayer-mini-row">${icon('mosque')}<span><small>Salat berikutnya · ${esc(loc.name || '')}</small><strong>${np.name} ${formatClock(np.time)}</strong></span>${icon('forward')}</a>`
    } catch {}
  }

  let ayahOffset = 0
  const renderAyah = async () => {
    const [sNo, aNo] = ayatHariIni(new Date(), ayahOffset)
    const el = $('[data-ayah]', root)
    const head = `<div class="ayah-day-head"><p class="eyebrow">${ayahOffset ? 'Ayat pilihan' : 'Ayat pilihan hari ini'}</p>
      <button class="icon-btn sm" data-ayah-next aria-label="Tampilkan ayat pilihan lain">${icon('refresh')}</button></div>`
    try {
      const surah = await getSurah(sNo)
      const a = surah.ayat[aNo - 1]
      if (!el.isConnected) return
      el.innerHTML = `${head}
        <p class="ayah-day-ar" lang="ar" dir="rtl">${esc(a.teksArab)}</p>
        ${a.teksIndonesia ? `<p class="ayah-day-tr">${esc(a.teksIndonesia)}</p>` : ''}
        <div class="ayah-day-foot"><a class="link" href="#/surah/${sNo}/${aNo}">QS. ${esc(surah.namaLatin)} ${ayahRef(sNo, aNo)} ${icon('forward')}</a>
          <span class="ayah-day-acts"><button class="icon-btn sm" data-ayah-play aria-label="Putar ayat">${icon('play')}</button>
          <button class="icon-btn sm" data-ayah-share aria-label="Bagikan ayat">${icon('share')}</button>
          <button class="btn sm" data-ayah-copy aria-label="Salin ayat dan tautan">${icon('copy')}Salin</button></span></div>`
      $('[data-ayah-play]', el).onclick = () => playAyah(surah, aNo)
      $('[data-ayah-share]', el).onclick = () => {
        openShare(
          { title: `QS. ${surah.namaLatin} ${ayahRef(sNo, aNo)}`, text: ayahShareText(surah, a), url: `${APP.origin}/#/surah/${sNo}/${aNo}` },
          { title: 'Bagikan ayat', what: 'ayat' }
        )
      }
      $('[data-ayah-copy]', el).onclick = async () => {
        const payload = `${ayahShareText(surah, a)}\n${APP.origin}/#/surah/${sNo}/${aNo}`
        toast((await copyText(payload)) ? 'Ayat & tautan disalin' : 'Gagal menyalin')
      }
    } catch {
      if (el.isConnected) el.innerHTML = `${head}<p class="muted">Ayat belum dapat dimuat (QS. ${ayahRef(sNo, aNo)}). Sambungkan internet sekali agar tersimpan.</p><a class="link" href="#/surah/${sNo}/${aNo}">Buka ayat ${icon('forward')}</a>`
    }
    const nextBtn = $('[data-ayah-next]', el)
    if (nextBtn) nextBtn.onclick = () => {
      ayahOffset++
      renderAyah()
    }
  }

  // Aplikasi yang tetap terbuka melewati tengah malam: tanggal, sapaan, dan ayat hari ini diperbarui saat kembali ke layar.
  const shownDay = dayKey(now)
  const onVisible = () => {
    if (document.visibilityState === 'visible' && dayKey() !== shownDay) rerender()
  }
  document.addEventListener('visibilitychange', onVisible)

  renderContinue()
  renderGoal()
  renderPrayer()
  renderAyah()
  const offProgress = on('progress:changed', renderGoal)
  const offLastRead = on('lastread:changed', renderContinue)
  return () => {
    offProgress()
    offLastRead()
    clearInterval(cigatasMottoTimer)
    clearTimeout(cigatasMottoSwap)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
