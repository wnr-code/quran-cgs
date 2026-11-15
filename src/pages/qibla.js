import { pageHeader, emptyState } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { locationPickerHtml, bindLocationPicker } from '../components/location-picker.js'
import { qiblaBearing, distanceToKaaba, startCompass } from '../services/qibla.js'
import { getSettings } from '../services/storage.js'
import { $, esc, toast } from '../utils/helpers.js'

const cardinal = (deg) => ['Utara', 'Timur Laut', 'Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut'][Math.round(deg / 45) % 8]

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
      <section class="card qibla-card">
        <div class="compass" data-compass aria-label="Kompas kiblat">
          <div class="compass-dial" data-dial>
            <span class="c-n">U</span><span class="c-e">T</span><span class="c-s">S</span><span class="c-w">B</span>
            <div class="qibla-needle" style="transform:rotate(${bearing}deg)"><i></i><span>🕋</span></div>
          </div>
          <div class="compass-pointer"></div>
        </div>
        <h2>${bearing.toFixed(1)}° <small class="muted">dari Utara sejati (${cardinal(bearing)})</small></h2>
        <p class="muted">${esc(loc.name || '')} · jarak ke Ka’bah ± ${Math.round(dist).toLocaleString('id-ID')} km</p>
        <p class="compass-status" data-status>Kompas belum aktif. Dial menunjukkan arah kiblat relatif terhadap Utara (atas).</p>
        <div class="btn-row"><button class="btn btn-primary" data-start>${icon('compass')}Aktifkan kompas</button></div>
        <details><summary>Kalibrasi & akurasi</summary><p class="hint">Gerakkan ponsel membentuk angka 8 beberapa kali, jauhkan dari logam/magnet, dan pegang mendatar. Sensor ponsel mengukur utara magnetik sehingga dapat menyimpang beberapa derajat dari utara sejati; gunakan sebagai panduan dan verifikasi dengan arah kiblat masjid setempat.</p></details>
      </section>${locationPickerHtml()}`
  }

  bindLocationPicker(body, render)
  body.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-start]')) return
    const status = $('[data-status]', body)
    const dial = $('[data-dial]', body)
    try {
      if (stop) stop()
      let seen = false
      stop = await startCompass((heading, acc) => {
        seen = true
        dial.style.transform = `rotate(${-heading}deg)`
        const diff = Math.abs(((bearing - heading + 540) % 360) - 180)
        const aligned = diff < 4
        $('[data-compass]', body).classList.toggle('aligned', aligned)
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
