import { pageHeader, emptyState } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { locationPickerHtml, bindLocationPicker } from '../components/location-picker.js'
import { qiblaBearing, distanceToKaaba, startCompass } from '../services/qibla.js'
import { getSettings } from '../services/storage.js'
import { $, esc, toast } from '../utils/helpers.js'

const cardinal = (deg) => ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'][Math.round(deg / 45) % 8]

/** Piringan kompas (SVG): garis derajat, angka tiap 30°, mata angin, dan penanda Ka’bah pada arah kiblat. */
function dialSvg(bearing) {
  const ticks = []
  for (let d = 0; d < 360; d += 5) {
    const major = d % 30 === 0
    ticks.push(`<line x1="100" y1="${major ? 4.5 : 6.5}" x2="100" y2="${major ? 11 : 10}" transform="rotate(${d} 100 100)" class="${major ? 'tk major' : 'tk'}"/>`)
  }
  const nums = []
  for (let d = 30; d < 360; d += 30) if (d % 90) nums.push(`<text x="100" y="31" transform="rotate(${d} 100 100)" class="num">${d}</text>`)
  const card = [['U', 0], ['T', 90], ['S', 180], ['B', 270]].map(([l, d]) => `<text x="100" y="36" transform="rotate(${d} 100 100)" class="card${d === 0 ? ' north' : ''}">${l}</text>`).join('')
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Piringan kompas">
    <circle cx="100" cy="100" r="97" class="ring-out"/><circle cx="100" cy="100" r="88" class="ring-in"/><circle cx="100" cy="100" r="52" class="ring-core"/>
    ${ticks.join('')}${nums.join('')}${card}
    <path d="M100 4 L105 13 L95 13 Z" class="north-tip"/>
    <g transform="rotate(${bearing} 100 100)" class="qibla-mark">
      <line x1="100" y1="100" x2="100" y2="50" class="qibla-line"/>
      <path d="M100 40 L107 54 L100 50 L93 54 Z" class="qibla-arrow"/>
      <g transform="translate(100 24)"><circle r="12" class="kaaba-bg"/><rect x="-6" y="-6" width="12" height="12" rx="1.5" class="kaaba"/><rect x="-6" y="-3.2" width="12" height="2" class="kaaba-band"/></g>
    </g>
  </svg>`
}

export default function qibla(root) {
  root.innerHTML = `<div class="page">${pageHeader('Arah Kiblat')}<div data-body></div></div>`
  const body = $('[data-body]', root)
  let stop = null
  let bearing = 0

  function render() {
    if (stop) stop(), (stop = null)
    const loc = getSettings().location
    if (!loc) {
      body.innerHTML = emptyState('compass', 'Pilih lokasi terlebih dahulu', 'Arah kiblat dihitung dari koordinat Anda ke Ka’bah (21.4225° LU, 39.8262° BT).') + locationPickerHtml()
      return
    }
    bearing = qiblaBearing(loc.lat, loc.lng)
    const dist = distanceToKaaba(loc.lat, loc.lng)
    body.innerHTML = `
      <section class="card qibla-card ornament">
        <p class="eyebrow">${esc(loc.name || 'Lokasi Anda')}</p>
        <div class="compass" data-compass aria-label="Kompas kiblat">
          <div class="compass-glow" aria-hidden="true"></div>
          <div class="compass-dial" data-dial>${dialSvg(bearing)}</div>
          <div class="compass-pointer" aria-hidden="true"></div>
          <div class="compass-hub"><b data-deg>${Math.round(bearing)}°</b><small data-hub>kiblat</small></div>
        </div>
        <p class="compass-status" data-status>Kompas belum aktif. Tanda Ka’bah menunjukkan arah kiblat terhadap Utara (atas).</p>
        <div class="btn-row"><button class="btn btn-primary" data-start>${icon('compass')}Aktifkan kompas</button></div>
      </section>
      <section class="qibla-stats">
        <div class="card"><span class="shortcut-ic">${icon('compass')}</span><b>${bearing.toFixed(1)}°</b><small>dari Utara sejati</small></div>
        <div class="card"><span class="shortcut-ic">${icon('target')}</span><b>${cardinal(bearing)}</b><small>arah mata angin</small></div>
        <div class="card"><span class="shortcut-ic">${icon('pin')}</span><b>${Math.round(dist).toLocaleString('id-ID')} km</b><small>jarak ke Ka’bah</small></div>
      </section>
      <section class="card"><details class="qibla-help"><summary>${icon('info')}Kalibrasi & akurasi</summary><p class="hint">Gerakkan ponsel membentuk angka 8 beberapa kali, jauhkan dari logam/magnet, dan pegang mendatar. Sensor ponsel mengukur utara magnetik sehingga dapat menyimpang beberapa derajat dari utara sejati; gunakan sebagai panduan dan verifikasi dengan arah kiblat masjid setempat.</p></details></section>
      ${locationPickerHtml()}`
  }

  bindLocationPicker(body, render)
  body.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-start]')) return
    const status = $('[data-status]', body)
    const dial = $('[data-dial]', body)
    try {
      if (stop) stop()
      let seen = false
      let rot = 0
      let wasAligned = false
      stop = await startCompass((heading, acc) => {
        seen = true
        // Putar lewat jalur terpendek agar piringan tidak berputar balik saat melewati 0°/360°.
        rot += ((-heading - rot + 540) % 360) - 180
        dial.style.transform = `rotate(${rot}deg)`
        const diff = Math.abs(((bearing - heading + 540) % 360) - 180)
        const aligned = diff < 4
        $('[data-compass]', body).classList.toggle('aligned', aligned)
        $('[data-compass]', body).classList.add('live')
        $('[data-deg]', body).textContent = `${Math.round(heading)}°`
        $('[data-hub]', body).textContent = aligned ? 'tepat kiblat' : 'arah ponsel'
        if (aligned && !wasAligned && navigator.vibrate) navigator.vibrate(40)
        wasAligned = aligned
        status.textContent = aligned ? 'Anda menghadap kiblat.' : `Arah ponsel ${Math.round(heading)}° · putar ${((bearing - heading + 360) % 360) < 180 ? 'ke kanan' : 'ke kiri'} ${Math.round(diff)}°${acc != null && acc > 20 ? ' · akurasi rendah, lakukan kalibrasi' : ''}`
      })
      status.textContent = 'Menunggu data sensor…'
      setTimeout(() => {
        if (!seen && status.isConnected) status.textContent = 'Sensor kompas tidak memberikan data pada perangkat ini. Gunakan angka derajat di atas dengan kompas lain.'
      }, 3500)
    } catch (err) {
      toast(err.message)
      status.textContent = err.message
    }
  })
  render()
  return () => stop && stop()
}
