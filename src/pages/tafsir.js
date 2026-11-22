import { getTafsir, getSurah, friendlyError } from '../api/api-adapter.js'
import { bookmarkRepo } from '../database/repositories.js'
import { pageHeader, skeleton, errorState } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { $, $$, esc, toast } from '../utils/helpers.js'
import { ayahMarker } from '../utils/arabic-numbers.js'
import { isSurahNo } from '../utils/validation.js'
import { navigate, rerender } from '../router.js'

export default async function tafsir(root, { params }) {
  const n = parseInt(params.n, 10)
  if (!isSurahNo(n)) return navigate('/quran', { replace: true })
  const target = parseInt(params.a, 10) || 0
  root.innerHTML = `<div class="page">${pageHeader('Tafsir', { subtitle: `Surah ${n}` })}<div data-body>${skeleton(5, 'sk-block')}</div></div>`
  const body = $('[data-body]', root)
  let t
  let surah = null
  try {
    ;[t, surah] = await Promise.all([getTafsir(n), getSurah(n).catch(() => null)])
  } catch (e) {
    body.innerHTML = errorState(esc(friendlyError(e)))
    $('[data-retry]', body).onclick = rerender
    return
  }
  const name = surah ? surah.namaLatin : t.namaLatin
  $('.page-title', root).innerHTML = `<h1>Tafsir ${esc(name)}</h1><p>${esc(t.edition)}</p>`
  const bms = new Set((await bookmarkRepo.all()).filter((b) => b.type === 'tafsir' && b.surah === n).map((b) => b.ayah))
  // Tafsir yang berbeda sumber dari teks surah tetap ditampilkan dengan identitas edisinya masing-masing.
  body.innerHTML = `
    <div class="card source-card">${icon('info')}<div><strong>Sumber tafsir</strong><p>${esc(t.edition)}</p><p class="muted">Isi tafsir ditampilkan apa adanya dari sumber, tanpa perubahan.</p></div></div>
    <label class="field inline"><span>Lompat ke ayat</span><select data-jump>${t.tafsir.map((x) => `<option value="${x.ayat}" ${x.ayat === target ? 'selected' : ''}>Ayat ${x.ayat}</option>`).join('')}</select></label>
    <div class="tafsir-list">${t.tafsir
      .map((x) => {
        const a = surah && surah.ayat[x.ayat - 1]
        return `<article class="tafsir-item" id="t${x.ayat}" data-a="${x.ayat}">
        <header><span class="ayah-num">${ayahMarker(x.ayat)}</span><span class="spacer"></span>
          <a class="icon-btn sm" href="/surah/${n}/${x.ayat}" aria-label="Buka ayat ${x.ayat} di pembaca">${icon('book')}</a>
          <button class="icon-btn sm bm-btn" data-bm aria-pressed="${bms.has(x.ayat)}" aria-label="Bookmark tafsir ayat ${x.ayat}">${icon('bookmark')}</button></header>
        ${a ? `<p class="ayah-ar" lang="ar" dir="rtl">${esc(a.teksArab)}</p>${a.teksIndonesia ? `<p class="ayah-id">${esc(a.teksIndonesia)}</p>` : ''}` : ''}
        <div class="prose">${esc(x.teks).replace(/\n{2,}/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>').replace(/\n/g, '<br/>')}</div>
      </article>`
      })
      .join('')}</div>
    <nav class="surah-nav">${n > 1 ? `<a class="btn" href="/tafsir/${n - 1}">${icon('back')}Surah sebelumnya</a>` : '<span></span>'}${n < 114 ? `<a class="btn" href="/tafsir/${n + 1}">Surah berikutnya${icon('forward')}</a>` : '<span></span>'}</nav>`
  const go = (a) => {
    const el = $('#t' + a, body)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70 })
  }
  $('[data-jump]', body).onchange = (e) => go(e.target.value)
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-bm]')
    if (!b) return
    const a = +b.closest('[data-a]').dataset.a
    const onNow = await bookmarkRepo.toggle({ surah: n, ayah: a, surahName: name, type: 'tafsir', category: 'Tafsir' })
    b.setAttribute('aria-pressed', onNow)
    toast(onNow ? 'Tafsir ditandai' : 'Tanda tafsir dihapus')
  })
  if (target) requestAnimationFrame(() => go(target))
}
