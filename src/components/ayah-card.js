// Markup ayat (mode mushaf & mode fokus) serta lembar aksi ayat.
import { icon } from './icons.js'
import { openSheet } from './modal.js'
import { esc, toast, copyText } from '../utils/helpers.js'
import { ayahMarker, ayahRef, qnum } from '../utils/arabic-numbers.js'
import { isSajda, isPageStart, pageOf, juzOf } from '../utils/quran-meta.js'
import { bookmarkRepo, noteRepo } from '../database/repositories.js'
import { playAyah } from '../services/audio.js'
import { APP } from '../config.js'
import { highlightHtml } from '../services/highlight.js'
import { mapTajweedRanges } from '../utils/tajweed.js'
import { openShare } from './share-sheet.js'
import { getTafsir } from '../api/api-adapter.js'

const numHtml = (n) => `<span class="ayah-num" aria-label="Ayat ${n}">${ayahMarker(n)}</span>`
const sajdaHtml = (s, a) => (isSajda(s, a) ? '<span class="sajda" title="Ayat sajdah">۩</span>' : '')
const ayahArabicHtml = (s, a, text, enabled, index) =>
  highlightHtml(s, a, text, { tajweedRanges: enabled && index ? mapTajweedRanges(text, index.get(`${s}:${a}`)) : [] })

const pageSep = (surah, a) =>
  isPageStart(surah, a) && a > 1 ? `<span class="page-sep" dir="rtl" data-page="${pageOf(surah, a)}"><span>صفحة ${qnum(pageOf(surah, a))}</span></span>` : ''

/** Mode Mushaf Continuous: ayat mengalir inline, nomor ayat sebagai pemisah. */
export function flowHtml(surah, marks, { tajweed = false, tajweedIndex = null } = {}) {
  const n = surah.nomor
  return surah.ayat
    .map((a) => {
      const k = a.nomorAyat
      const cls = (marks.bookmarks.has(k) ? ' is-bookmarked' : '') + (marks.notes.has(k) ? ' has-note' : '')
      return `${pageSep(n, k)}<span class="ayah${cls}" data-a="${k}" tabindex="0" role="button"><span class="ayah-text">${ayahArabicHtml(n, k, a.teksArab, tajweed, tajweedIndex)}</span>${sajdaHtml(n, k)}&nbsp;${numHtml(k)}</span> `
    })
    .join('')
}

/** Ayah Focus Mode: tiap ayat memiliki area sendiri (Arab, Latin, terjemahan, kontrol). */
export function focusHtml(surah, marks, { tajweed = false, tajweedIndex = null } = {}) {
  const n = surah.nomor
  return surah.ayat
    .map((a) => {
      const k = a.nomorAyat
      const bm = marks.bookmarks.has(k)
      return `${pageSep(n, k)}<article class="ayah ayah-block${bm ? ' is-bookmarked' : ''}${marks.notes.has(k) ? ' has-note' : ''}" data-a="${k}">
        <header class="ayah-tools" dir="ltr">
          <span class="ayah-ref">${numHtml(k)}${isSajda(n, k) ? '<em class="chip chip-gold">Sajdah</em>' : ''}</span>
          <span class="ayah-btns">
            <button class="icon-btn sm" data-act="play" aria-label="Putar ayat ${k}">${icon('play')}</button>
            <button class="icon-btn sm bm-btn" data-act="bookmark" aria-label="Bookmark ayat ${k}" aria-pressed="${bm}">${icon('bookmark')}</button>
            <a class="icon-btn sm" href="#/tafsir/${n}/${k}" aria-label="Tafsir ayat ${k}">${icon('book')}</a>
            <button class="icon-btn sm" data-act="copy" aria-label="Salin ayat ${k}">${icon('copy')}</button>
            <button class="icon-btn sm" data-act="share" aria-label="Bagikan ayat ${k}">${icon('share')}</button>
            <button class="icon-btn sm" data-act="more" aria-label="Catatan & aksi lain ayat ${k}">${icon('more')}</button>
          </span>
        </header>
        <p class="ayah-ar" dir="rtl" lang="ar"><span class="ayah-text">${ayahArabicHtml(n, k, a.teksArab, tajweed, tajweedIndex)}</span>${sajdaHtml(n, k)}</p>
        ${a.teksLatin ? `<p class="ayah-latin" dir="ltr">${esc(a.teksLatin)}</p>` : ''}
        ${a.teksIndonesia ? `<p class="ayah-id" dir="ltr">${esc(a.teksIndonesia)}</p>` : ''}
      </article>`
    })
    .join('')
}

