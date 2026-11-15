import { pageHeader, skeleton } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { DOA_QURAN } from '../data/ayat-pilihan.js'
import { getSurah, friendlyError } from '../api/api-adapter.js'
import { getDoaHarian } from '../api/doa-api.js'
import { $, esc, debounce, copyText, toast } from '../utils/helpers.js'
import { ayahMarker } from '../utils/arabic-numbers.js'
import DZIKIR from '../data/dzikir.json'

let tab = 'quran'
const TABS = [
  ['quran', "Al-Qur'an"],
  ['harian', 'Sehari-hari'],
  ['wudhu', 'Wudhu'],
  ['salat', 'Wirid Salat']
]
/** "Dibaca 33x" → 33 (untuk penghitung ketuk); selain itu 0. */
const repeatOf = (notes) => {
  const m = /(\d+)\s*x/i.exec(notes || '')
  return m && +m[1] > 1 ? +m[1] : 0
}

export default function doa(root, { params = {} } = {}) {
  if (params.tab && TABS.some(([k]) => k === params.tab)) tab = params.tab
  root.innerHTML = `<div class="page">${pageHeader('Doa Harian')}
    <div class="tabs scroll">${TABS.map(([k, l]) => `<button data-tab="${k}">${l}</button>`).join('')}</div>
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
        ${ay.some((a) => a.teksLatin) ? `<p class="ayah-latin">${ay.map((a) => esc(a.teksLatin || '')).join(' ')}</p>` : ''}
        ${ay.some((a) => a.teksIndonesia) ? `<p class="ayah-id">${ay.map((a) => esc(a.teksIndonesia || '')).join(' ')}</p>` : ''}
        <div class="doa-foot"><p class="doa-ref">Referensi: QS. ${esc(surah.namaLatin)} ${d.s}:${d.from}${d.to !== d.from ? '–' + d.to : ''}</p><a class="btn sm" href="#/surah/${d.s}/${d.from}">${icon('book')}Buka di mushaf</a></div>`
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
        <div class="doa-foot">${d.tentang ? `<p class="doa-ref">Referensi: ${esc(d.tentang)}</p>` : '<p class="doa-ref">Referensi tidak disertakan oleh sumber data.</p>'}
        <button class="btn sm" data-copy="${esc(d.id)}">${icon('copy')}Salin</button></div></div></details>`).join('') || '<p class="muted pad">Tidak ditemukan.</p>'}</div>
      <p class="hint pad">Sumber: EQuran.id (${harian.length} doa), ditampilkan apa adanya.</p>`
  }

  /** Doa wudhu & wirid setelah salat: data tersimpan di aplikasi (offline). */
  function renderDzikir(kind) {
    const q = norm(input.value)
    const all = DZIKIR[kind]
    const items = all.map((d, i) => ({ ...d, i })).filter((d) => !q || norm(d.title).includes(q) || norm(d.translation).includes(q) || norm(d.latin).includes(q))
    const W = DZIKIR.sourceWirid
    const intro =
      kind === 'salat'
        ? 'Susunan wirid setelah salam dari salat fardu, dibaca berurutan sesuai nomornya. Ketuk penghitung untuk bacaan yang diulang.'
        : 'Bacaan sebelum berwudhu (dibaca berurutan, sebelum mencuci tangan) dan doa sesudah berwudhu.'
    body.innerHTML = `<p class="dzikir-intro">${intro}</p>
      <div class="dzikir-list">${items.map((d) => {
        const n = repeatOf(d.notes)
        return `<article class="card dzikir">
          <header><span class="dzikir-no">${d.step || d.i + 1}</span><div class="dzikir-head"><h3>${esc(d.title)}</h3>${d.notes ? `<span class="dzikir-meta">${icon('beads')}${esc(d.notes.replace(/(\d+)\s*x/gi, '$1×'))}</span>` : ''}</div></header>
          ${d.arabic ? `<div class="dzikir-ar"><p class="ayah-ar" lang="ar" dir="rtl">${esc(d.arabic)}</p></div>` : ''}
          ${d.latin ? `<p class="ayah-latin">${esc(d.latin)}</p>` : ''}
          ${d.translation ? `<p class="ayah-id">${esc(d.translation)}</p>` : ''}
          ${d.fawaid ? `<p class="dzikir-note">${icon('info')}<span>${esc(d.fawaid)}</span></p>` : ''}
          ${d.links && d.links.length ? `<div class="dzikir-links">${d.links.map((l) => `<a class="chip chip-link" href="#/surah/${l.s}/${l.a}">${icon('book')}${esc(l.label)}</a>`).join('')}</div>` : ''}
          <footer class="dzikir-foot">
            <p class="doa-ref">${d.source ? `Sumber: ${esc(d.source)}` : 'Referensi tidak disertakan oleh sumber data.'}</p>
            ${d.arabic ? `<div class="dzikir-acts">
              ${n ? `<button class="btn sm dzikir-count" data-count="${n}" data-n="0" aria-label="Penghitung bacaan">${icon('beads')}<span>0 / ${n}</span></button>` : ''}
              <button class="btn sm" data-copyz="${kind}:${d.i}">${icon('copy')}Salin</button>
            </div>` : ''}
          </footer></article>`
      }).join('') || '<p class="muted pad">Tidak ditemukan.</p>'}</div>
      ${kind === 'wudhu'
        ? `<p class="hint pad">Sumber doa sebelum berwudhu (no. 1–${DZIKIR.wudhu.filter((d) => d.from === 'nu').length}): <a class="link" href="${DZIKIR.sourceNU.url}" target="_blank" rel="noopener">${esc(DZIKIR.sourceNU.name)}</a>, artikel “Doa Sebelum Berwudhu” oleh ${esc(DZIKIR.sourceNU.author)}, yang mengutip Kitab Hasyiyatus Syarqawi karya Syekh Abdullah As-Syarqawi (Beirut, Darul Fikr: 2006) halaman 52. Teks Arab, Latin, dan arti disalin apa adanya.</p>
      <p class="hint pad">Sumber doa sesudah berwudhu: <a class="link" href="${DZIKIR.source.url}" target="_blank" rel="noopener">${esc(DZIKIR.source.name)}</a> (lisensi ${esc(DZIKIR.source.license)}), dengan rujukan riwayat pada bacaannya.</p>`
        : `<p class="hint pad">Sumber susunan dan teks Arab: <a class="link" href="${W.url}" target="_blank" rel="noopener">${esc(W.name)}</a>, artikel “${esc(W.title)}” oleh ${esc(W.author)} — rangkaian zikir susunan KH Muhammad bin Abdullah Faqih (Pondok Pesantren Langitan, Tuban) dari Majmû‘ah Maqrûât Yaumiyah wa Usbû‘iyyah. Teks Arab disalin apa adanya.</p>
      <p class="hint pad">Artikel tersebut hanya memuat teks Arab. Tulisan Latin dan arti pada zikir disusun oleh QuranKu sebagai alat bantu dan belum ditinjau ustaz; untuk ayat Al-Qur'an, arti dapat dibaca lewat tautan mushaf.</p>`}`
  }

  const render = () => {
    root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab))
    const act = root.querySelector('[data-tab].active')
    const bar = root.querySelector('.tabs')
    if (act && bar && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = act.offsetLeft - (bar.clientWidth - act.offsetWidth) / 2
    if (tab === 'quran') renderQuran()
    else if (tab === 'harian') renderHarian()
    else renderDzikir(tab)
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
    const cnt = e.target.closest('[data-count]')
    if (cnt) {
      const max = +cnt.dataset.count
      const n = +cnt.dataset.n >= max ? 0 : +cnt.dataset.n + 1
      cnt.dataset.n = n
      cnt.querySelector('span').textContent = `${n} / ${max}`
      cnt.classList.toggle('done', n >= max)
      if (n >= max && navigator.vibrate) navigator.vibrate(60)
      return
    }
    const z = e.target.closest('[data-copyz]')
    if (z) {
      const [kind, i] = z.dataset.copyz.split(':')
      const d = DZIKIR[kind][+i]
      return toast((await copyText([d.title, d.arabic, d.latin, d.translation, d.source && `(${d.source})`].filter(Boolean).join('\n\n'))) ? 'Bacaan disalin' : 'Gagal menyalin')
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
