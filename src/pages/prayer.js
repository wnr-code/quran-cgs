import { pageHeader, emptyState } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { locationPickerHtml, bindLocationPicker } from '../components/location-picker.js'
import { getPrayerTimes, METHODS } from '../api/prayer-api.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { notifPermission, requestNotifPermission } from '../services/notification.js'
import { ADZAN_VOICES, PRAYERS, IMSAK_BEFORE, TARHIM_BEFORE, enableAdzan, disableAdzan, enablePrayerReminders, disablePrayerReminders, enableImsakNotifications, disableImsakNotifications, playAdzan, stopAdzan, adzanPlaying, pushSupported, isRamadan } from '../services/adzan.js'
import { getNativePrayerStatus, requestExactAlarmAccess, openAndroidNotificationSettings, syncAndroidPrayerNotifications } from '../services/prayer-notifications.js'
import { formatClock, formatGregorian } from '../utils/format.js'
import { formatCoordinates } from '../utils/location.js'
import { isAndroidApp } from '../services/platform.js'
import { formatHijri } from '../utils/hijri.js'
import { $, esc, toast, on } from '../utils/helpers.js'

const soundSelect = (attribute, value) => `<select ${attribute}>
  <option value="default" ${value === 'default' ? 'selected' : ''}>Nada notifikasi standar</option>
  <option value="alarm" ${value === 'alarm' ? 'selected' : ''}>Nada alarm perangkat</option>
  <option value="silent" ${value === 'silent' ? 'selected' : ''}>Hening</option>
</select>`