/**
 * Mode Halaman: ayat dikelompokkan per halaman Mushaf Madinah; tiap halaman satu "lembar" yang digeser ke samping
 * (kanan → kiri seperti mushaf cetak). Lembar terakhir berisi navigasi surah.
 */
export function pagesHtml(surah, marks, { basmalah = '', tajweed = false, tajweedIndex = null } = {}) {
  const n = surah.nomor
  const groups = []
  for (const a of surah.ayat) {
    const pg = pageOf(n, a.nomorAyat)
    const g = groups[groups.length - 1]
    if (g && g.page === pg) g.ayat.push(a)
    else groups.push({ page: pg, ayat: [a] })
  }
  const pages = groups
    .map((g, i) => {
      const first = g.ayat[0].nomorAyat
      const last = g.ayat[g.ayat.length - 1].nomorAyat
      const head =
        i === 0
          ? `<div class="mpage-title"><span lang="ar">${esc(surah.nama)}</span><small dir="ltr">${esc(surah.namaLatin)} · ${esc(surah.arti)}</small></div>${basmalah ? `<p class="basmalah basmalah-cartouche">${basmalah}</p>` : ''}`
          : ''
      const body = g.ayat
        .map((a) => {
          const k = a.nomorAyat
          const cls = (marks.bookmarks.has(k) ? ' is-bookmarked' : '') + (marks.notes.has(k) ? ' has-note' : '')
          return `<span class="ayah${cls}" data-a="${k}" tabindex="0" role="button"><span class="ayah-text">${ayahArabicHtml(n, k, a.teksArab, tajweed, tajweedIndex)}</span>${sajdaHtml(n, k)}&nbsp;${numHtml(k)}</span> `
        })
        .join('')
      return `<section class="mpage" data-p="${g.page}" data-first="${first}" data-last="${last}" aria-label="Halaman ${g.page}">
        <header class="mpage-head" dir="ltr"><span>${esc(surah.namaLatin)}</span><span class="mpage-juz">Juz <span class="reader-juz-chip qn">${qnum(juzOf(n, first))}</span></span></header>
        <div class="mpage-body" dir="rtl" lang="ar">${head}<div class="mpage-text">${body}</div></div>
        <footer class="mpage-foot" dir="ltr"><span class="mpage-hint">${i < groups.length - 1 ? icon('back') + 'geser' : ''}</span><span class="qn mpage-no"><span>${qnum(g.page)}</span></span><span class="mpage-hint">${i + 1} / ${groups.length}</span></footer>
      </section>`
    })
    .join('')
  const end = `<section class="mpage mpage-end" data-end dir="ltr">
      <div class="mpage-end-in">${icon('check', 'state-icon')}<h3>Akhir Surah ${esc(surah.namaLatin)}</h3>
      <p>صَدَقَ اللّٰهُ الْعَظِيْمُ</p>
      <div class="btn-row">${n < 114 ? `<a class="btn btn-primary" href="#/surah/${n + 1}">Surah berikutnya${icon('forward')}</a>` : ''}${n > 1 ? `<a class="btn" href="#/surah/${n - 1}">${icon('back')}Surah sebelumnya</a>` : ''}<a class="btn" href="#/quran">${icon('list')}Daftar surah</a></div></div>
    </section>`
  return pages + end
}

