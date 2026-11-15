import { pageHeader, skeleton } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { DOA_QURAN } from '../data/ayat-pilihan.js'
import { getSurah, friendlyError } from '../api/api-adapter.js'
import { getDoaHarian } from '../api/doa-api.js'
import { $, esc, debounce, copyText, toast } from '../utils/helpers.js'
import { ayahMarker } from '../utils/arabic-numbers.js'

let tab = 'quran'

export default function doa(root) {
  root.innerHTML = `<div class="page">${pageHeader('Doa Harian')}
    <div class="tabs"><button data-tab="quran">Doa dari Al-Qur'an</button><button data-tab="harian">Doa Sehari-hari</button></div>
    <div class="search-box">${icon('search')}<input type="search" placeholder="Cari doa…" aria-label="Cari doa" autocomplete="off" /></div>
    <div data-body></div></div>`
  const body = $('[data-body]', root)
  const input = $('input', root)
  let harian = null
  let harianErr = null
  const norm = (s) => String(s).toLowerCase()

  function renderQuran() {
    const q = norm(input.value)
    const items = DOA_QURAN.map((d, i) => ({ ...d, i })).filter((d) => !q || norm(d.title).includes(q))
    body.innerHTML = `<div class="list">${items.map((d) => `<details class="doa" data-i="${d.i}"><summary><span><strong>${esc(d.title)}</strong><small>QS. ${d.s}:${d.from}${d.to !== d.from ? '–' + d.to : ''}</small></span>${icon('down')}</summary><div class="doa-body" data-slot>${skeleton(2, 'sk-line')}</div></details>`).join('')}</div>
      <p class="hint pad">Ayat ditampilkan utuh sebagaimana sumber data Al-Qur'an; lafaz doa terdapat di dalam ayat tersebut. Referensi: nomor surah dan ayat.</p>`
  }

  async function fillQuran(det) {
    const d = DOA_QURAN[+det.dataset.i]
    const slot = $('[data-slot]', det)
    if (slot.dataset.done) return
    try {
      const surah = await getSurah(d.s)
      const ay = surah.ayat.slice(d.from - 1, d.to)
      slot.dataset.done = '1'
      slot.innerHTML = `<p class="ayah-ar" lang="ar" dir="rtl">${ay.map((a) => `${esc(a.teksArab)} <span class="ayah-num">${ayahMarker(a.nomorAyat)}</span>`).join(' ')}</p>
        <p class="ayah-latin">${ay.map((a) => esc(a.teksLatin)).join(' ')}</p>
        <p class="ayah-id">${ay.map((a) => esc(a.teksIndonesia)).join(' ')}</p>
        <p class="doa-ref">Referensi: QS. ${esc(surah.namaLatin)} ${d.s}:${d.from}${d.to !== d.from ? '–' + d.to : ''} · <a class="link" href="#/surah/${d.s}/${d.from}">Buka di mushaf</a></p>`
    } catch (e) {
      slot.innerHTML = `<p class="muted">${esc(friendlyError(e))}</p>`
    }
  }

  async function renderHarian() {
    if (!harian && !harianErr) {
      body.innerHTML = skeleton(6)
      try {
        harian = await getDoaHarian()
      } catch (e) {
        harianErr = e
      }
      if (tab !== 'harian') return
    }
    if (!harian) {
      body.innerHTML = `<div class="state">${icon('cloudOff', 'state-icon')}<h3>Doa sehari-hari belum tersedia</h3><p>Kumpulan ini dimuat dari EQuran.id dan belum dapat diambil saat ini. QuranKu tidak menulis sendiri teks doa agar terjaga keasliannya. Gunakan tab “Doa dari Al-Qur'an” yang tersedia offline setelah surahnya tersimpan.</p><button class="btn btn-primary" data-retry>${icon('refresh')}Coba lagi</button></div>`
      return
    }
    const q = norm(input.value)
    const items = harian.filter((d) => !q || norm(d.nama).includes(q) || norm(d.grup).includes(q) || norm(d.idn).includes(q))
    body.innerHTML = `<div class="list">${items.map((d) => `<details class="doa"><summary><span><strong>${esc(d.nama)}</strong>${d.grup ? `<small>${esc(d.grup)}</small>` : ''}</span>${icon('down')}</summary><div class="doa-body">
        <p class="ayah-ar" lang="ar" dir="rtl">${esc(d.ar)}</p>${d.tr ? `<p class="ayah-latin">${esc(d.tr)}</p>` : ''}${d.idn ? `<p class="ayah-id">${esc(d.idn)}</p>` : ''}
        ${d.tentang ? `<p class="doa-ref">Referensi: ${esc(d.tentang)}</p>` : '<p class="doa-ref">Referensi tidak disertakan oleh sumber data.</p>'}
        <button class="btn sm" data-copy="${esc(d.id)}">${icon('copy')}Salin</button></div></details>`).join('') || '<p class="muted pad">Tidak ditemukan.</p>'}</div>
      <p class="hint pad">Sumber: EQuran.id (${harian.length} doa), ditampilkan apa adanya.</p>`
  }

  const render = () => {
    root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab))
    tab === 'quran' ? renderQuran() : renderHarian()
  }
  root.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]')
    if (b) {
      tab = b.dataset.tab
      render()
    }
  })
  body.addEventListener('toggle', (e) => {
    if (e.target.matches('details[data-i]') && e.target.open) fillQuran(e.target)
  }, true)
  body.addEventListener('click', async (e) => {
    if (e.target.closest('[data-retry]')) {
      harianErr = null
      return render()
    }
    const c = e.target.closest('[data-copy]')
    if (c && harian) {
      const d = harian.find((x) => String(x.id) === c.dataset.copy)
      if (d) toast((await copyText(`${d.nama}\n\n${d.ar}\n\n${d.tr}\n\n${d.idn}`)) ? 'Doa disalin' : 'Gagal menyalin')
    }
  })
  input.addEventListener('input', debounce(render, 150))
  render()
}