function adzanCard(s, nativeStatus) {
  const a = s.adzan
  const r = s.prayerReminders
  const ramadan = s.ramadanReminders
  const active = a.enabled || r.enabled || ramadan.imsakEnabled
  const native = isAndroidApp()
  const permission = nativeStatus?.notificationPermission || notifPermission()
  let status = ''
  if (active && native) {
    if (permission !== 'granted') {
      status = `<div class="adzan-status warn">${icon('info')}<span>Izin notifikasi Android ${permission === 'denied' ? 'ditolak' : 'belum diberikan'}. Alarm tetap tersimpan, tetapi Android tidak dapat menampilkan pemberitahuannya.</span>
        <button class="btn sm" data-${permission === 'denied' ? 'open-notification-settings' : 'request-notifications'}>${permission === 'denied' ? 'Setelan notifikasi' : 'Izinkan'}</button></div>`
    } else if (nativeStatus && !nativeStatus.exactAlarmAllowed) {
      status = `<div class="adzan-status warn">${icon('info')}<span>Izin alarm tepat belum aktif. QuranKu memakai alarm inexact; waktu dapat tertunda oleh Doze atau kebijakan perangkat.</span><button class="btn sm" data-exact-alarm>Izinkan alarm tepat</button></div>`
    } else if (nativeStatus) {
      status = `<p class="adzan-status ok">${icon('check')}Alarm Android native aktif untuk ${nativeStatus.scheduledCount || 0} peristiwa dalam jendela ${nativeStatus.windowDays || 14} hari. Jadwal diperbarui harian; Doze dan kebijakan OEM tetap dapat menunda pengiriman.</p>`
    } else {
      status = `<p class="adzan-status">${icon('info')}Memeriksa izin notifikasi dan alarm Android…</p>`
    }
  } else if (active) {
    status = permission !== 'granted'
      ? `<p class="adzan-status warn">${icon('info')}Izin notifikasi browser belum diberikan. Jadwal lokal hanya berjalan saat halaman aktif.</p>`
      : pushSupported()
        ? `<p class="adzan-status ok">${icon('check')}PWA memakai Service Worker dan Web Push untuk pemberitahuan tertutup. Pengiriman bergantung pada browser, koneksi, dan layanan push; bukan alarm presisi.</p>`
        : `<p class="adzan-status warn">${icon('info')}Browser ini tidak mendukung Web Push; pengingat hanya berjalan saat halaman aktif.</p>`
  }
  const prayerChecks = (attribute, selected) => PRAYERS.map(([key, label]) => `<label class="chip-toggle"><input type="checkbox" ${attribute}="${key}" ${selected[key] !== false ? 'checked' : ''} /><span>${label}</span></label>`).join('')
  return `<section class="card adzan-card">
    <div class="adzan-head"><span class="shortcut-ic">${icon('mosque')}</span><div><h3>Azan &amp; pengingat salat</h3><p class="muted">Atur azan, imsak, dan pengingat sebelum salat</p></div></div>
    <label class="switch-row"><span>Notifikasi azan otomatis<small>Jadwalkan lima waktu salat</small></span><input type="checkbox" data-adzan="enabled" ${a.enabled ? 'checked' : ''} /></label>
    ${status}
    <div class="adzan-body" ${a.enabled ? '' : 'hidden'}>
      <p class="eyebrow">Waktu azan</p>
      <div class="adzan-chips" role="group" aria-label="Pilih waktu azan">${prayerChecks('data-adzan', a)}</div>
      <label class="switch-row"><span>Putar rekaman azan panjang<small>${native ? 'Layanan media Android dengan kontrol Hentikan; rekaman perlu internet.' : 'Saat halaman aktif; Web Push tertutup memakai nada notifikasi browser.'}</small></span><input type="checkbox" data-adzan="sound" ${a.sound ? 'checked' : ''} /></label>
      <label class="field"><span>Qari / rekaman azan</span>
        <div class="input-row"><select data-adzan-voice>${Object.entries(ADZAN_VOICES).map(([key, label]) => `<option value="${key}" ${key === a.voice ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>
        <button class="btn" data-adzan-test>${icon('play')}<span>Coba</span></button></div></label>
      <label class="field"><span>Volume pemutar azan <small>Level aplikasi, tidak mengubah volume media sistem</small></span><div class="input-row"><input type="range" min="0" max="100" step="5" value="${Math.round((Number(a.volume) || 0) * 100)}" data-adzan-volume /><output data-volume-value>${Math.round((Number(a.volume) || 0) * 100)}%</output></div></label>
      ${native ? `<label class="field"><span>Nada notifikasi azan</span>${soundSelect('data-adzan-sound', a.notificationSound || 'default')}</label>
        <label class="switch-row"><span>Getar notifikasi</span><input type="checkbox" data-adzan="vibration" ${a.vibration !== false ? 'checked' : ''} /></label>` : '<p class="hint">Nada dan getaran Web Push mengikuti pengaturan browser/perangkat; pilihan nada terpisah tersedia di APK Android.</p>'}
      <p class="eyebrow adzan-sub">Tarhim Ramadan</p>
      <label class="switch-row"><span>Tarhim<small>${TARHIM_BEFORE} menit sebelum Subuh · hanya Ramadan</small></span><input type="checkbox" data-adzan="tarhim" ${a.tarhim !== false ? 'checked' : ''} /></label>
      ${a.tarhim !== false ? (native
        ? `<label class="field"><span>Nada notifikasi tarhim</span>${soundSelect('data-tarhim-sound', a.tarhimSound || 'default')}</label>`
        : '<p class="hint">Tarhim Web Push memakai nada dan getar sesuai pengaturan browser/perangkat.</p>') : ''}
      ${native ? '<p class="hint">Android menyimpan nada notifikasi pada kanal; pengaturan kanal perangkat dapat menggantikan pilihan aplikasi.</p>' : ''}
    </div>
    <div class="prayer-reminders ramadan-reminders">
      <label class="switch-row"><span>Notifikasi imsak<small>${IMSAK_BEFORE} menit sebelum Subuh · hanya Ramadan</small></span><input type="checkbox" data-imsak-enabled ${ramadan.imsakEnabled ? 'checked' : ''} /></label>
      ${ramadan.imsakEnabled ? (native
        ? `<label class="field"><span>Nada notifikasi imsak</span>${soundSelect('data-imsak-sound', ramadan.imsakSound || 'default')}</label>
          <label class="switch-row"><span>Getar notifikasi imsak</span><input type="checkbox" data-imsak-vibration ${ramadan.vibration !== false ? 'checked' : ''} /></label>`
        : '<p class="hint">Web Push imsak memakai nada dan getar sesuai pengaturan browser/perangkat.</p>') : ''}
    </div>
    <div class="prayer-reminders">
      <label class="switch-row"><span>Pengingat sebelum salat<small>Pengingat tambahan, terpisah dari azan</small></span><input type="checkbox" data-prayer-reminder="enabled" ${r.enabled ? 'checked' : ''} /></label>
      ${r.enabled ? `<div class="adzan-body">
        <label class="field"><span>Ingatkan berapa menit sebelumnya</span><select data-reminder-lead>${[5, 10, 15, 20, 30, 45, 60].map((n) => `<option value="${n}" ${+r.leadMinutes === n ? 'selected' : ''}>${n} menit</option>`).join('')}</select></label>
        <div class="adzan-chips" role="group" aria-label="Waktu pengingat sebelum salat">${prayerChecks('data-reminder-prayer', r.prayers || {})}</div>
        ${native ? `<label class="field"><span>Nada pengingat sebelum salat</span>${soundSelect('data-reminder-sound', r.sound || 'default')}</label>
          <label class="switch-row"><span>Getar pengingat</span><input type="checkbox" data-reminder-vibration ${r.vibration !== false ? 'checked' : ''} /></label>` : '<p class="hint">Nada dan getar pengingat Web Push mengikuti pengaturan browser/perangkat.</p>'}
      </div>` : ''}
    </div>
  </section>`
}

export default function prayer(root) {
  root.innerHTML = `<div class="page">${pageHeader('Jadwal Salat')}<div data-body></div></div>`
  const body = $('[data-body]', root)
  let dayOffset = 0
  let timer
  let nativeStatus = null
  let alive = true

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
      const imsak = times.find((p) => p.key === 'imsak')
      const magrib = times.find((p) => p.key === 'magrib')
      const fastingSchedule = `<section class="card fasting-schedule" data-fasting-schedule aria-label="Jadwal imsak dan buka puasa">
          <div class="fasting-schedule-head"><span class="fasting-icon">${icon('moon')}</span><div><p class="eyebrow">Jadwal Puasa${isRamadan(date, s.hijriAdjust) ? ' · Ramadan' : ''}</p><h2>Imsak &amp; Buka Puasa</h2></div></div>
          <div class="fasting-times">
            <div class="fasting-time"><span>Imsak</span><b>${formatClock(imsak.time)}</b><small>${IMSAK_BEFORE} menit sebelum Subuh</small></div>
            <div class="fasting-time"><span>Buka puasa</span><b>${formatClock(magrib.time)}</b><small>Waktu Magrib</small></div>
          </div>
          <p class="hint">${dayOffset === 0 ? 'Hari ini' : esc(formatGregorian(date))} · Imsak dihitung ${IMSAK_BEFORE} menit sebelum Subuh; waktu berbuka mengikuti Magrib.</p></section>`
      table = `<section class="card prayer-card ornament"><p class="eyebrow">${esc(loc.name || 'Lokasi')}</p>
          <p class="prayer-coordinates">${icon('pin')}<span>${esc(formatCoordinates(loc))}</span></p>
          <div class="hero-date-line" role="group" aria-label="Tanggal Masehi dan Hijriah">
            <span class="hero-date-item">${icon('calendar')}<span class="hero-date-text">${esc(formatGregorian(date))}</span></span>
            <span class="hero-date-separator" aria-hidden="true">·</span>
            <span class="hero-date-item">${icon('moon')}<span class="hero-date-text">${esc(formatHijri(date, s.hijriAdjust))}</span></span>
          </div>${countdown}
          <div class="day-nav"><button class="icon-btn on-dark" data-day="-1" aria-label="Hari sebelumnya">${icon('back')}</button><button class="btn sm on-dark" data-day="0">Hari ini</button><button class="icon-btn on-dark" data-day="1" aria-label="Hari berikutnya">${icon('forward')}</button></div></section>
        ${fastingSchedule}
        <section class="card"><ul class="prayer-list">${times.map((p) => `<li class="${p.key === nextKey ? 'next' : ''} ${p.minor ? 'minor' : ''}"><span>${p.name}</span><b>${formatClock(p.time)}</b></li>`).join('')}</ul>
          <p class="hint">Waktu ditampilkan dalam zona waktu perangkat. Hasil hisab dapat berbeda 1–2 menit dari jadwal resmi Kemenag RI/otoritas setempat; Imsak = Subuh − 10 menit.</p></section>`
    }
    body.innerHTML = `${table}
      ${adzanCard(s, nativeStatus)}
      ${locationPickerHtml()}
      <section class="card"><label class="field"><span>Metode perhitungan</span><select data-method>${Object.entries(METHODS).map(([k, m]) => `<option value="${k}" ${k === s.prayerMethod ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></label>
</section>`
  }

  bindLocationPicker(body, render)
  body.addEventListener('click', async (e) => {
    const dayButton = e.target.closest('[data-day]')
    if (dayButton) {
      dayOffset = dayButton.dataset.day === '0' ? 0 : dayOffset + +dayButton.dataset.day
      render()
      return
    }
    if (e.target.closest('[data-adzan-test]')) {
      if (adzanPlaying()) stopAdzan()
      else playAdzan('uji')
      return
    }
    if (e.target.closest('[data-request-notifications]')) {
      await requestNotifPermission()
      if (isAndroidApp()) await syncAndroidPrayerNotifications()
      nativeStatus = isAndroidApp() ? await getNativePrayerStatus() : nativeStatus
      toast(notifPermission() === 'granted' ? 'Izin notifikasi diberikan' : 'Izin notifikasi belum diberikan')
      return render()
    }
    if (e.target.closest('[data-open-notification-settings]')) {
      await openAndroidNotificationSettings().catch(() => {})
      return
    }
    if (e.target.closest('[data-exact-alarm]')) {
      await requestExactAlarmAccess()
      if (isAndroidApp()) {
        await syncAndroidPrayerNotifications()
        nativeStatus = await getNativePrayerStatus()
      }
      return render()
    }
  })
  body.addEventListener('input', (e) => {
    if (e.target.matches('[data-adzan-volume]')) {
      const output = $('[data-volume-value]', body)
      if (output) output.value = `${e.target.value}%`
    }
  })
  body.addEventListener('change', async (e) => {
    const t = e.target
    if (t.matches('[data-method]')) {
      saveSettings({ prayerMethod: t.value })
      render()
    } else if (t.matches('[data-adzan-voice]')) {
      saveSettings({ adzan: { voice: t.value } })
      if (adzanPlaying()) playAdzan('uji')
    } else if (t.matches('[data-adzan-sound]')) {
      saveSettings({ adzan: { notificationSound: t.value } })
    } else if (t.matches('[data-imsak-sound]')) {
      saveSettings({ ramadanReminders: { imsakSound: t.value } })
    } else if (t.matches('[data-imsak-enabled]')) {
      if (!t.checked) {
        await disableImsakNotifications()
        nativeStatus = isAndroidApp() ? await getNativePrayerStatus() : nativeStatus
        return render()
      }
      if (!getSettings().location) {
        t.checked = false
        return toast('Pilih lokasi terlebih dahulu.')
      }
      t.disabled = true
      const result = await enableImsakNotifications()
      toast(result.permission === 'granted' ? 'Notifikasi imsak Ramadan aktif.' : 'Pengaturan aktif, tetapi izin notifikasi belum diberikan.', 3600)
      nativeStatus = isAndroidApp() ? await getNativePrayerStatus() : nativeStatus
      render()
    } else if (t.matches('[data-imsak-vibration]')) {
      saveSettings({ ramadanReminders: { vibration: t.checked } })
    } else if (t.matches('[data-tarhim-sound]')) {
      saveSettings({ adzan: { tarhimSound: t.value } })
    } else if (t.matches('[data-adzan-volume]')) {
      saveSettings({ adzan: { volume: Math.max(0, Math.min(1, +t.value / 100)) } })
    } else if (t.matches('[data-adzan]')) {
      const key = t.dataset.adzan
      if (key !== 'enabled') {
        saveSettings({ adzan: { [key]: t.checked } })
        return render()
      }
      if (!t.checked) {
        await disableAdzan()
        toast('Notifikasi azan otomatis dimatikan')
        nativeStatus = isAndroidApp() ? await getNativePrayerStatus() : nativeStatus
        return render()
      }
      if (!getSettings().location) {
        t.checked = false
        return toast('Pilih lokasi terlebih dahulu.')
      }
      t.disabled = true
      const result = await enableAdzan()
      if (result.push === 'native') {
        toast(result.exact === 'granted' ? 'Azan Android aktif; alarm dijadwalkan untuk 14 hari ke depan.' : 'Azan aktif; alarm inexact dapat tertunda oleh Android.', 4200)
      } else if (result.push === 'denied') {
        toast('Pengaturan aktif, tetapi izin notifikasi belum diberikan.', 4200)
      } else if (result.push === 'ok') {
        toast('Azan otomatis aktif — Web Push terdaftar.', 3600)
      } else {
        toast('Azan aktif; pemberitahuan tertutup tidak tersedia di browser ini.', 4200)
      }
      nativeStatus = isAndroidApp() ? await getNativePrayerStatus() : nativeStatus
      render()
    } else if (t.matches('[data-prayer-reminder]')) {
      const key = t.dataset.prayerReminder
      if (key !== 'enabled') return
      if (!t.checked) {
        await disablePrayerReminders()
        nativeStatus = isAndroidApp() ? await getNativePrayerStatus() : nativeStatus
        return render()
      }
      if (!getSettings().location) {
        t.checked = false
        return toast('Pilih lokasi terlebih dahulu.')
      }
      t.disabled = true
      const result = await enablePrayerReminders()
      toast(result.permission === 'granted'
        ? 'Pengingat sebelum salat aktif.'
        : 'Pengaturan aktif, tetapi izin notifikasi belum diberikan.', 3600)
      nativeStatus = isAndroidApp() ? await getNativePrayerStatus() : nativeStatus
      render()
    } else if (t.matches('[data-reminder-prayer]')) {
      saveSettings({ prayerReminders: { prayers: { [t.dataset.reminderPrayer]: t.checked } } })
      render()
    } else if (t.matches('[data-reminder-lead]')) {
      saveSettings({ prayerReminders: { leadMinutes: +t.value } })
    } else if (t.matches('[data-reminder-sound]')) {
      saveSettings({ prayerReminders: { sound: t.value } })
    } else if (t.matches('[data-reminder-vibration]')) {
      saveSettings({ prayerReminders: { vibration: t.checked } })
    }
  })
  const offAdzan = on('adzan:state', (st) => {
    const b = $('[data-adzan-test]', body)
    if (b) b.innerHTML = `${icon(st.playing ? 'stop' : 'play')}<span>${st.playing ? 'Henti' : 'Coba'}</span>`
  })
  const refreshStatus = async () => {
    if (!isAndroidApp()) return
    nativeStatus = await getNativePrayerStatus()
    if (alive) render()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') refreshStatus()
  }
  document.addEventListener('visibilitychange', onVisibility)
  render()
  if (isAndroidApp()) refreshStatus()
  timer = setInterval(() => {
    // Perbarui hitung mundur tanpa mengganggu interaksi form
    if (!document.activeElement || !body.contains(document.activeElement) || document.activeElement.tagName === 'BUTTON') render()
  }, 60000)
  return () => {
    alive = false
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    offAdzan()
  }
}
