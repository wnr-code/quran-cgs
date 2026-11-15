import { pageHeader, skeleton } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { DOA_QURAN } from '../data/ayat-pilihan.js'
import { getSurah, friendlyError } from '../api/api-adapter.js'
import { getDoaHarian } from '../api/doa-api.js'
import { $, esc, debounce, copyText, toast } from '../utils/helpers.js'
import { openSheet } from '../components/modal.js'
import { APP } from '../config.js'
import { doaText, doaUrl as urlOf, shareLinks as linksOf } from '../utils/doa-share.js'

const doaUrl = (p) => urlOf(p, APP.origin)
const shareLinks = (p) => linksOf(p, APP.origin)
import { ayahMarker } from '../utils/arabic-numbers.js'
import DZIKIR from '../data/dzikir.json'

let tab = 'quran'
const TABS = [
  ['quran', "Al-Qur'an"],
  ['harian', 'Sehari-hari'],
  ['wudhu', 'Wudhu'],
  ['salat', 'Usai Salat']
]
/** Bacaan yang sudah ditandai (selama aplikasi terbuka). */
const done = { wudhu: new Set(), salat: new Set() }
const KIND_LABEL = { wirid: 'Wirid', doa: 'Doa', niat: 'Niat' }
const SECTION_CLASS = { wirid: 'wirid', doa: 'doa', niat: 'doa' }

/** Ikon font (subset Font Awesome Free, lihat public/fonts). */
const fi = (name, brand) => `<i class="fi fi-${name}${brand ? ' fib' : ''}" aria-hidden="true"></i>`

