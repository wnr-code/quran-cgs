import { pageHeader } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { GOAL_TYPES, goalPages, todayProgress, lastDays, streak } from '../services/progress.js'
import { requestNotifPermission, notifSupported } from '../services/notification.js'
import { isNativePlatform } from '../services/platform.js'
import { $, esc, toast } from '../utils/helpers.js'

export default async function goal(root) {
  root.innerHTML = `<div class="page">${pageHeader('Target Tilawah')}<div data-body></div></div>`
  const body = $('[data-body]', root)

  async function render() {
    const s = getSettings()
    const native = isNativePlatform()
    const target = goalPages(s.goal)
    const [today, days30] = await Promise.all([todayProgress(), lastDays(30)])
    const week = days30.slice(-7)
    const sum = (arr, k) => arr.reduce((a, b) => a + b[k], 0)
    const max = Math.max(target, ...week.map((d) => d.pages), 1)
    const done = days30.filter((d) => d.pages >= target).reverse()
    const dayName = (k) => new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(new Date(k + 'T12:00:00'))
    const dateLabel = (k) => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(k + 'T12:00:00'))
    body.innerHTML = `
      <section class="card"><p class="eyebrow">Hari ini</p>
        <h2>${today.pages} / ${target} halaman · ${today.ayahs} ayat</h2>
        <div class="bar"><i style="width:${Math.min(100, (today.pages / target) * 100)}%"></i></div>
        <p class="hint">Halaman dihitung selesai ketika ayat terakhir pada halaman mushaf tersebut terbaca di mode baca. Target hanyalah motivasi pribadi dan tidak dikirim ke mana pun.</p></section>
      <section class="card"><p class="eyebrow">Pilih target harian</p>
        <div class="option-list">${Object.entries(GOAL_TYPES).map(([k, g]) => `<label class="option"><input type="radio" name="goal" value="${k}" ${s.goal.type === k ? 'checked' : ''}/><span>${esc(g.label)}</span></label>`).join('')}</div>
        <label class="field inline" data-custom ${s.goal.type === 'custom' ? '' : 'hidden'}><span>Halaman per hari</span><input type="number" min="1" max="604" inputmode="numeric" value="${s.goal.type === 'custom' ? target : 3}" data-custom-input /></label></section>
      <section class="card"><p class="eyebrow">7 hari terakhir</p>
        <div class="chart" role="img" aria-label="Grafik halaman per hari">${week.map((d) => `<div class="chart-col"><span class="chart-val">${d.pages}</span><i class="${d.pages >= target ? 'ok' : ''}" style="height:${Math.max(3, (d.pages / max) * 100)}%"></i><small>${dayName(d.date)}</small></div>`).join('')}</div>
        <div class="stat-grid">
          <div><b>${sum(week, 'pages')}</b><small>halaman minggu ini</small></div>
          <div><b>${sum(days30, 'pages')}</b><small>halaman 30 hari</small></div>
          <div><b>${sum(days30, 'ayahs')}</b><small>ayat 30 hari</small></div>
          <div><b>${streak(days30, target)}</b><small>hari beruntun</small></div>
        </div></section>
      <section class="card"><p class="eyebrow">Riwayat penyelesaian target (30 hari)</p>
        ${done.length ? `<ul class="plain-list">${done.map((d) => `<li>${icon('check')}<span>${esc(dateLabel(d.date))}</span><b>${d.pages} hlm</b></li>`).join('')}</ul>` : '<p class="muted">Belum ada hari yang mencapai target. Semangat!</p>'}</section>
      <section class="card"><p class="eyebrow">Pengingat</p>
        <label class="switch-row"><span>Pengingat tilawah harian</span><input type="checkbox" data-rem="tilawah" ${s.reminders.tilawah ? 'checked' : ''}/></label>
        <label class="field inline"><span>Jam pengingat</span><input type="time" data-time value="${esc(s.reminders.tilawahTime)}" /></label>
        <label class="switch-row"><span>Ingatkan bila target belum tercapai (20.30)</span><input type="checkbox" data-rem="goal" ${s.reminders.goal ? 'checked' : ''}/></label>
        <p class="hint">${native ? 'Di aplikasi Android, pengingat muncul sebagai pesan di dalam aplikasi selama QuranKu terbuka; alarm native terjadwal hanya untuk waktu salat.' : 'Pengingat lokal berjalan selama browser/PWA aktif; notifikasi di background bergantung pada dukungan dan pengaturan browser.'}</p></section>`
  }

  body.addEventListener('change', async (e) => {
    const t = e.target
    if (t.name === 'goal') {
      saveSettings({ goal: { type: t.value, pages: t.value === 'custom' ? parseInt($('[data-custom-input]', body).value, 10) || 3 : GOAL_TYPES[t.value].pages } })
      return render()
    }
    if (t.matches('[data-custom-input]')) {
      saveSettings({ goal: { type: 'custom', pages: Math.max(1, Math.min(604, parseInt(t.value, 10) || 1)) } })
      return render()
    }
    if (t.matches('[data-time]') && /^\d{2}:\d{2}$/.test(t.value)) return saveSettings({ reminders: { tilawahTime: t.value } })
    if (t.dataset.rem) {
      if (t.checked) {
        if (!notifSupported()) {
          t.checked = false
          return toast('Perangkat/browser ini tidak mendukung notifikasi.')
        }
        const p = isNativePlatform() ? 'foreground' : await requestNotifPermission()
        if (p !== 'granted' && p !== 'foreground') {
          t.checked = false
          return toast('Izin notifikasi tidak diberikan.')
        }
      }
      saveSettings({ reminders: { [t.dataset.rem]: t.checked } })
      toast(t.checked ? 'Pengingat diaktifkan' : 'Pengingat dimatikan')
    }
  })
  render()
}
