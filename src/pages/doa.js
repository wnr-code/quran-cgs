import { pageHeader, skeleton } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { DOA_QURAN } from '../data/ayat-pilihan.js'
import { getSurah, friendlyError } from '../api/api-adapter.js'
import { $, esc, debounce, copyText, toast } from '../utils/helpers.js'
import { doaText } from '../utils/doa-share.js'
import { fi, openShare } from '../components/share-sheet.js'
import { ayahMarker } from '../utils/arabic-numbers.js'
import DZIKIR from '../data/dzikir.json'
import NU from '../data/doa-nu.json'

let tab = 'harian'
/** Kategori doa harian yang sedang dibuka (null = daftar kategori). */
let cat = null
const TABS = [
  ['harian', 'Harian'],
  ['wudhu', 'Wudhu'],
  ['salat', 'Usai Salat'],
  ['quran', "Al-Qur'an"]
]
const NU_TOTAL = NU.categories.reduce((n, c) => n + c.items.length, 0)
/** Kartu kategori: kategori doa harian + pintasan ke tab Wudhu dan Usai Salat (juga kategori di Quran NU Online). */
const CAT_CARDS = [
  ...NU.categories.map((c) => ({ cat: c.slug, name: c.name, icon: c.icon, desc: c.desc, n: c.items.length })),
  { tab: 'wudhu', name: 'Wudhu', icon: 'droplet', desc: 'Niat dan doa tiap gerakan wudhu', n: DZIKIR.wudhu.length },
  { tab: 'salat', name: 'Usai Salat', icon: 'pray', desc: 'Wirid lalu doa setelah salat fardu', n: DZIKIR.salat.length },
  { tab: 'quran', name: "Doa dari Al-Qur'an", icon: 'quran', desc: 'Ayat-ayat doa, langsung dari mushaf', n: DOA_QURAN.length }
]
const SOURCE_NOTE = {
  nu: 'Teks Arab, Latin, dan arti disalin apa adanya dari Quran NU Online; kategori dan judul doa mengikuti sumber.',
  dzikir: 'Teks Arab, Latin, dan arti disalin apa adanya dari Quran NU Online. Judul kartu dan pemisahan bagian disusun QuranKu agar mudah diikuti.'
}
const srcFoot = (html) => `<footer class="src-foot">${fi('book-open')}<p>${html}</p></footer>`
// Nama sumber di footer menuju halaman Sumber Data di dalam aplikasi, bukan langsung ke situs sumber.
const nuLink = (_url, label) => `<a class="link" href="#/sumber">${label}</a>`
/** Bacaan yang sudah ditandai (selama aplikasi terbuka). */
const done = { wudhu: new Set(), salat: new Set() }
const KIND_LABEL = { wirid: 'Wirid', doa: 'Doa', niat: 'Niat' }
const SECTION_CLASS = { wirid: 'wirid', doa: 'doa', niat: 'doa' }

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

  /** Data doa dari kunci tombol: "q:<i>" (Al-Qur'an), "n:<slug>" (doa harian), "<wudhu|salat>:<i>". */
  function payload(key) {
    const [k, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
    if (k === 'q') return quranData.get(+id) || null
    if (k === 'n') {
      for (const c of NU.categories) {
        const d = c.items.find((x) => x.id === id)
        if (d) return { title: d.title, ar: d.parts.map((x) => x.ar).join('\n'), latin: d.parts.map((x) => x.latin).join('\n'), arti: d.parts.map((x) => x.arti).join('\n'), ref: `Quran NU Online — Doa ${c.name}`, tab: 'harian' }
      }
      return null
    }
    const d = DZIKIR[k] && DZIKIR[k][+id]
    return d ? { title: d.title, ar: d.arabic, latin: d.latin, arti: d.translation, ref: d.source, tab: k } : null
  }

  function renderQuran() {
    const q = norm(input.value)
    const items = DOA_QURAN.map((d, i) => ({ ...d, i })).filter((d) => !q || norm(d.title).includes(q))
    body.innerHTML = `<div class="list">${items.map((d) => `<details class="doa" data-i="${d.i}"><summary><span><strong>${esc(d.title)}</strong><small>QS. ${d.s}:${d.from}${d.to !== d.from ? '–' + d.to : ''}</small></span>${icon('down')}</summary><div class="doa-body" data-slot>${skeleton(2, 'sk-line')}</div></details>`).join('')}</div>
      ${srcFoot("<strong>Sumber:</strong> teks ayat dari data Al-Qur'an aplikasi (lihat <a class=\"link\" href=\"#/sumber\">Sumber Data</a>). Ayat ditampilkan utuh; lafaz doa terdapat di dalam ayat tersebut.")}`
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

  /** Satu doa harian (bisa terdiri atas beberapa bacaan). */
  const doaItem = (d, no, label) => `<details class="doa doa-nu"><summary><span class="doa-no">${no}</span><span><strong>${esc(d.title)}</strong>${label ? `<small>${esc(label)}</small>` : d.parts.length > 1 ? `<small>${d.parts.length} bacaan</small>` : ''}</span>${icon('down')}</summary><div class="doa-body">
      ${d.parts.map((x) => `<div class="doa-part"><div class="dzikir-ar"><p class="ayah-ar" lang="ar" dir="rtl">${esc(x.ar)}</p></div><p class="ayah-latin">${esc(x.latin)}</p><p class="ayah-id">${esc(x.arti)}</p></div>`).join('')}
      <div class="doa-foot"><div class="doa-acts"><button class="btn sm" data-copyn="${d.id}">${fi('copy')}Salin</button><button class="btn sm" data-share="n:${d.id}">${fi('share')}Bagikan</button></div></div></div></details>`

  /** Doa harian per kategori (seperti Quran NU Online): daftar kategori → daftar doa; pencarian menembus semua kategori. */
  function renderHarian() {
    const q = norm(input.value).trim()
    const foot = (c) => srcFoot(`<strong>Sumber:</strong> ${nuLink(c ? `${NU.source.url}/${c.slug}` : NU.source.url, 'Quran NU Online')}${c ? `, kategori “Doa ${esc(c.name)}”` : ''}. ${SOURCE_NOTE.nu}`)
    if (q) {
      const hits = NU.categories.flatMap((c) => c.items.filter((d) => norm(d.title).includes(q) || d.parts.some((x) => norm(x.arti).includes(q) || norm(x.latin).includes(q))).map((d) => ({ d, c })))
      body.innerHTML = `<p class="doa-count">${hits.length} doa ditemukan di ${NU.categories.length} kategori</p>
        <div class="list">${hits.map(({ d, c }, i) => doaItem(d, i + 1, c.name)).join('') || '<p class="muted pad">Tidak ditemukan. Coba kata lain, mis. “tidur”, “hujan”, “utang”.</p>'}</div>${foot()}`
      return
    }
    const c = cat && NU.categories.find((x) => x.slug === cat)
    if (!c) {
      body.innerHTML = `<p class="dzikir-intro">Pilih kategori. ${NU_TOTAL} doa harian tersusun dalam ${NU.categories.length} kategori, tersimpan di aplikasi sehingga bisa dibuka tanpa internet.</p>
        <div class="cat-grid">${CAT_CARDS.map((x, i) => `<button class="cat-card${x.tab ? ' is-link' : ''}" style="--i:${i}" ${x.cat ? `data-cat="${x.cat}"` : `data-goto="${x.tab}"`}>
          <span class="cat-ic">${fi(x.icon)}</span><strong>${esc(x.name)}</strong><small>${esc(x.desc)}</small><em>${x.n} ${x.tab ? 'bacaan' : 'doa'}</em></button>`).join('')}</div>
        <p class="hint pad">Kategori lain dari Quran NU Online (Waktu Tertentu, Kualitas Diri, Pernikahan, Hamil &amp; Persalinan, Baca Al-Qur'an, Salat lainnya, Haji &amp; Umrah, Kematian) menyusul.</p>${foot()}`
      return
    }
    body.innerHTML = `<div class="cat-head"><button class="btn sm" data-cat="">${fi('arrow-left')}Kategori</button><div><h2>${fi(c.icon)}Doa ${esc(c.name)}</h2><small>${c.items.length} doa · ${esc(c.desc)}</small></div></div>
      <div class="cat-chips">${NU.categories.map((x) => `<button class="chip${x.slug === c.slug ? ' active' : ''}" data-cat="${x.slug}">${esc(x.name)}</button>`).join('')}</div>
      <div class="list">${c.items.map((d, i) => doaItem(d, i + 1)).join('')}</div>${foot(c)}`
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
            <div class="dzikir-acts">
              ${n ? `<button class="btn sm dzikir-count" data-count="${n}" data-n="0" data-for="${d.i}" aria-label="Penghitung bacaan">${icon('beads')}<span>0 / ${n}</span></button>` : ''}
              <button class="btn sm" data-copyz="${kind}:${d.i}">${fi('copy')}Salin</button>
              <button class="btn sm" data-share="${kind}:${d.i}">${fi('share')}Bagikan</button>
            </div>
          </footer></article>`
      }).join('') || '<p class="muted pad">Tidak ditemukan.</p>'}</div>
      ${srcFoot(`<strong>Sumber:</strong> ${nuLink(page.url, esc(DZIKIR.source.name))}, halaman “${esc(page.title)}”. ${SOURCE_NOTE.dzikir}${page.note ? ' ' + esc(page.note) : ''}`)}`
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
      if (b.dataset.tab === 'harian' && tab === 'harian') cat = null
      tab = b.dataset.tab
      render()
    }
  })
  body.addEventListener('toggle', (e) => {
    if (e.target.matches('details[data-i]') && e.target.open) fillQuran(e.target)
    if (e.target.matches('details.doa-nu') && e.target.open) body.querySelectorAll('details.doa-nu[open]').forEach((d) => d !== e.target && (d.open = false))
  }, true)
  body.addEventListener('click', async (e) => {
    const ct = e.target.closest('[data-cat]')
    if (ct) {
      cat = ct.dataset.cat || null
      render()
      return window.scrollTo({ top: 0 })
    }
    const gt = e.target.closest('[data-goto]')
    if (gt) {
      tab = gt.dataset.goto
      render()
      return window.scrollTo({ top: 0 })
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
    const c = e.target.closest('[data-copyz],[data-copyn],[data-copyq]')
    if (c) {
      const key = c.dataset.copyz || (c.dataset.copyq != null ? `q:${c.dataset.copyq}` : `n:${c.dataset.copyn}`)
      const p = payload(key)
      if (p) toast((await copyText(doaText(p))) ? 'Bacaan disalin' : 'Gagal menyalin')
    }
  })
  input.addEventListener('input', debounce(render, 150))
  applyView()
  render()
}