/** Pilihan tampilan (arti/latin/ukuran Arab) disimpan di perangkat. */
const VIEW_KEY = 'quranku:doa-tampilan'
const SIZES = ['Normal', 'Besar', 'Lebih besar']
const view = { arti: true, latin: true, size: 0 }
try {
  const v = JSON.parse(localStorage.getItem(VIEW_KEY) || '{}')
  if (typeof v.arti === 'boolean') view.arti = v.arti
  if (typeof v.latin === 'boolean') view.latin = v.latin
  if ([0, 1, 2].includes(v.size)) view.size = v.size
} catch {}
const saveView = () => {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view))
  } catch {}
}

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
    <div class="doa-tools" role="group" aria-label="Tampilan bacaan">
      <button class="doa-tog" data-view="arti"><i class="fi" aria-hidden="true"></i><span>Arti</span></button>
      <button class="doa-tog" data-view="latin"><i class="fi" aria-hidden="true"></i><span>Latin</span></button>
      <button class="doa-tog" data-size>${fi('text-height')}<span></span></button>
    </div>
    <div data-body></div></div>`
  const body = $('[data-body]', root)
  const input = $('input', root)
  let harian = null
  let harianErr = null
  const norm = (s) => String(s).toLowerCase()
  const quranData = new Map()

  function applyView() {
    body.classList.toggle('hide-arti', !view.arti)
    body.classList.toggle('hide-latin', !view.latin)
    body.dataset.ar = view.size
    for (const k of ['arti', 'latin']) {
      const b = $(`[data-view="${k}"]`, root)
      b.setAttribute('aria-pressed', String(view[k]))
      b.title = `${view[k] ? 'Sembunyikan' : 'Tampilkan'} ${k}`
      $('i', b).className = `fi fi-${view[k] ? 'eye' : 'eye-slash'}`
    }
    const z = $('[data-size]', root)
    z.setAttribute('aria-pressed', String(view.size > 0))
    z.title = 'Ukuran huruf Arab'
    $('span', z).textContent = `Arab: ${SIZES[view.size]}`
  }
  root.querySelector('.doa-tools').addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.view) view[b.dataset.view] = !view[b.dataset.view]
    else view.size = (view.size + 1) % SIZES.length
    saveView()
    applyView()
  })

  /** Data doa dari kunci tombol: "q:<i>" (Al-Qur'an), "h:<id>" (sehari-hari), "<wudhu|salat>:<i>". */
  function payload(key) {
    const [k, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
    if (k === 'q') return quranData.get(+id) || null
    if (k === 'h') {
      const d = harian && harian.find((x) => String(x.id) === id)
      return d ? { title: d.nama, ar: d.ar, latin: d.tr, arti: d.idn, ref: d.tentang, tab: 'harian' } : null
    }
    const d = DZIKIR[k] && DZIKIR[k][+id]
    return d ? { title: d.title, ar: d.arabic, latin: d.latin, arti: d.translation, ref: d.source, tab: k } : null
  }

  function openShare(p) {
    const L = shareLinks(p)
    const opt = (cls, href, ic, label) => `<a class="share-opt ${cls}" href="${esc(href)}" target="_blank" rel="noopener" data-net="${cls}"><span class="share-ic">${fi(ic, true)}</span>${label}</a>`
    openSheet({
      title: 'Bagikan doa',
      content: `<p class="share-title">${esc(p.title)}</p>
        <div class="share-grid">
          ${opt('wa', L.whatsapp, 'whatsapp', 'WhatsApp')}
          ${opt('tg', L.telegram, 'telegram', 'Telegram')}
          ${opt('fb', L.facebook, 'facebook', 'Facebook')}
          ${opt('x', L.x, 'x', 'X')}
          ${navigator.share ? `<button class="share-opt" data-native><span class="share-ic">${fi('more')}</span>Lainnya</button>` : ''}
          <button class="share-opt" data-copyshare><span class="share-ic">${fi('copy')}</span>Salin teks</button>
        </div>
        <p class="hint">Yang dibagikan: judul, lafaz Arab, Latin, arti, sumber, dan tautan ke QuranKu. Facebook hanya menerima tautan, jadi teks doa ikut disalin agar bisa ditempel.</p>`,
      onOpen(el, close) {
        el.addEventListener('click', async (e) => {
          if (e.target.closest('[data-net="fb"]')) {
            copyText(doaText(p)).then((ok) => ok && toast('Teks doa disalin — tempel di Facebook'))
            return close()
          }
          if (e.target.closest('[data-net]')) return close()
          if (e.target.closest('[data-copyshare]')) {
            toast((await copyText(`${doaText(p)}\n\n${doaUrl(p)}`)) ? 'Teks doa disalin' : 'Gagal menyalin')
            return close()
          }
          if (e.target.closest('[data-native]')) {
            try {
              await navigator.share({ title: p.title, text: doaText(p), url: doaUrl(p) })
              close()
            } catch {}
          }
        })
      }
    })
  }

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
      const ref = `QS. ${surah.namaLatin} ${d.s}:${d.from}${d.to !== d.from ? '–' + d.to : ''}`
      quranData.set(+det.dataset.i, { title: d.title, ar: ay.map((a) => a.teksArab).join(' '), latin: ay.map((a) => a.teksLatin || '').join(' ').trim(), arti: ay.map((a) => a.teksIndonesia || '').join(' ').trim(), ref, tab: 'quran' })
      slot.innerHTML = `<p class="ayah-ar" lang="ar" dir="rtl">${ay.map((a) => `${esc(a.teksArab)} <span class="ayah-num">${ayahMarker(a.nomorAyat)}</span>`).join(' ')}</p>
        ${ay.some((a) => a.teksLatin) ? `<p class="ayah-latin">${ay.map((a) => esc(a.teksLatin || '')).join(' ')}</p>` : ''}
        ${ay.some((a) => a.teksIndonesia) ? `<p class="ayah-id">${ay.map((a) => esc(a.teksIndonesia || '')).join(' ')}</p>` : ''}
        <div class="doa-foot"><p class="doa-ref">Referensi: ${esc(ref)}</p><div class="doa-acts"><a class="btn sm" href="#/surah/${d.s}/${d.from}">${fi('book-open')}Mushaf</a><button class="btn sm" data-copyq="${det.dataset.i}">${fi('copy')}Salin</button><button class="btn sm" data-share="q:${det.dataset.i}">${fi('share')}Bagikan</button></div></div>`
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
        <div class="doa-acts"><button class="btn sm" data-copy="${esc(d.id)}">${fi('copy')}Salin</button><button class="btn sm" data-share="h:${esc(d.id)}">${fi('share')}Bagikan</button></div></div></div></details>`).join('') || '<p class="muted pad">Tidak ditemukan.</p>'}</div>
      <p class="hint pad">Sumber: EQuran.id (${harian.length} doa), ditampilkan apa adanya.</p>`
  }

  /** Doa wudhu & wirid/doa usai salat: data tersimpan di aplikasi (offline), dari Quran NU Online. */
  function renderDzikir(kind) {
    const q = norm(input.value)
    const all = DZIKIR[kind]
    const items = all.map((d, i) => ({ ...d, i })).filter((d) => !q || norm(d.title).includes(q) || norm(d.translation).includes(q) || norm(d.latin).includes(q))
    const page = DZIKIR.source.pages[kind]
    const seen = done[kind]
    const intro =
      kind === 'salat'
        ? 'Dibaca berurutan setelah salam dari salat fardu: wirid lebih dulu, lalu doa. Tandai tiap bacaan agar tidak ada yang terlewat.'
        : 'Niat dan doa sebelum, saat, dan setelah berwudhu, berurutan sesuai gerakan wudhu.'
    let section = null
    body.innerHTML = `<p class="dzikir-intro">${intro}</p>
      <div class="dzikir-progress" data-progress>
        <div class="dzikir-bar"><span></span></div>
        <strong data-progress-text></strong>
        <button class="btn sm" data-reset>${fi('rotate')}Ulangi</button>
      </div>
      <div class="dzikir-list">${items.map((d) => {
        const n = repeatOf(d.notes)
        const head = d.section !== section ? `<h2 class="dzikir-section sec-${SECTION_CLASS[d.kind] || 'doa'}"><span>${esc(d.section)}</span><small>${all.filter((x) => x.section === d.section).length} bacaan</small></h2>` : ''
        section = d.section
        return `${head}<article class="card dzikir k-${d.kind}${seen.has(d.i) ? ' is-done' : ''}" data-card="${d.i}">
          <header><span class="dzikir-no">${d.step}</span><div class="dzikir-head"><h3>${esc(d.title)}</h3>
            <div class="dzikir-tags"><span class="dzikir-kind">${KIND_LABEL[d.kind] || 'Doa'}</span>${d.notes ? `<span class="dzikir-meta">${icon('beads')}${esc(d.notes.replace(/(\d+)\s*x/gi, '$1×'))}</span>` : ''}</div></div>
            <button class="dzikir-check" data-done="${d.i}" aria-pressed="${seen.has(d.i)}" aria-label="Tandai sudah dibaca">${fi('check')}</button></header>
          ${d.arabic ? `<div class="dzikir-ar"><p class="ayah-ar" lang="ar" dir="rtl">${esc(d.arabic)}</p></div>` : ''}
          ${d.latin ? `<p class="ayah-latin">${esc(d.latin)}</p>` : ''}
          ${d.translation ? `<p class="ayah-id">${esc(d.translation)}</p>` : ''}
          ${d.fawaid ? `<p class="dzikir-note">${icon('info')}<span>${esc(d.fawaid)}</span></p>` : ''}
          ${d.links && d.links.length ? `<div class="dzikir-links">${d.links.map((l) => `<a class="chip chip-link" href="#/surah/${l.s}/${l.a}">${fi('book-open')}${esc(l.label)}</a>`).join('')}</div>` : ''}
          <footer class="dzikir-foot">
            <p class="doa-ref">Sumber: ${esc(d.source)}</p>
            <div class="dzikir-acts">
              ${n ? `<button class="btn sm dzikir-count" data-count="${n}" data-n="0" data-for="${d.i}" aria-label="Penghitung bacaan">${icon('beads')}<span>0 / ${n}</span></button>` : ''}
              <button class="btn sm" data-copyz="${kind}:${d.i}">${fi('copy')}Salin</button>
              <button class="btn sm" data-share="${kind}:${d.i}">${fi('share')}Bagikan</button>
            </div>
          </footer></article>`
      }).join('') || '<p class="muted pad">Tidak ditemukan.</p>'}</div>
      <p class="hint pad">Sumber: <a class="link" href="${page.url}" target="_blank" rel="noopener">${esc(DZIKIR.source.name)}</a>, halaman “${esc(page.title)}”. Teks Arab, Latin, dan arti berasal dari sumber tersebut; judul kartu, pengelompokan, dan beberapa perbaikan salah ketik pada Latin/arti oleh QuranKu.</p>`
    paintProgress(kind)
  }

  function paintProgress(kind) {
    const box = $('[data-progress]', body)
    if (!box) return
    const total = DZIKIR[kind].length
    const n = done[kind].size
    $('.dzikir-bar span', box).style.width = `${Math.round((n / total) * 100)}%`
    $('[data-progress-text]', box).textContent = n >= total ? 'Selesai — alhamdulillah' : `${n} dari ${total} dibaca`
    box.classList.toggle('complete', n >= total)
    $('[data-reset]', box).hidden = n === 0
  }
  function setDone(kind, i, val) {
    done[kind][val ? 'add' : 'delete'](i)
    const card = $(`[data-card="${i}"]`, body)
    if (card) {
      card.classList.toggle('is-done', val)
      $('[data-done]', card).setAttribute('aria-pressed', String(val))
    }
    paintProgress(kind)
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
      if (cnt.dataset.for != null) setDone(tab, +cnt.dataset.for, n >= max)
      return
    }
    const dn = e.target.closest('[data-done]')
    if (dn) return setDone(tab, +dn.dataset.done, dn.getAttribute('aria-pressed') !== 'true')
    if (e.target.closest('[data-reset]')) {
      done[tab].clear()
      return render()
    }
    const sh = e.target.closest('[data-share]')
    if (sh) {
      const p = payload(sh.dataset.share)
      return p && openShare(p)
    }
    const c = e.target.closest('[data-copyz],[data-copy],[data-copyq]')
    if (c) {
      const key = c.dataset.copyz || (c.dataset.copyq != null ? `q:${c.dataset.copyq}` : `h:${c.dataset.copy}`)
      const p = payload(key)
      if (p) toast((await copyText(doaText(p))) ? 'Bacaan disalin' : 'Gagal menyalin')
    }
  })
  input.addEventListener('input', debounce(render, 150))
  applyView()
  render()
}
