// Kalender Hijriah: ketuk tanggal → keterangan hari (hari besar, amalan puasa) + catatan & pengingat pribadi.
import { pageHeader, emptyState } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { openSheet } from '../components/modal.js'
import { getSettings } from '../services/storage.js'
import { dayKey, notesOf, noteDays, saveNote, deleteNote } from '../services/calendar-notes.js'
import { requestNotifPermission, notifPermission, notifSupported } from '../services/notification.js'
import { isNativePlatform } from '../services/platform.js'
import { toHijri, HIJRI_MONTHS, islamicDayOf, dayNotes, formatHijri, nextRamadan } from '../utils/hijri.js'
import { weton, pasaranOf } from '../utils/javanese.js'
import { holidayOf, hasOfficial } from '../data/libur-nasional.js'
import { formatGregorian } from '../utils/format.js'
import { $, esc, toast } from '../utils/helpers.js'

const DAY = 86400000
const shortDate = (d) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)

/** Hari besar terdekat dalam `days` hari ke depan (termasuk hari ini). */
function upcoming(from, adj, days = 400, max = 4) {
  const out = []
  const seen = new Set()
  for (let i = 0; i <= days && out.length < max; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    const ev = islamicDayOf(toHijri(date, adj))
    if (ev && !seen.has(ev.name)) {
      seen.add(ev.name)
      out.push({ date, ev, in: i })
    }
  }
  return out
}

