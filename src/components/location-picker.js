// Pemilihan lokasi bersama (jadwal salat & kiblat): GPS (izin diminta saat tombol ditekan), kota, atau manual.
import { icon } from './icons.js'
import { CITIES } from '../data/cities.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { getCurrentPosition } from '../api/prayer-api.js'
import { approximatePlaceName, reverseGeocode } from '../api/reverse-geocode.js'
import { parseCoord } from '../utils/validation.js'
import { formatCoordinates } from '../utils/location.js'
import { isNativePlatform } from '../services/platform.js'
import { esc, toast } from '../utils/helpers.js'

export function locationPickerHtml() {
  const loc = getSettings().location
  const privacy = isNativePlatform()
    ? 'Lokasi disimpan di perangkat dan dipakai untuk perhitungan jadwal serta kiblat.'
    : 'Jadwal dihitung di perangkat. Jika Adzan otomatis Web Push diaktifkan, koordinat yang dibulatkan ±1 km juga disimpan di server untuk menghitung pemberitahuan.'
  return `<section class="card loc-picker"><p class="eyebrow">Lokasi</p>
    <p class="loc-now">${icon('pin')}${loc ? `<span><strong>${esc(loc.name || 'Lokasi Anda')}</strong><small class="loc-coordinates">${esc(formatCoordinates(loc))}</small></span>` : '<span>Belum dipilih</span>'}</p>
    <div class="btn-row"><button class="btn btn-primary" data-loc-gps>${icon('pin')}Gunakan lokasi saya</button></div>
    <p class="hint loc-privacy-note">Untuk menampilkan nama kota/kecamatan, koordinat GPS dikirim langsung ke OpenStreetMap Nominatim (bukan ke server QuranKu).</p>
    <label class="field"><span>Atau pilih kota</span><select data-loc-city><option value="">— pilih kota —</option>${CITIES.map((c, i) => `<option value="${i}" ${loc && loc.name === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <details><summary>Input koordinat manual</summary>
      <form data-loc-manual class="input-row"><input name="lat" placeholder="Lintang, mis. -6.9764" inputmode="decimal" required /><input name="lng" placeholder="Bujur, mis. 108.4836" inputmode="decimal" required /><button class="btn">Simpan</button></form></details>
    <p class="hint">${privacy} Nama wilayah dari <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>.</p></section>`
}

export function bindLocationPicker(root, onChange) {
  let lookupId = 0
  let gpsPending = false
  const save = (loc) => {
    saveSettings({ location: loc })
    onChange(loc)
  }
  const choose = (loc) => {
    lookupId++
    gpsPending = false
    save(loc)
  }
  const disableGpsButton = (disabled) => {
    const button = root.querySelector('[data-loc-gps]')
    if (button) button.disabled = disabled
  }

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-loc-gps]')
    if (!b || gpsPending) return
    gpsPending = true
    const id = ++lookupId
    b.disabled = true
    try {
      const position = await getCurrentPosition()
      if (id !== lookupId) return
      // Simpan dan tampilkan koordinat segera; nama kota/kecamatan diperbarui setelah reverse geocoding.
      save({ ...position, name: approximatePlaceName(position) })
      disableGpsButton(true)
      toast('Koordinat diperoleh, sedang mencari nama wilayah…', 3000)
      try {
        const name = await reverseGeocode(position)
        if (id !== lookupId) return
        save({ ...position, name })
        toast('Nama wilayah dan koordinat diperbarui')
      } catch {
        if (id !== lookupId) return
        toast('Koordinat tersimpan; nama wilayah belum dapat dimuat')
      }
    } catch (err) {
      if (id === lookupId) toast(err.message)
    } finally {
      if (id === lookupId) {
        gpsPending = false
        disableGpsButton(false)
      }
    }
  })
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-loc-city]') && e.target.value !== '') {
      const city = CITIES[+e.target.value]
      if (city) choose({ ...city })
    }
  })
  root.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-loc-manual]')) return
    e.preventDefault()
    const c = parseCoord(e.target.lat.value, e.target.lng.value)
    if (!c) return toast('Koordinat tidak valid')
    choose({ ...c, name: 'Koordinat manual' })
  })
}
