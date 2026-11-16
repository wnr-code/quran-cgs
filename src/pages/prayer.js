import { pageHeader, emptyState } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { locationPickerHtml, bindLocationPicker } from '../components/location-picker.js'
import { getPrayerTimes, METHODS } from '../api/prayer-api.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { notifPermission } from '../services/notification.js'
import { ADZAN_VOICES, PRAYERS, IMSAK_BEFORE, TARHIM_BEFORE, enableAdzan, disableAdzan, playAdzan, stopAdzan, adzanPlaying, pushSupported, isRamadan } from '../services/adzan.js'
import { formatClock, formatGregorian } from '../utils/format.js'
import { isNativePlatform } from '../services/platform.js'
import { formatHijri } from '../utils/hijri.js'
import { $, esc, toast, on } from '../utils/helpers.js'

function adzanCard(s) {
  const a = s.adzan
  const perm = notifPermission()
  const native = isNativePlatform()
  const status = !a.enabled
    ? ''
    : native
      ? `<p class="adzan-status warn">${icon('info')}Pada aplikasi Android, adzan otomatis berjalan selama QuranKu terbuka. Pengingat saat aplikasi ditutup belum tersedia.</p>`
      : perm !== 'granted'
      ? `<p class="adzan-status warn">${icon('info')}Izin notifikasi belum diberikan — adzan hanya berbunyi selama aplikasi terbuka.</p>`
      : pushSupported()
        ? `<p class="adzan-status ok">${icon('check')}Pemberitahuan tetap dikirim saat aplikasi ditutup.</p>`
        : `<p class="adzan-status warn">${icon('info')}Peramban ini tidak mendukung pemberitahuan saat aplikasi ditutup.</p>`
  return `<section class="card adzan-card">
    <div class="adzan-head"><span class="shortcut-ic">${icon('mosque')}</span><div><h3>Adzan otomatis</h3><p class="muted">Berbunyi tiap masuk waktu salat</p></div>
      <label class="switch" aria-label="Adzan otomatis"><input type="checkbox" data-adzan="enabled" ${a.enabled ? 'checked' : ''} /></label></div>
    ${status}
    <div class="adzan-body" ${a.enabled ? '' : 'hidden'}>
      <div class="adzan-chips" role="group" aria-label="Waktu salat yang berbunyi">${PRAYERS.map(([k, l]) => `<label class="chip-toggle"><input type="checkbox" data-adzan="${k}" ${a[k] !== false ? 'checked' : ''} /><span>${l}</span></label>`).join('')}</div>
      <label class="switch-row"><span>Putar suara adzan<small>${native ? 'Selama aplikasi terbuka' : 'Saat aplikasi terbuka atau aktif di latar belakang'}</small></span><input type="checkbox" data-adzan="sound" ${a.sound ? 'checked' : ''} /></label>
      <label class="field"><span>Suara adzan</span>
        <div class="input-row"><select data-adzan-voice>${Object.entries(ADZAN_VOICES).map(([k, l]) => `<option value="${k}" ${k === a.voice ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <button class="btn" data-adzan-test>${icon('play')}<span>Coba</span></button></div></label>
      <p class="eyebrow adzan-sub">Bulan Ramadan${isRamadan() ? ' · sedang berlangsung' : ''}</p>
      <label class="switch-row"><span>Pengingat Imsak<small>${IMSAK_BEFORE} menit sebelum Subuh</small></span><input type="checkbox" data-adzan="imsak" ${a.imsak ? 'checked' : ''} /></label>
      <label class="switch-row"><span>Pengingat Tarhim<small>${TARHIM_BEFORE} menit sebelum Subuh</small></span><input type="checkbox" data-adzan="tarhim" ${a.tarhim ? 'checked' : ''} /></label>
      <p class="hint">${native ? 'Di Android, suara adzan dan pengingat tampil sebagai pesan di dalam aplikasi selama QuranKu terbuka; tidak ada notifikasi sistem atau alarm saat aplikasi ditutup. ' : 'Saat aplikasi ditutup, pemberitahuan memakai nada perangkat — ketuk untuk memutar adzan. '}${native ? 'Imsak dan tarhim juga hanya tampil saat aplikasi terbuka' : 'Imsak & tarhim berupa pemberitahuan'} dan hanya aktif pada bulan Ramadan. Suara adzan: aladhan.com.</p>
    </div></section>`
}

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
      ${adzanCard(s)}
      ${locationPickerHtml()}
      <section class="card"><label class="field"><span>Metode perhitungan</span><select data-method>${Object.entries(METHODS).map(([k, m]) => `<option value="${k}" ${k === s.prayerMethod ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></label>
</section>`
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
    } else if (t.matches('[data-adzan-voice]')) {
      saveSettings({ adzan: { voice: t.value } })
      if (adzanPlaying()) playAdzan('uji')
    } else if (t.matches('[data-adzan]')) {
      const key = t.dataset.adzan
      if (key !== 'enabled') return void saveSettings({ adzan: { [key]: t.checked } })
      if (!t.checked) {
        await disableAdzan()
        toast('Adzan otomatis dimatikan')
        return render()
      }
      if (!getSettings().location) {
        t.checked = false
        return toast('Pilih lokasi terlebih dahulu.')
      }
      t.disabled = true
      const r = await enableAdzan()
      toast(r.push === 'ok' ? 'Adzan otomatis aktif — pemberitahuan uji dikirim' : r.push === 'denied' ? 'Aktif. Izinkan notifikasi agar tetap diingatkan saat aplikasi ditutup.' : 'Adzan otomatis aktif (selama aplikasi terbuka)', 3600)
      render()
    }
  })
  body.addEventListener('click', (e) => {
    if (!e.target.closest('[data-adzan-test]')) return
    if (adzanPlaying()) stopAdzan()
    else playAdzan('uji')
  })
  const offAdzan = on('adzan:state', (st) => {
    const b = $('[data-adzan-test]', body)
    if (b) b.innerHTML = `${icon(st.playing ? 'stop' : 'play')}<span>${st.playing ? 'Henti' : 'Coba'}</span>`
  })
  render()
  timer = setInterval(() => {
    // Perbarui hitung mundur tanpa mengganggu interaksi form
    if (!document.activeElement || !body.contains(document.activeElement) || document.activeElement.tagName === 'BUTTON') render()
  }, 60000)
  return () => {
    clearInterval(timer)
    offAdzan()
  }
}
