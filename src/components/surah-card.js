import { esc } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
import { tempatTurunLabel } from '../utils/format.js'

/** Baris daftar surah. Nomor di dalam ornamen bintang memakai angka Arab-Indic (sesuai pengaturan). */
export function surahRow(s, { saved = false, extra = '' } = {}) {
  return `<a class="surah-row" href="/surah/${s.nomor}" data-surah="${s.nomor}">
    <span class="num-star" aria-hidden="true"><span>${qnum(s.nomor)}</span></span>
    <span class="surah-meta">
      <strong>${esc(s.namaLatin)}${saved ? '<i class="dot-saved" title="Tersimpan offline"></i>' : ''}</strong>
      <small>${esc(s.arti)} · ${esc(tempatTurunLabel(s.tempatTurun))} · <span class="qn">${qnum(s.jumlahAyat)}</span> ayat</small>
    </span>
    <span class="surah-ar" lang="ar" dir="rtl">${esc(s.nama)}</span>
    ${extra}
    <span class="sr-only">Surah nomor ${s.nomor}</span>
  </a>`
}
