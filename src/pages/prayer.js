import { pageHeader, emptyState } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { locationPickerHtml, bindLocationPicker } from '../components/location-picker.js'
import { getPrayerTimes, METHODS } from '../api/prayer-api.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { requestNotifPermission, notifSupported } from '../services/notification.js'
import { formatClock, formatGregorian } from '../utils/format.js'
import { formatHijri } from '../utils/hijri.js'
import { $, esc, toast } from '../utils/helpers.js'

export default function prayer(root) {
  root.innerHTML = `<div class="page">${pageHeader('Jadwal Salat')}<div data-body></div></div>`
  const body = $('[data-body]', root)
  let dayOffset = 0
  let timer

  function render() {
    const s = getSettings()
    const loc = s.location
    const date = new Date()
    date.setDate(date.getDate() + dayOffset)
    let table = emptyState('pin', 'Pilih lokasi terlebih dahulu', 'Jadwal dihitung langsung di perangkat berdasarkan koordinat lokasi.')
    if (loc) {
      const now = new Date()
      const times = getPrayerTimes(loc, date, s.prayerMethod)
      const nextKey = dayOffset === 0 ? (times.find((p) => !p.minor && p.time > now) || {}).key : null
      const next = times.find((p) => p.key === nextKey)
      let countdown = ''
      if (next) {
        const mins = Math.max(0, Math.round((next.time - now) / 60000))
        countdown = `<p class="np-sub">${next.name} dalam ${Math.floor(mins / 60) ? Math.floor(mins / 60) + ' jam ' : ''}${mins % 60} menit</p>`
      }
      table = `<section class="card prayer-card ornament"><p class="eyebrow">${esc(loc.name || 'Lokasi')}</p>
          <h2>${esc(formatGregorian(date))}</h2><p class="np-sub">${esc(formatHijri(date, s.hijriAdjust))}</p>${countdown}
          <div class="day-nav"><button class="icon-btn on-dark" data-day="-1" aria-label="Hari sebelumnya">${icon('back')}</button><button class="btn sm on-dark" data-day="0">Hari ini</button><button class="icon-btn on-dark" data-day="1" aria-label="Hari berikutnya">${icon('forward')}</button></div></section>
        <section class="card"><ul class="prayer-list">${times.map((p) => `<li class="${p.key === nextKey ? 'next' : ''} ${p.minor ? 'minor' : ''}"><span>${p.name}</span><b>${formatClock(p.time)}</b></li>`).join('')}</ul>
          <p class="hint">Waktu ditampilkan dalam zona waktu perangkat. Hasil hisab dapat berbeda 1–2 menit dari jadwal resmi Kemenag RI/otoritas setempat; Imsak = Subuh − 10 menit.</p></section>`
    }
    body.innerHTML = `${table}
      ${locationPickerHtml()}
      <section class="card"><label class="field"><span>Metode perhitungan</span><select data-method>${Object.entries(METHODS).map(([k, m]) => `<option value="${k}" ${k === s.prayerMethod ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></label>
        <label class="switch-row"><span>Pengingat waktu salat</span><input type="checkbox" data-rem ${s.reminders.prayer ? 'checked' : ''} /></label>
        <p class="hint">Pengingat hanya muncul selama QuranKu terbuka atau masih aktif di latar belakang (tanpa server push).</p></section>`
  }

  bindLocationPicker(body, render)
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]')
    if (!b) return
    dayOffset = b.dataset.day === '0' ? 0 : dayOffset + +b.dataset.day
    render()
  })
  body.addEventListener('change', async (e) => {
    const t = e.target
    if (t.matches('[data-method]')) {
      saveSettings({ prayerMethod: t.value })
      render()
    } else if (t.matches('[data-rem]')) {
      if (t.checked) {
        if (!getSettings().location) {
          t.checked = false
          return toast('Pilih lokasi terlebih dahulu.')
        }
        if (!notifSupported() || (await requestNotifPermission()) !== 'granted') {
          t.checked = false
          return toast('Notifikasi tidak didukung atau izin ditolak.')
        }
      }
      saveSettings({ reminders: { prayer: t.checked } })
      toast(t.checked ? 'Pengingat salat aktif' : 'Pengingat salat dimatikan')
    }
  })
  render()
  timer = setInterval(() => {
    // Perbarui hitung mundur tanpa mengganggu interaksi form
    if (!document.activeElement || !body.contains(document.activeElement) || document.activeElement.tagName === 'BUTTON') render()
  }, 60000)
  return () => clearInterval(timer)
}