export default function calendar(root) {
  root.innerHTML = `<div class="page cal-page">${pageHeader('Kalender Hijriah')}<div data-body></div></div>`
  const body = $('[data-body]', root)
  const adj = getSettings().hijriAdjust
  const today = new Date()
  let y = today.getFullYear()
  let m = today.getMonth()
  let sheet = null
  if (!toHijri(today)) {
    body.innerHTML = emptyState('calendar', 'Kalender Hijriah tidak didukung', 'Perangkat/browser ini tidak menyediakan kalender Islam (Intl).')
    return
  }

  function render() {
    const first = new Date(y, m, 1)
    const daysIn = new Date(y, m + 1, 0).getDate()
    const lead = (first.getDay() + 6) % 7 // Senin = 0
    const marks = noteDays()
    const cells = []
    const events = []
    const monthNotes = []
    for (let i = 0; i < lead; i++) cells.push('<div class="cal-cell empty"></div>')
    const hFirst = toHijri(first, adj)
    const hLast = toHijri(new Date(y, m, daysIn), adj)
    for (let d = 1; d <= daysIn; d++) {
      const date = new Date(y, m, d)
      const key = dayKey(date)
      const h = toHijri(date, adj)
      const ev = islamicDayOf(h)
      const mark = marks[key]
      const hol = holidayOf(date, adj)
      const red = date.getDay() === 0 || (hol && hol.type === 'libur')
      if (hol) events.push({ d, key, name: hol.name, sub: hol.type === 'cuti' ? 'Cuti bersama' : hol.official ? 'Libur nasional' : 'Libur nasional (perkiraan)', cls: hol.type === 'cuti' ? 'cuti' : 'red' })
      if (ev) events.push({ d, key, name: ev.name, sub: `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} H`, cls: '' })
      if (mark) notesOf(key).forEach((n) => monthNotes.push({ d, key, n }))
      const isToday = date.toDateString() === today.toDateString()
      const label = `${formatGregorian(date)} ${pasaranOf(date)}${hol ? ', ' + hol.name : ''}${ev ? ', ' + ev.name : ''}${mark ? `, ${mark.count} catatan` : ''}`
      cells.push(
        `<button type="button" class="cal-cell ${isToday ? 'today' : ''} ${ev ? 'event' : ''} ${date.getDay() === 5 ? 'friday' : ''} ${red ? 'red' : ''} ${hol && hol.type === 'cuti' ? 'cuti' : ''}" data-day="${key}" aria-label="${esc(label)}"><b>${d}</b><small>${h.day}${h.day === 1 ? ' ' + HIJRI_MONTHS[h.month - 1].slice(0, 3) : ''}</small>${ev || mark || hol ? `<i class="cal-dots">${hol ? `<i class="dot ${hol.type === 'cuti' ? 'ct' : 'hl'}"></i>` : ''}${ev ? '<i class="dot ev"></i>' : ''}${mark ? `<i class="dot ${mark.remind ? 'rem' : 'nt'}"></i>` : ''}</i>` : ''}</button>`
      )
    }
    const title = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(first)
    const hTitle = hFirst.month === hLast.month ? `${HIJRI_MONTHS[hFirst.month - 1]} ${hFirst.year} H` : `${HIJRI_MONTHS[hFirst.month - 1]} – ${HIJRI_MONTHS[hLast.month - 1]} ${hLast.year} H`
    const mon = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(first)
    const todayEv = islamicDayOf(toHijri(today, adj))
    const todayHol = holidayOf(today, adj)
    const next = upcoming(today, adj)
    const ramadan = nextRamadan(today, adj)
    const ramadanCountdown = ramadan
      ? `<div class="ramadan-countdown" role="note" aria-label="Perkiraan awal puasa Ramadan: ${ramadan.days === 0 ? 'diperkirakan hari ini' : `${ramadan.days} hari lagi`}.">
          <span class="ramadan-countdown-icon">${icon('moon')}</span>
          <span class="ramadan-countdown-copy"><small>Perkiraan awal puasa Ramadan</small><strong>${ramadan.days === 0 ? 'Diperkirakan hari ini' : `${ramadan.days} hari lagi puasa`}</strong></span>
          <span class="ramadan-countdown-date">${esc(shortDate(ramadan.date))}</span>
        </div>`
      : ''
    body.innerHTML = `
      <section class="card ornament prayer-card cal-hero"><p class="eyebrow">Hari ini</p>
        <div class="hero-date-line" role="group" aria-label="Tanggal Masehi dan Hijriah">
          <span class="hero-date-item">${icon('calendar')}<span class="hero-date-text">${esc(formatGregorian(today))}</span></span>
          <span class="hero-date-separator" aria-hidden="true">·</span>
          <span class="hero-date-item">${icon('moon')}<span class="hero-date-text">${esc(formatHijri(today, adj))}</span></span>
        </div>
        <p class="np-sub">${esc(pasaranOf(today))}</p>
        ${ramadanCountdown}
        ${todayHol ? `<span class="cal-chip red">${esc(todayHol.name)}</span>` : ''}
        ${todayEv ? `<span class="cal-chip">${icon('star')}${esc(todayEv.name)}</span>` : ''}
        <button type="button" class="cal-hero-btn" data-day="${dayKey(today)}">${icon('plus')}Catatan hari ini</button></section>
      <section class="card cal-card"><div class="cal-head"><button class="icon-btn" data-m="-1" aria-label="Bulan sebelumnya">${icon('back')}</button><div><strong>${esc(title)}</strong><small>${esc(hTitle)}</small></div><button class="icon-btn" data-m="1" aria-label="Bulan berikutnya">${icon('forward')}</button></div>
        <div class="cal-grid cal-week">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ahd'].map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-grid" data-grid>${cells.join('')}</div>
        <div class="cal-legend"><span><i class="dot hl"></i>Tanggal merah</span><span><i class="dot ev"></i>Hari besar Islam</span><span><i class="dot nt"></i>Catatan</span><span><i class="dot rem"></i>Pengingat</span><button class="btn sm" data-today>Bulan ini</button></div>
        <p class="hint center">Ketuk tanggal untuk melihat keterangan dan menambah catatan.</p></section>
      <section class="card"><p class="eyebrow">${icon('star')} Tanggal merah & hari besar bulan ini</p>
        ${events.length ? `<ul class="cal-list">${events.map((e) => `<li><button type="button" data-day="${e.key}"><span class="cal-date ${e.cls}"><b>${e.d}</b><small>${esc(mon)}</small></span><span class="cal-item"><strong>${esc(e.name)}</strong><small>${esc(e.sub)}</small></span><span class="cal-go" aria-hidden="true">›</span></button></li>`).join('')}</ul>` : '<p class="muted">Tidak ada tanggal merah atau hari besar pada bulan ini.</p>'}
        <p class="hint">${hasOfficial(y) ? `Libur nasional ${y} mengikuti SKB 3 Menteri${y === 2026 ? ' (cuti bersama belum dimuat)' : ''}; pemerintah dapat mengubahnya.` : `Daftar resmi libur nasional ${y} belum tersedia di aplikasi: tanggal merah tahun ini adalah perkiraan, tanpa Imlek, Nyepi, dan Waisak.`}</p></section>
      ${monthNotes.length ? `<section class="card"><p class="eyebrow">${icon('note')} Catatan bulan ini</p><ul class="cal-list">${monthNotes.map(({ d, key, n }) => `<li><button type="button" data-day="${key}"><span class="cal-date note"><b>${d}</b><small>${esc(mon)}</small></span><span class="cal-item"><strong>${esc(n.text)}</strong>${n.remind ? `<small>${icon('clock')}Pengingat ${esc(n.time)}</small>` : ''}</span><span class="cal-go" aria-hidden="true">›</span></button></li>`).join('')}</ul></section>` : ''}
      <section class="card"><p class="eyebrow">${icon('calendar')} Hari besar terdekat</p>
        <ul class="cal-list">${next.map((e) => `<li><button type="button" data-day="${dayKey(e.date)}"><span class="cal-date soon"><b>${e.in}</b><small>hari</small></span><span class="cal-item"><strong>${esc(e.ev.name)}</strong><small>${esc(shortDate(e.date))}${e.in === 0 ? ' · hari ini' : ''}</small></span><span class="cal-go" aria-hidden="true">›</span></button></li>`).join('')}</ul>
        <p class="hint">Kalender memakai perhitungan Umm al-Qura. Penetapan resmi awal bulan (mis. Ramadan, Idulfitri, Iduladha) di Indonesia mengikuti sidang isbat Kemenag RI dan dapat berbeda ±1 hari. Koreksi tanggal tersedia di Pengaturan.</p></section>`
  }

  // ---------- Rincian tanggal ----------
  function openDay(key) {
    const [yy, mm, dd] = key.split('-').map(Number)
    const date = new Date(yy, mm - 1, dd)
    const h = toHijri(date, adj)
    const ev = islamicDayOf(h)
    const hol = holidayOf(date, adj)
    const extras = dayNotes(date, h)
    const diff = Math.round((new Date(yy, mm - 1, dd) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / DAY)
    const when = diff === 0 ? 'Hari ini' : diff === 1 ? 'Besok' : diff === -1 ? 'Kemarin' : diff > 0 ? `${diff} hari lagi` : `${-diff} hari lalu`
    let editing = null // id catatan yang sedang diubah

    const notesHtml = () => {
      const list = notesOf(key)
      return list.length
        ? `<ul class="day-notes">${list.map((n) => `<li><span class="day-note-text">${esc(n.text)}${n.remind ? `<small>${icon('clock')}Pengingat pukul ${esc(n.time)}</small>` : ''}</span><button type="button" class="icon-btn" data-edit="${n.id}" aria-label="Ubah catatan">${icon('note')}</button><button type="button" class="icon-btn" data-del="${n.id}" aria-label="Hapus catatan">${icon('trash')}</button></li>`).join('')}</ul>`
        : '<p class="muted day-empty">Belum ada catatan pada tanggal ini.</p>'
    }
    const content = `<div class="day-sheet">
      <div class="day-top"><span class="day-num"><b>${dd}</b><small>${esc(new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date))}</small></span>
        <div><strong>${esc(new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date))}, ${esc(shortDate(date))}</strong><small>${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} H · ${when}</small></div></div>
      <div class="day-chips"><span class="day-chip weton" data-weton>${esc(weton(date))}</span>${hol ? `<span class="day-chip ${hol.type === 'cuti' ? 'cuti' : 'red'}">${hol.type === 'cuti' ? 'Cuti bersama' : 'Tanggal merah'}</span>` : date.getDay() === 0 ? '<span class="day-chip red">Hari Minggu</span>' : ''}</div>
      ${hol ? `<div class="day-event red"><span class="day-flag" aria-hidden="true"></span><div><strong>${esc(hol.name)}</strong><p>${hol.type === 'cuti' ? 'Cuti bersama' : 'Hari libur nasional'}${hol.official ? ' menurut SKB 3 Menteri.' : ' — perkiraan; daftar resmi tahun ini belum tersedia di aplikasi.'}</p></div></div>` : ''}
      ${ev ? `<div class="day-event">${icon('star')}<div><strong>${esc(ev.name)}</strong><p>${esc(ev.desc || '')}</p></div></div>` : ''}
      ${extras.length ? `<ul class="day-tags">${extras.map((x) => `<li><b>${esc(x.label)}</b><span>${esc(x.desc)}</span></li>`).join('')}</ul>` : ''}
      ${!ev && !hol && !extras.length ? '<p class="muted day-plain">Tidak ada hari besar pada tanggal ini.</p>' : ''}
      <p class="eyebrow day-eyebrow">${icon('note')} Catatan & pengingat</p>
      <div data-notes>${notesHtml()}</div>
      <form class="day-form" data-form novalidate>
        <textarea data-text rows="2" maxlength="300" placeholder="Tulis catatan… (mis. puasa qadha, kajian, janji)" aria-label="Catatan"></textarea>
        <div class="day-form-row"><label class="day-remind"><input type="checkbox" data-remind /> <span>Ingatkan pukul</span></label><input type="time" data-time value="07:00" aria-label="Jam pengingat" disabled />
          <button type="submit" class="btn btn-primary sm" data-save>${icon('plus')}<span data-save-label>Simpan</span></button></div>
        <p class="hint" data-form-hint>Catatan hanya tersimpan di perangkat ini.</p>
      </form></div>`
    sheet = openSheet({
      title: 'Rincian tanggal',
      content,
      onClose() {
        sheet = null
        render()
      },
      onOpen(el) {
        const text = $('[data-text]', el)
        const remind = $('[data-remind]', el)
        const time = $('[data-time]', el)
        const hint = $('[data-form-hint]', el)
        const label = $('[data-save-label]', el)
        const refresh = () => ($('[data-notes]', el).innerHTML = notesHtml())
        const reset = () => {
          editing = null
          text.value = ''
          remind.checked = false
          time.disabled = true
          label.textContent = 'Simpan'
        }
        remind.addEventListener('change', async () => {
          time.disabled = !remind.checked
          if (!remind.checked) return (hint.textContent = 'Catatan hanya tersimpan di perangkat ini.')
          if (isNativePlatform()) return (hint.textContent = 'Di Android, pengingat catatan muncul sebagai pesan dalam aplikasi saat QuranKu terbuka; alarm native hanya menjadwalkan waktu salat.')
          if (!notifSupported()) return (hint.textContent = 'Peramban ini tidak mendukung notifikasi; pengingat hanya tampil sebagai tanda di kalender.')
          const p = notifPermission() === 'granted' ? 'granted' : await requestNotifPermission()
          hint.textContent = p === 'granted'
            ? 'Pengingat muncul sebagai notifikasi selama QuranKu terbuka atau berjalan di latar; jika browser tertutup, ia dapat muncul saat dibuka kembali.'
            : 'Izin notifikasi belum diberikan. Catatan tetap tersimpan, tetapi notifikasi tidak akan muncul.'
        })
        $('[data-form]', el).addEventListener('submit', (e) => {
          e.preventDefault()
          if (!text.value.trim()) return text.focus()
          const saved = saveNote(key, { id: editing, text: text.value, remind: remind.checked, time: time.value })
          if (!saved) return toast('Catatan tidak dapat disimpan (maksimal 20 catatan per tanggal).')
          toast(editing ? 'Catatan diperbarui' : 'Catatan disimpan')
          reset()
          refresh()
        })
        el.addEventListener('click', (e) => {
          const del = e.target.closest('[data-del]')
          if (del) {
            deleteNote(key, del.dataset.del)
            if (editing === del.dataset.del) reset()
            refresh()
            return toast('Catatan dihapus')
          }
          const ed = e.target.closest('[data-edit]')
          if (ed) {
            const n = notesOf(key).find((x) => x.id === ed.dataset.edit)
            if (!n) return
            editing = n.id
            text.value = n.text
            remind.checked = n.remind
            time.value = n.time
            time.disabled = !n.remind
            label.textContent = 'Perbarui'
            text.focus()
          }
        })
      }
    })
  }

  body.addEventListener('click', (e) => {
    const day = e.target.closest('[data-day]')
    if (day) return openDay(day.dataset.day)
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
  return () => sheet && sheet.close()
}
