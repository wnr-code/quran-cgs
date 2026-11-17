import { getSurahList, friendlyError } from '../api/api-adapter.js'
import { surahRepo } from '../database/repositories.js'
import { surahRow } from '../components/surah-card.js'
import { pageHeader, skeleton, errorState, emptyState } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { $, esc, debounce } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
import { juzList } from '../utils/quran-meta.js'
import { rerender } from '../router.js'

let lastTab = 'surah'

export default async function quran(root) {
  root.innerHTML = `<div class="page quran-page">
    ${pageHeader("Al-Qur'an", { back: false, subtitle: '114 surah · 30 juz · Mushaf Madinah', actions: `<a class="icon-btn" href="#/cari" aria-label="Pencarian lengkap">${icon('search')}</a>` })}
    <div class="search-box">${icon('search')}<input type="search" placeholder="Cari nama atau nomor surah…" aria-label="Cari surah" autocomplete="off" /></div>
    <div class="tabs" role="tablist" aria-label="Tampilan daftar Al-Qur'an"><button type="button" id="quran-tab-surah" role="tab" aria-controls="quran-list-panel" data-tab="surah">Surah <small class="tab-count">114</small></button><button type="button" id="quran-tab-juz" role="tab" aria-controls="quran-list-panel" data-tab="juz">Juz <small class="tab-count">30</small></button></div>
    <div id="quran-list-panel" data-list role="tabpanel" tabindex="0">${skeleton(10)}</div>
  </div>`
  const listEl = $('[data-list]', root)
  let list
  try {
    list = await getSurahList()
  } catch (e) {
    listEl.innerHTML = errorState(esc(friendlyError(e)))
    $('[data-retry]', listEl).onclick = rerender
    return
  }
  const saved = new Set(await surahRepo.keys())
  const input = $('input', root)

  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '')
  const renderSurah = () => {
    const q = norm(input.value)
    const items = q ? list.filter((s) => norm(s.namaLatin).includes(q) || String(s.nomor) === q || norm(s.arti).includes(q) || s.nama.includes(input.value.trim())) : list
    listEl.innerHTML = items.length ? `<div class="list">${items.map((s) => surahRow(s, { saved: saved.has(s.nomor) })).join('')}</div>` : emptyState('search', 'Surah tidak ditemukan', 'Coba kata kunci lain atau gunakan pencarian lengkap.', '<a class="btn" href="#/cari">Pencarian lengkap</a>')
  }
  const renderJuz = () => {
    listEl.innerHTML = `<div class="list">${juzList()
      .map((j) => {
        const a = list[j.start[0] - 1]
        const b = list[j.end[0] - 1]
        return `<a class="surah-row" href="#/surah/${j.start[0]}/${j.start[1]}">
          <span class="num-star"><span>${qnum(j.juz)}</span></span>
          <span class="surah-meta"><strong>Juz ${j.juz}</strong>
            <small>${esc(a.namaLatin)} ${j.start[0]}:${j.start[1]} — ${esc(b.namaLatin)} ${j.end[0]}:${j.end[1]} · mulai hlm <span class="qn">${qnum(j.pageStart)}</span></small></span>
          <span class="surah-ar" lang="ar" dir="rtl">الجزء ${qnum(j.juz)}</span></a>`
      })
      .join('')}</div>`
  }
  const setTab = (t) => {
    lastTab = t
    root.querySelectorAll('[data-tab]').forEach((b) => {
      const selected = b.dataset.tab === t
      b.classList.toggle('active', selected)
      b.setAttribute('aria-selected', String(selected))
      b.tabIndex = selected ? 0 : -1
    })
    listEl.setAttribute('aria-labelledby', `quran-tab-${t}`)
    t === 'juz' ? renderJuz() : renderSurah()
  }
  const tablist = root.querySelector('.tabs')
  tablist.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]')
    if (b) setTab(b.dataset.tab)
  })
  tablist.addEventListener('keydown', (e) => {
    const current = e.target.closest('[role="tab"]')
    if (!current) return
    const tabs = [...tablist.querySelectorAll('[role="tab"]')]
    const index = tabs.indexOf(current)
    const next = e.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : e.key === 'ArrowLeft' ? tabs[(index - 1 + tabs.length) % tabs.length] : e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : null
    if (!next) return
    e.preventDefault()
    next.focus()
    next.click()
  })
  input.addEventListener('input', debounce(() => setTab('surah'), 120))
  setTab(lastTab)
}
