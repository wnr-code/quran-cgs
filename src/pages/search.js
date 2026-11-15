// Pencarian: nama/nomor surah, referensi ayat (2:255), juz, halaman, serta kata pada terjemahan &
// transliterasi Latin dari surah yang SUDAH tersimpan di perangkat (pencarian lokal).
import { getSurahList } from '../api/api-adapter.js'
import { surahRepo } from '../database/repositories.js'
import { surahRow } from '../components/surah-card.js'
import { pageHeader, emptyState } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { $, esc, debounce } from '../utils/helpers.js'
import { toLatinDigits } from '../utils/arabic-numbers.js'
import { juzStart, pageStart, TOTAL_PAGES } from '../utils/quran-meta.js'
import { isAyahNo } from '../utils/validation.js'

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`‘-]/g, '')
let lastQuery = ''

export default async function search(root) {
  root.innerHTML = `<div class="page">
    ${pageHeader('Pencarian')}
    <div class="search-box">${icon('search')}<input type="search" placeholder="Surah, 2:255, juz 30, halaman 50, atau kata…" aria-label="Kata kunci" autocomplete="off" /></div>
    <div data-res></div></div>`
  const res = $('[data-res]', root)
  const input = $('input', root)
  let list = []
  try {
    list = await getSurahList()
  } catch {}
  let saved = null
  let token = 0

  const hl = (text, q) => {
    const i = norm(text).indexOf(q)
    if (i < 0 || norm(text).length !== text.length) return esc(text.length > 220 ? text.slice(0, 220) + '…' : text)
    const start = Math.max(0, i - 60)
    const end = Math.min(text.length, i + q.length + 120)
    return (start ? '…' : '') + esc(text.slice(start, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length, end)) + (end < text.length ? '…' : '')
  }

  async function run() {
    const my = ++token
    const raw = toLatinDigits(input.value.trim())
    lastQuery = input.value
    if (!raw) {
      res.innerHTML = emptyState('search', 'Cari di QuranKu', 'Contoh: <b>yasin</b>, <b>36</b>, <b>2:255</b>, <b>juz 30</b>, <b>halaman 293</b>, <b>sabar</b>. Pencarian kata terjemahan & Latin bekerja pada surah yang sudah tersimpan offline.', '<a class="btn" href="#/offline">Kelola unduhan teks</a>')
      return
    }
    const q = norm(raw)
    let html = ''
    const direct = []
    let m
    if ((m = /^(\d{1,3})\s*[:.\s]\s*(\d{1,3})$/.exec(raw)) && isAyahNo(+m[1], +m[2])) direct.push([`#/surah/${+m[1]}/${+m[2]}`, `Buka ayat ${+m[1]}:${+m[2]}`, list[+m[1] - 1] ? list[+m[1] - 1].namaLatin : 'Surah ' + m[1]])
    if ((m = /^juz\s*(\d{1,2})$/.exec(q)) && +m[1] >= 1 && +m[1] <= 30) {
      const [s, a] = juzStart(+m[1])
      direct.push([`#/surah/${s}/${a}`, `Buka Juz ${+m[1]}`, `mulai ${s}:${a}`])
    }
    if ((m = /^(?:hal|halaman|hlm|page)\s*(\d{1,3})$/.exec(q)) && +m[1] >= 1 && +m[1] <= TOTAL_PAGES) {
      const [s, a] = pageStart(+m[1])
      direct.push([`#/surah/${s}/${a}`, `Buka halaman ${+m[1]}`, `mulai ${s}:${a} (Mushaf Madinah)`])
    }
    if (direct.length) html += `<h3 class="section-title">Buka langsung</h3><div class="list">${direct.map(([h, t, s]) => `<a class="row-link" href="${h}">${icon('forward')}<span><strong>${esc(t)}</strong><small>${esc(s)}</small></span></a>`).join('')}</div>`

    const surahs = list.filter((s) => norm(s.namaLatin).replace(/\s/g, '').includes(q.replace(/\s/g, '')) || String(s.nomor) === raw || norm(s.arti).includes(q) || s.nama.includes(raw))
    if (surahs.length) html += `<h3 class="section-title">Surah</h3><div class="list">${surahs.slice(0, 20).map((s) => surahRow(s)).join('')}</div>`
    res.innerHTML = html || '<p class="muted pad">Mencari…</p>'

    if (q.length >= 3 && !/^\d+$/.test(q)) {
      if (!saved) saved = await surahRepo.all()
      if (my !== token) return
      const hits = []
      outer: for (const s of saved) {
        for (const a of s.ayat) {
          const inId = a.teksIndonesia && norm(a.teksIndonesia).includes(q)
          const inLatin = !inId && a.teksLatin && norm(a.teksLatin).includes(q)
          if (inId || inLatin) {
            hits.push({ s, a, field: inId ? 'teksIndonesia' : 'teksLatin' })
            if (hits.length >= 80) break outer
          }
        }
      }
      html += `<h3 class="section-title">Ayat (${hits.length}${hits.length >= 80 ? '+' : ''}) <small>dari ${saved.length} surah tersimpan</small></h3>`
      html += hits.length
        ? `<div class="list">${hits.map(({ s, a, field }) => `<a class="row-link hit" href="#/surah/${s.nomor}/${a.nomorAyat}"><span><strong>${esc(s.namaLatin)} ${s.nomor}:${a.nomorAyat}</strong><small class="${field === 'teksLatin' ? 'latin' : ''}">${hl(a[field], q)}</small></span></a>`).join('')}</div>`
        : `<p class="muted pad">Tidak ada ayat yang cocok pada ${saved.length} surah tersimpan. ${saved.length < 114 ? '<a class="link" href="#/offline">Unduh lebih banyak surah</a> untuk memperluas pencarian.' : ''}</p>`
    }
    if (my !== token) return
    res.innerHTML = html || emptyState('search', 'Tidak ada hasil', 'Coba kata kunci lain.')
  }

  input.addEventListener('input', debounce(run, 250))
  input.value = lastQuery
  run()
  if (!('ontouchstart' in window)) input.focus()
}