export function ayahShareText(surah, a) {
  return `${a.teksArab}\n\n${a.teksIndonesia ? `“${a.teksIndonesia}”\n` : ''}(QS. ${surah.namaLatin} ${ayahRef(surah.nomor, a.nomorAyat)})`
}

/** Lembar aksi satu ayat: baca, dengarkan, buka tafsir sumbernya, lalu simpan catatan bila perlu. */
export async function openAyahSheet(surah, ayahNo, { onChange, onMarkLast } = {}) {
  const a = surah.ayat[ayahNo - 1]
  if (!a) return
  const n = surah.nomor
  const [bookmarked, note, categories] = await Promise.all([bookmarkRepo.has('ayat', n, ayahNo), noteRepo.get(n, ayahNo), bookmarkRepo.categories()])
  const ref = ayahRef(n, ayahNo)
  const tafsirId = `ayah-tafsir-${n}-${ayahNo}`
  const hasNote = !!(note && note.text)
  openSheet({
    title: `QS. ${surah.namaLatin} ${ref}`,
    content: `
      <p class="sheet-meta">Juz <span class="qn">${qnum(juzOf(n, ayahNo))}</span> · Halaman <span class="qn">${qnum(pageOf(n, ayahNo))}</span>${isSajda(n, ayahNo) ? ' · <em class="chip chip-gold">Ayat sajdah</em>' : ''}</p>
      <p class="sheet-ar" dir="rtl" lang="ar">${esc(a.teksArab)}</p>
      ${a.teksLatin ? `<p class="ayah-latin">${esc(a.teksLatin)}</p>` : ''}
      ${a.teksIndonesia ? `<p class="sheet-tr">${esc(a.teksIndonesia)}</p>` : '<p class="muted">Terjemahan tidak tersedia.</p>'}
      <p class="ayah-sheet-action-label">Aksi ayat</p>
      <div class="action-grid ayah-sheet-actions">
        <button data-act="play">${icon('play')}<span>Putar</span></button>
        <button data-act="bookmark" class="${bookmarked ? 'on' : ''}" aria-pressed="${bookmarked}">${icon('bookmark')}<span>${bookmarked ? 'Hapus bookmark' : 'Bookmark'}</span></button>
        <button data-act="tafsir" aria-expanded="false" aria-controls="${tafsirId}">${icon('book')}<span>Baca tafsir</span></button>
        <button data-act="copy">${icon('copy')}<span>Salin</span></button>
        <button data-act="share">${icon('share')}<span>Bagikan</span></button>
        <button data-act="last">${icon('check')}<span>Tandai terakhir</span></button>
      </div>
      <section class="ayah-sheet-tafsir" id="${tafsirId}" aria-label="Tafsir ayat ${ayahNo}" aria-live="polite" hidden>
        <p class="muted" data-tafsir-status></p>
        <div data-tafsir-result></div>
      </section>
      <label class="field ayah-sheet-category"><span>Kategori bookmark</span>
        <input list="bm-cats-${n}-${ayahNo}" name="category" value="Umum" maxlength="40" autocomplete="off" />
        <datalist id="bm-cats-${n}-${ayahNo}">${categories.map((c) => `<option value="${esc(c)}"></option>`).join('')}</datalist>
      </label>
      <details class="ayah-sheet-notes" ${hasNote ? 'open' : ''}>
        <summary><span>${icon('note')}Catatan pribadi</span><small>${hasNote ? 'Ada catatan tersimpan' : 'Tersimpan hanya di perangkat ini'}</small></summary>
        <div class="ayah-sheet-note-body">
          <label class="field"><span>Catatan tadabbur</span>
            <textarea name="note" rows="3" maxlength="5000" placeholder="Tulis catatan pribadi…">${esc(note ? note.text : '')}</textarea>
          </label>
          <div class="btn-row"><button class="btn btn-primary" data-act="save-note">${icon('note')}Simpan catatan</button></div>
        </div>
      </details>`,
    onOpen(body, close) {
      const tafsirButton = body.querySelector('[data-act="tafsir"]')
      const tafsirPanel = body.querySelector(`#${tafsirId}`)
      const tafsirStatus = body.querySelector('[data-tafsir-status]')
      const tafsirResult = body.querySelector('[data-tafsir-result]')
      let tafsirLoaded = false
      let tafsirLoading = false

      const loadTafsir = async () => {
        if (tafsirLoaded || tafsirLoading) return
        tafsirLoading = true
        tafsirStatus.hidden = false
        tafsirStatus.textContent = 'Memuat tafsir ayat…'
        tafsirResult.innerHTML = ''
        try {
          const data = await getTafsir(n)
          const entry = data.tafsir.find((item) => item.ayat === ayahNo)
          if (!entry) {
            tafsirStatus.textContent = 'Tafsir untuk ayat ini belum tersedia dari sumber yang digunakan.'
            tafsirLoaded = true
            return
          }
          tafsirStatus.hidden = true
          const text = esc(entry.teks).replace(/\n{2,}/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>').replace(/\n/g, '<br/>')
          tafsirResult.innerHTML = `
            <div class="ayah-sheet-tafsir-source"><strong>Sumber tafsir</strong><span>${esc(data.edition || 'Sumber tidak dicantumkan')}</span></div>
            <div class="prose ayah-sheet-tafsir-copy">${text}</div>
            <a class="btn sm ayah-sheet-full-tafsir" href="#/tafsir/${n}/${ayahNo}">${icon('book')}Buka tafsir lengkap surah</a>`
          tafsirLoaded = true
        } catch {
          tafsirStatus.innerHTML = 'Tafsir belum dapat dimuat. Periksa koneksi lalu coba lagi. <button type="button" class="btn sm" data-act="tafsir-retry">Coba lagi</button>'
        } finally {
          tafsirLoading = false
        }
      }

      body.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]')
        if (!b) return
        const act = b.dataset.act
        if (act === 'play') {
          playAyah(surah, ayahNo)
          close()
        } else if (act === 'bookmark') {
          const onNow = await bookmarkRepo.toggle({ surah: n, ayah: ayahNo, surahName: surah.namaLatin, category: body.querySelector('[name=category]').value })
          toast(onNow ? 'Bookmark disimpan' : 'Bookmark dihapus')
          onChange && onChange()
          close()
        } else if (act === 'tafsir') {
          const expanded = tafsirButton.getAttribute('aria-expanded') === 'true'
          tafsirPanel.hidden = expanded
          tafsirButton.setAttribute('aria-expanded', String(!expanded))
          tafsirButton.querySelector('span').textContent = expanded ? 'Baca tafsir' : 'Tutup tafsir'
          if (!expanded) {
            tafsirPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            await loadTafsir()
          }
        } else if (act === 'tafsir-retry') {
          await loadTafsir()
        } else if (act === 'copy') {
          toast((await copyText(ayahShareText(surah, a))) ? 'Ayat disalin' : 'Gagal menyalin')
        } else if (act === 'share') {
          openShare(
            { title: `QS. ${surah.namaLatin} ${ref}`, text: ayahShareText(surah, a), url: `${APP.origin}/#/surah/${n}/${ayahNo}` },
            { title: 'Bagikan ayat', what: 'ayat' }
          )
        } else if (act === 'last') {
          onMarkLast && onMarkLast(ayahNo)
          toast('Ditandai sebagai bacaan terakhir')
          close()
        } else if (act === 'save-note') {
          await noteRepo.save({ surah: n, ayah: ayahNo, surahName: surah.namaLatin, text: body.querySelector('[name=note]').value })
          toast('Catatan disimpan')
          onChange && onChange()
          close()
        }
      })
    }
  })
}
