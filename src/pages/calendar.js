import { pageHeader, emptyState } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { getSettings } from '../services/storage.js'
import { toHijri, HIJRI_MONTHS, islamicDayOf, formatHijri } from '../utils/hijri.js'
import { formatGregorian } from '../utils/format.js'
import { $, esc } from '../utils/helpers.js'

export default function calendar(root) {
  root.innerHTML = `<div class="page">${pageHeader('Kalender Hijriah')}<div data-body></div></div>`
  const body = $('[data-body]', root)
  const adj = getSettings().hijriAdjust
  const today = new Date()
  let y = today.getFullYear()
  let m = today.getMonth()
  if (!toHijri(today)) {
    body.innerHTML = emptyState('calendar', 'Kalender Hijriah tidak didukung', 'Perangkat/browser ini tidak menyediakan kalender Islam (Intl).')
    return
  }

  function render() {
    const first = new Date(y, m, 1)
    const daysIn = new Date(y, m + 1, 0).getDate()
    const lead = (first.getDay() + 6) % 7 // Senin = 0
    const cells = []
    const events = []
    for (let i = 0; i < lead; i++) cells.push('<div class="cal-cell empty"></div>')
    const hFirst = toHijri(first, adj)
    const hLast = toHijri(new Date(y, m, daysIn), adj)
    for (let d = 1; d <= daysIn; d++) {
      const date = new Date(y, m, d)
      const h = toHijri(date, adj)
      const ev = islamicDayOf(h)
      if (ev) events.push({ d, h, name: ev.name })
      const isToday = date.toDateString() === today.toDateString()
      cells.push(`<div class="cal-cell ${isToday ? 'today' : ''} ${ev ? 'event' : ''} ${date.getDay() === 5 ? 'friday' : ''}"><b>${d}</b><small>${h.day}${h.day === 1 ? ' ' + HIJRI_MONTHS[h.month - 1].slice(0, 3) : ''}</small></div>`)
    }
    const title = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(first)
    const hTitle = hFirst.month === hLast.month ? `${HIJRI_MONTHS[hFirst.month - 1]} ${hFirst.year} H` : `${HIJRI_MONTHS[hFirst.month - 1]} – ${HIJRI_MONTHS[hLast.month - 1]} ${hLast.year} H`
    body.innerHTML = `
      <section class="card ornament prayer-card"><p class="eyebrow">Hari ini</p><h2>${esc(formatHijri(today, adj))}</h2><p class="np-sub">${esc(formatGregorian(today))}</p></section>
      <section class="card"><div class="cal-head"><button class="icon-btn" data-m="-1" aria-label="Bulan sebelumnya">${icon('back')}</button><div><strong>${esc(title)}</strong><small>${esc(hTitle)}</small></div><button class="icon-btn" data-m="1" aria-label="Bulan berikutnya">${icon('forward')}</button></div>
        <div class="cal-grid cal-week">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-grid">${cells.join('')}</div>
        <div class="btn-row"><button class="btn sm" data-today>Bulan ini</button></div></section>
      <section class="card"><p class="eyebrow">Hari besar Islam bulan ini</p>
        ${events.length ? `<ul class="plain-list">${events.map((e) => `<li>${icon('star')}<span>${esc(e.name)}<small class="muted"> · ${e.h.day} ${HIJRI_MONTHS[e.h.month - 1]} ${e.h.year} H</small></span><b>${e.d} ${esc(new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(first))}</b></li>`).join('')}</ul>` : '<p class="muted">Tidak ada hari besar pada bulan ini.</p>'}
        <p class="hint">Kalender memakai perhitungan Umm al-Qura. Penetapan resmi awal bulan (mis. Ramadan, Idulfitri, Iduladha) di Indonesia mengikuti sidang isbat Kemenag RI dan dapat berbeda ±1 hari. Koreksi tanggal tersedia di Pengaturan.</p></section>`
  }
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]')
    if (b) {
      m += +b.dataset.m
      if (m < 0) (m = 11), y--
      if (m > 11) (m = 0), y++
      render()
    } else if (e.target.closest('[data-today]')) {
      y = today.getFullYear()
      m = today.getMonth()
      render()
    }
  })
  render()
}
