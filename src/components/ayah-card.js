// Markup ayat (mode mushaf & mode fokus) serta lembar aksi ayat.
import { icon } from './icons.js'
import { openSheet } from './modal.js'
import { esc, toast, copyText, shareText } from '../utils/helpers.js'
import { ayahMarker, ayahRef, qnum } from '../utils/arabic-numbers.js'
import { isSajda, isPageStart, pageOf, juzOf } from '../utils/quran-meta.js'
import { bookmarkRepo, noteRepo } from '../database/repositories.js'
import { playAyah } from '../services/audio.js'
import { APP } from '../config.js'

const numHtml = (n) => `<span class="ayah-num" aria-label="Ayat ${n}">${ayahMarker(n)}</span>`
const sajdaHtml = (s, a) => (isSajda(s, a) ? '<span class="sajda" title="Ayat sajdah">۩</span>' : '')

const pageSep = (surah, a) =>
  isPageStart(surah, a) && a > 1 ? `<span class="page-sep" dir="rtl" data-page="${pageOf(surah, a)}"><span>صفحة ${qnum(pageOf(surah, a))}</span></span>` : ''

/** Mode Mushaf Continuous: ayat mengalir inline, nomor ayat sebagai pemisah. */
export function flowHtml(surah, marks) {
  const n = surah.nomor
  return surah.ayat
    .map((a) => {
      const k = a.nomorAyat
      const cls = (marks.bookmarks.has(k) ? ' is-bookmarked' : '') + (marks.notes.has(k) ? ' has-note' : '')
      return `${pageSep(n, k)}<span class="ayah${cls}" data-a="${k}" tabindex="0" role="button"><span class="ayah-text">${esc(a.teksArab)}</span>${sajdaHtml(n, k)}&nbsp;${numHtml(k)}</span> `
    })
    .join('')
}

/** Ayah Focus Mode: tiap ayat memiliki area sendiri (Arab, Latin, terjemahan, kontrol). */
export function focusHtml(surah, marks) {
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
            <button class="icon-btn sm" data-act="more" aria-label="Aksi lain ayat ${k}">${icon('more')}</button>
          </span>
        </header>
        <p class="ayah-ar" dir="rtl" lang="ar">${esc(a.teksArab)}${sajdaHtml(n, k)}</p>
        ${a.teksLatin ? `<p class="ayah-latin" dir="ltr">${esc(a.teksLatin)}</p>` : ''}
        ${a.teksIndonesia ? `<p class="ayah-id" dir="ltr">${esc(a.teksIndonesia)}</p>` : ''}
      </article>`
    })
    .join('')
}

export function ayahShareText(surah, a) {
  return `${a.teksArab}\n\n${a.teksIndonesia ? `“${a.teksIndonesia}”\n` : ''}(QS. ${surah.namaLatin} ${ayahRef(surah.nomor, a.nomorAyat)})`
}

/** Lembar aksi untuk satu ayat. */
export async function openAyahSheet(surah, ayahNo, { onChange, onMarkLast } = {}) {
  const a = surah.ayat[ayahNo - 1]
  if (!a) return
  const n = surah.nomor
  const [bookmarked, note, categories] = await Promise.all([bookmarkRepo.has('ayat', n, ayahNo), noteRepo.get(n, ayahNo), bookmarkRepo.categories()])
  const ref = ayahRef(n, ayahNo)
  openSheet({
    title: `QS. ${surah.namaLatin} ${ref}`,
    content: `
      <p class="sheet-meta">Juz <span class="qn">${qnum(juzOf(n, ayahNo))}</span> · Halaman <span class="qn">${qnum(pageOf(n, ayahNo))}</span>${isSajda(n, ayahNo) ? ' · <em class="chip chip-gold">Ayat sajdah</em>' : ''}</p>
      <p class="sheet-ar" dir="rtl" lang="ar">${esc(a.teksArab)}</p>
      ${a.teksLatin ? `<p class="ayah-latin">${esc(a.teksLatin)}</p>` : ''}
      ${a.teksIndonesia ? `<p class="sheet-tr">${esc(a.teksIndonesia)}</p>` : '<p class="muted">Terjemahan tidak tersedia.</p>'}
      <div class="action-grid">
        <button data-act="play">${icon('play')}<span>Putar</span></button>
        <button data-act="bookmark" class="${bookmarked ? 'on' : ''}">${icon('bookmark')}<span>${bookmarked ? 'Hapus bookmark' : 'Bookmark'}</span></button>
        <a href="#/tafsir/${n}/${ayahNo}">${icon('book')}<span>Tafsir</span></a>
        <button data-act="copy">${icon('copy')}<span>Salin</span></button>
        <button data-act="share">${icon('share')}<span>Bagikan</span></button>
        <button data-act="last">${icon('check')}<span>Tandai terakhir</span></button>
      </div>
      <label class="field"><span>Kategori bookmark</span>
        <input list="bm-cats" name="category" value="Umum" maxlength="40" autocomplete="off" />
        <datalist id="bm-cats">${categories.map((c) => `<option value="${esc(c)}"></option>`).join('')}</datalist>
      </label>
      <label class="field"><span>Catatan pribadi (tersimpan di perangkat ini saja)</span>
        <textarea name="note" rows="3" maxlength="5000" placeholder="Tulis catatan tadabbur…">${esc(note ? note.text : '')}</textarea>
      </label>
      <div class="btn-row"><button class="btn btn-primary" data-act="save-note">${icon('note')}Simpan catatan</button></div>`,
    onOpen(body, close) {
      body.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]')
        if (!b) return
        const act = b.dataset.act
        if (act === 'play') {
          playAyah(surah, ayahNo)
          close()
        } else if (act === 'bookmark') {
          const on = await bookmarkRepo.toggle({ surah: n, ayah: ayahNo, surahName: surah.namaLatin, category: body.querySelector('[name=category]').value })
          toast(on ? 'Bookmark disimpan' : 'Bookmark dihapus')
          onChange && onChange()
          close()
        } else if (act === 'copy') {
          toast((await copyText(ayahShareText(surah, a))) ? 'Ayat disalin' : 'Gagal menyalin')
        } else if (act === 'share') {
          const r = await shareText(`QS. ${surah.namaLatin} ${ref}`, ayahShareText(surah, a), `${APP.origin}/#/surah/${n}/${ayahNo}`)
          if (r === 'copied') toast('Teks & tautan disalin (fitur bagikan tidak tersedia)')
          else if (r === 'failed') toast('Gagal membagikan')
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
