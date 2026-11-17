import { getSurahList, friendlyError } from '../api/api-adapter.js'
import { surahRepo, historyRepo } from '../database/repositories.js'
import { surahRow } from '../components/surah-card.js'
import { pageHeader, skeleton, errorState, emptyState } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { $, esc, debounce } from '../utils/helpers.js'
import { qnum } from '../utils/arabic-numbers.js'
import { juzList } from '../utils/quran-meta.js'
import { rerender } from '../router.js'

let lastTab = 'surah'

const CORE_POPULAR = [36, 56, 67] // Yasin, Al-Waqi'ah, Al-Mulk (Tabarak)
const FALLBACK_POPULAR = [18, 55, 1, 2, 112, 113, 114]

function selectPopularSurahs(list, history) {
  const visits = new Map()
  const lastSeen = new Map()
  for (const item of history || []) {
    const id = Number(item.surah)
    if (!Number.isInteger(id) || id < 1 || id > 114) continue
    visits.set(id, (visits.get(id) || 0) + 1)
    lastSeen.set(id, Math.max(lastSeen.get(id) || 0, Number(item.at) || 0))
  }

  const core = new Set(CORE_POPULAR)
  const frequent = [...visits.entries()]
    .filter(([id]) => !core.has(id))
    .sort((a, b) => b[1] - a[1] || (lastSeen.get(b[0]) || 0) - (lastSeen.get(a[0]) || 0) || a[0] - b[0])
    .map(([id]) => id)
  const byId = new Map(list.map((surah) => [Number(surah.nomor), surah]))
  const selected = []
  const seen = new Set()
  for (const id of [...CORE_POPULAR, ...frequent, ...FALLBACK_POPULAR]) {
    const surah = byId.get(id)
    if (!surah || seen.has(id)) continue
    seen.add(id)
    selected.push({ surah, visits: visits.get(id) || 0, origin: core.has(id) ? 'popular' : visits.has(id) ? 'history' : 'suggested' })
    if (selected.length === 5) break
  }
  return selected
}

function popularCard({ surah, visits, origin }, index) {
  const badge = origin === 'popular' ? (surah.nomor === 67 ? 'Tabarak' : 'Populer') : origin === 'history' ? (visits > 1 ? 'Sering dibaca' : 'Riwayat lokal') : 'Pilihan'
  const detail = origin === 'history'
    ? `${qnum(visits)} kunjungan di perangkat ini`
    : `QS ${qnum(surah.nomor)} · ${qnum(surah.jumlahAyat)} ayat`
  return `<a class="popular-surah-card" href="#/surah/${surah.nomor}" data-surah="${surah.nomor}" data-origin="${origin}" role="listitem" aria-label="Buka Surah ${esc(surah.namaLatin)}, ${qnum(surah.jumlahAyat)} ayat">
    <span class="popular-card-top"><span class="popular-card-index">${String(index + 1).padStart(2, '0')}</span><span class="popular-card-badge">${badge}</span></span>
    <span class="popular-card-copy"><strong>${esc(surah.namaLatin)}</strong><small>${detail}${surah.nomor === 67 ? ' · Al-Mulk' : ''}</small></span>
    <span class="popular-card-bottom"><span class="popular-card-ar" lang="ar" dir="rtl">${esc(surah.nama)}</span><span class="popular-card-arrow">${icon('forward')}</span></span>
  </a>`
}

function popularSection(items) {
  const localCount = items.filter((item) => item.origin === 'history').length
  const caption = localCount
    ? `Yasin, Al-Waqi'ah, dan Tabarak · ${qnum(localCount)} pilihan dari riwayat bacaan lokal.`
    : 'Yasin, Al-Waqi’ah, Tabarak, Al-Kahfi, dan Ar-Rahman.'
  return `<div class="quran-popular">
    <div class="quran-popular-head"><div><span class="quran-popular-kicker">MULAI DARI YANG POPULER</span><h2 id="quran-popular-title">Surat populer</h2><p class="quran-popular-caption">${caption}</p></div><span class="quran-popular-count">${qnum(items.length)} surat</span></div>
    <div class="quran-popular-track" role="list" aria-label="Lima surat populer">${items.map(popularCard).join('')}</div>
  </div>`
}

export default async function quran(root) {
  root.innerHTML = `<div class="page quran-page">
    ${pageHeader("Al-Qur'an", { back: false, subtitle: '114 surah · 30 juz · Mushaf Madinah', actions: `<a class="icon-btn" href="#/cari" aria-label="Pencarian lengkap">${icon('search')}</a>` })}
    <div class="search-box">${icon('search')}<input type="search" placeholder="Cari nama atau nomor surah…" aria-label="Cari surah" autocomplete="off" /></div>
    <section class="quran-popular-slot" data-popular hidden aria-labelledby="quran-popular-title"></section>
    <div class="tabs" role="tablist" aria-label="Tampilan daftar Al-Qur'an"><button type="button" id="quran-tab-surah" role="tab" aria-controls="quran-list-panel" data-tab="surah">Surah <small class="tab-count">114</small></button><button type="button" id="quran-tab-juz" role="tab" aria-controls="quran-list-panel" data-tab="juz">Juz <small class="tab-count">30</small></button></div>
    <div id="quran-list-panel" data-list role="tabpanel" tabindex="0">${skeleton(10)}</div>
  </div>`
  const listEl = $('[data-list]', root)
  const popularEl = $('[data-popular]', root)
  let list
  try {
    list = await getSurahList()
  } catch (e) {
    popularEl.remove()
    listEl.innerHTML = errorState(esc(friendlyError(e)))
    $('[data-retry]', listEl).onclick = rerender
    return
  }
  const [savedKeys, history] = await Promise.all([surahRepo.keys(), historyRepo.all()])
  const saved = new Set(savedKeys)
  const popular = selectPopularSurahs(list, history)
  popularEl.innerHTML = popularSection(popular)
  const input = $('input', root)

  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '')
  const renderSurah = () => {
    const q = norm(input.value)
    popularEl.hidden = !!q
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
    popularEl.hidden = t !== 'surah' || !!norm(input.value)
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
