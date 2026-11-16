// Pemilihan lokasi bersama (jadwal salat & kiblat): GPS (izin diminta saat tombol ditekan), kota, atau manual.
import { icon } from './icons.js'
import { CITIES } from '../data/cities.js'
import { getSettings, saveSettings } from '../services/storage.js'
import { getCurrentPosition } from '../api/prayer-api.js'
import { parseCoord } from '../utils/validation.js'
import { isNativePlatform } from '../services/platform.js'
import { esc, toast } from '../utils/helpers.js'

export function locationPickerHtml() {
  const loc = getSettings().location
  return `<section class="card loc-picker"><p class="eyebrow">Lokasi</p>
    <p class="loc-now">${icon('pin')}<span>${loc ? `${esc(loc.name || 'Lokasi')} <small class="muted">(${loc.lat}, ${loc.lng})</small>` : 'Belum dipilih'}</span></p>
    <div class="btn-row"><button class="btn btn-primary" data-loc-gps>${icon('pin')}Gunakan lokasi saya</button></div>
    <label class="field"><span>Atau pilih kota</span><select data-loc-city><option value="">— pilih kota —</option>${CITIES.map((c, i) => `<option value="${i}" ${loc && loc.name === c.name ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
    <details><summary>Input koordinat manual</summary>
      <form data-loc-manual class="input-row"><input name="lat" placeholder="Lintang, mis. -6.9764" inputmode="decimal" required /><input name="lng" placeholder="Bujur, mis. 108.4836" inputmode="decimal" required /><button class="btn">Simpan</button></form></details>
    <p class="hint">${isNativePlatform() ? 'Lokasi disimpan di perangkat dan dipakai untuk perhitungan lokal; Android tidak mengirimnya ke server QuranKu.' : 'Lokasi dipakai untuk perhitungan lokal. Jika Anda menyalakan Adzan otomatis berbasis Web Push, koordinat dibulatkan ±1 km dan disimpan di server agar jadwal pemberitahuan dapat dihitung.'}</p></section>`
}

export function bindLocationPicker(root, onChange) {
  const set = (loc) => {
    saveSettings({ location: loc })
    onChange(loc)
  }
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-loc-gps]')
    if (!b) return
    b.disabled = true
    try {
      set(await getCurrentPosition())
      toast('Lokasi diperbarui')
    } catch (err) {
      toast(err.message)
      b.disabled = false
    }
  })
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-loc-city]') && e.target.value !== '') set({ ...CITIES[+e.target.value] })
  })
  root.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-loc-manual]')) return
    e.preventDefault()
    const c = parseCoord(e.target.lat.value, e.target.lng.value)
    if (!c) return toast('Koordinat tidak valid')
    set({ ...c, name: 'Koordinat manual' })
  })
}
