import { pageHeader, skeleton } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { DOA_QURAN } from '../data/ayat-pilihan.js'
import { getSurah, friendlyError } from '../api/api-adapter.js'
import { $, esc, debounce, copyText, toast } from '../utils/helpers.js'
import { doaText, shareUrl } from '../utils/doa-share.js'
import { createShareImage } from '../utils/ayah-image.js'
import { APP } from '../config.js'
import { fi, openShare } from '../components/share-sheet.js'
import { ayahMarker } from '../utils/arabic-numbers.js'
import DZIKIR from '../data/dzikir.json'
import TAHLIL from '../data/tahlil.json'
import NU from '../data/doa-nu.json'
import NU_EXTRA from '../data/doa-nu-extra.json'

// Kategori tambahan melengkapi enam kategori doa harian yang sudah ada; Wudhu dan Shalat tetap di dzikir.json.
const NU_CATEGORIES = [...NU.categories, ...NU_EXTRA.categories]

let tab = 'harian'
/** Kategori doa harian yang sedang dibuka (null = daftar kategori). */
let cat = null
const TABS = [
  ['harian', 'Harian'],
  ['wudhu', 'Wudhu'],
  ['salat', 'Usai Salat'],
  ['tahlil', 'Tahlil'],
  ['quran', "Al-Qur'an"]
]
const NU_TITLE_TOTAL = NU_CATEGORIES.reduce((n, c) => n + (c.count || c.items.length), 0)
const NU_OFFLINE_TOTAL = NU.categories.reduce((n, c) => n + c.items.length, 0)
const CATALOG_TOTAL = NU_CATEGORIES.length + 2 // Wudhu dan Shalat ditampilkan di tab tersendiri.
const infaqButton = `<a class="doa-infaq-button" href="/infaq" aria-label="Dukung QuranKu melalui infaq">${icon('heart')}<span>Infaq</span></a>`
const infaqCard = () => `<aside class="doa-support"><span class="doa-support-ic">${icon('heart')}</span><span class="doa-support-copy"><strong>Dukung QuranKu</strong><small>Infaq sukarela untuk pemeliharaan dan pengembangan aplikasi.</small></span><a class="btn sm" href="/infaq">Infaq ${icon('forward')}</a></aside>`
/** Kartu kategori doa harian serta pintasan Wudhu, Usai Salat, Tahlil Lengkap, dan doa Al-Qur’an. */
const CAT_CARDS = [
  ...NU_CATEGORIES.map((c) => ({ cat: c.slug, name: c.name, icon: c.icon, desc: c.desc, n: c.count || c.items.length, sourceOnly: !!c.sourceOnly })),
  { tab: 'wudhu', name: 'Wudhu', icon: 'droplet', desc: 'Niat dan doa tiap gerakan wudhu', n: DZIKIR.wudhu.length },
  { tab: 'salat', name: 'Usai Salat', icon: 'pray', desc: 'Wirid lalu doa setelah salat fardu', n: DZIKIR.salat.length },
  { tab: 'tahlil', name: 'Tahlil & Doa Arwah', icon: 'beads', desc: 'Rangkaian dzikir dan doa arwah, dengan Yasin sebagai bacaan tambahan', n: TAHLIL.items.length },
  { tab: 'quran', name: "Doa dari Al-Qur'an", icon: 'quran', desc: 'Ayat-ayat doa, langsung dari mushaf', n: DOA_QURAN.length }
]
const SOURCE_NOTE = {
  nu: 'Enam kategori awal menyimpan teks Arab, Latin, dan arti untuk dibaca offline. Delapan kategori lainnya berupa katalog judul dengan tautan ke sumber; teks lengkapnya belum tersedia offline.',
  dzikir: 'Teks Arab, Latin, dan arti tersedia offline. Judul kartu dan pemisahan bagian disusun QuranKu agar mudah diikuti.',
  tahlil: 'Urutan dan bacaan mengikuti susunan Lengkap; pemenggalan dan sebagian terjemahan diringkas oleh QuranKu. Lihat Sumber Data untuk atribusi dan keterangan versi.'
}
const srcFoot = (html) => `<footer class="src-foot">${fi('book-open')}<p>${html}</p></footer>`
// Nama sumber di footer menuju halaman Sumber Data di dalam aplikasi, bukan langsung ke situs sumber.
const nuLink = (_url, label) => `<a class="link" href="/sumber">${label}</a>`
/** Bacaan yang sudah ditandai (selama aplikasi terbuka). */
const done = { wudhu: new Set(), salat: new Set(), tahlil: new Set() }
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
  root.innerHTML = `<div class="page doa-page">${pageHeader('Doa & Dzikir', { subtitle: 'Bacaan harian, ibadah, dan doa Al-Qur’an', actions: infaqButton })}
    <section class="doa-welcome" aria-label="Tentang koleksi doa">
      <span class="doa-welcome-mark">${icon('hands')}</span>
      <div class="doa-welcome-copy"><span class="doa-eyebrow">Teman dalam keseharian</span><p>Pilih bacaan, atur tampilan, lalu lanjutkan dengan tenang. Bacaan yang tersimpan di aplikasi dapat dibuka offline.</p></div>
      <span class="doa-catalog-count">${CATALOG_TOTAL} kategori</span>
    </section>
    <div class="tabs scroll" role="tablist" aria-label="Kategori bacaan doa">${TABS.map(([k, l]) => `<button type="button" id="doa-tab-${k}" role="tab" aria-controls="doa-panel" data-tab="${k}">${l}</button>`).join('')}</div>
    <div class="search-box">${icon('search')}<input type="search" placeholder="Cari doa…" aria-label="Cari doa" autocomplete="off" /></div>
    <div class="doa-tools" role="group" aria-label="Tampilan bacaan">
      <button class="doa-tog" data-view="arti"><i class="fi" aria-hidden="true"></i><span>Arti</span></button>
      <button class="doa-tog" data-view="latin"><i class="fi" aria-hidden="true"></i><span>Latin</span></button>
      <button class="doa-tog" data-size>${fi('text-height')}<span></span></button>
    </div>
    <div id="doa-panel" data-body role="tabpanel" tabindex="0"></div></div>`
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
      for (const c of NU_CATEGORIES) {
        const d = c.items.find((x) => x.id === id)
        if (d) {
          if (!Array.isArray(d.parts) || !d.parts.length) return null
          return {
            title: d.title,
            ar: d.parts.map((x) => x.ar).join('\n'),
            latin: d.parts.map((x) => x.latin).join('\n'),
            arti: d.parts.map((x) => x.arti).join('\n'),
            imageBlocks: d.parts.map((x) => ({ label: x.title, arabic: x.ar, latin: x.latin, translation: x.arti })),
            tab: 'harian'
          }
        }
      }
      return null
    }
    const d = k === 'tahlil' ? TAHLIL.items[+id] : DZIKIR[k] && DZIKIR[k][+id]
    if (!d) return null
    if (d.surah) {
      const ref = `QS. Yā-Sīn ${d.surah}:1–83`
      return {
        title: d.title,
        text: `Bacaan lengkap Surah Yasin tersedia di mushaf QuranKu.\n${ref}`,
        imageBlocks: [{ translation: 'Bacaan lengkap Surah Yasin tersedia di mushaf QuranKu.' }],
        ref,
        path: `/surah/${d.surah}/1`,
        tab: k
      }
    }
    return { title: d.title, ar: d.arabic, latin: d.latin, arti: d.translation, tab: k }
  }

  function renderQuran() {
    const q = norm(input.value)
    const items = DOA_QURAN.map((d, i) => ({ ...d, i })).filter((d) => !q || norm(d.title).includes(q))
    body.innerHTML = `<div class="list">${items.map((d) => `<details class="doa" data-i="${d.i}"><summary><span><strong>${esc(d.title)}</strong><small>QS. ${d.s}:${d.from}${d.to !== d.from ? '–' + d.to : ''}</small></span>${icon('down')}</summary><div class="doa-body" data-slot>${skeleton(2, 'sk-line')}</div></details>`).join('')}</div>
      ${srcFoot("<strong>Sumber:</strong> teks ayat dari data Al-Qur'an aplikasi (lihat <a class=\"link\" href=\"/sumber\">Sumber Data</a>). Ayat ditampilkan utuh; lafaz doa terdapat di dalam ayat tersebut.")}${infaqCard()}`
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
        <div class="doa-foot"><p class="doa-ref">Referensi: ${esc(ref)}</p><div class="doa-acts"><a class="btn sm" href="/surah/${d.s}/${d.from}">${fi('book-open')}Mushaf</a><button class="btn sm" data-copyq="${det.dataset.i}">${fi('copy')}Salin</button><button class="btn sm" data-share="q:${det.dataset.i}">${fi('share')}Bagikan</button></div></div>`
    } catch (e) {
      slot.innerHTML = `<p class="muted">${esc(friendlyError(e))}</p>`
    }
  }

  async function fillYasin(det) {
    const slot = $('[data-yasin-slot]', det)
    if (!slot || slot.dataset.done === '1' || slot.dataset.loading === '1') return
    slot.dataset.loading = '1'
    slot.innerHTML = `<p class="muted doa-yasin-loading">${icon('refresh')}Memuat 83 ayat…</p>`
    try {
      const surah = await getSurah(Number(det.dataset.yasin))
      if (!det.isConnected) return
      slot.dataset.done = '1'
      slot.dataset.loading = '0'
      const verses = surah.ayat
      const latin = verses.some((a) => a.teksLatin)
      const meaning = verses.some((a) => a.teksIndonesia)
      const ref = `QS. ${surah.namaLatin || 'Yā-Sīn'} 36:1–83`
      slot.innerHTML = `<div class="doa-yasin-verses">${verses.map((a) => `<article class="doa-yasin-ayah"><p class="ayah-ar" lang="ar" dir="rtl">${esc(a.teksArab)} <span class="ayah-num">${ayahMarker(a.nomorAyat)}</span></p>${a.teksLatin ? `<p class="ayah-latin">${esc(a.teksLatin)}</p>` : ''}${a.teksIndonesia ? `<p class="ayah-id">${esc(a.teksIndonesia)}</p>` : ''}</article>`).join('')}</div>
        ${!latin || !meaning ? `<p class="hint doa-yasin-hint">${!latin ? 'Transliterasi' : ''}${!latin && !meaning ? ' dan ' : ''}${!meaning ? 'terjemah' : ''} tidak tersedia pada edisi mushaf yang dimuat. Teks Arab lengkap tetap ditampilkan.</p>` : ''}
        <p class="doa-ref">Referensi: ${esc(ref)}. <a class="link" href="/sumber">Sumber Data</a>.</p>`
    } catch (e) {
      slot.dataset.loading = '0'
      slot.innerHTML = `<p class="muted">${esc(friendlyError(e))}</p><button type="button" class="btn sm" data-retry-yasin>${fi('refresh')}Coba lagi</button>`
    }
  }

  /** Satu doa harian, atau kartu rujukan yang hanya menampilkan judul dan sumber resmi. */
  const doaItem = (d, no, label) => {
    const parts = Array.isArray(d.parts) ? d.parts : []
    const sourceOnly = parts.length === 0
    const detail = sourceOnly
      ? `<div class="doa-source-only"><p>Teks Arab, Latin, dan terjemah lengkap tersedia pada halaman sumber. Item ini ditampilkan sebagai katalog judul dan belum tersedia offline.</p>${d.sourceUrl ? `<a class="btn sm" href="${esc(d.sourceUrl)}" target="_blank" rel="noopener noreferrer">${fi('book-open')}Buka sumber</a>` : ''}</div>`
      : `${parts.map((x) => `<div class="doa-part">${x.title ? `<h4 class="doa-part-title">${esc(x.title)}</h4>` : ''}<div class="dzikir-ar"><p class="ayah-ar" lang="ar" dir="rtl">${esc(x.ar)}</p></div>${x.latin ? `<p class="ayah-latin">${esc(x.latin)}</p>` : ''}${x.arti ? `<p class="ayah-id">${esc(x.arti)}</p>` : ''}</div>`).join('')}${d.note ? `<p class="doa-source-note">${esc(d.note)}</p>` : ''}
        <div class="doa-foot"><div class="doa-acts"><button class="btn sm" data-copyn="${esc(d.id)}">${fi('copy')}Salin</button><button class="btn sm" data-share="n:${esc(d.id)}">${fi('share')}Bagikan</button>${d.sourceUrl ? `<a class="btn sm" href="${esc(d.sourceUrl)}" target="_blank" rel="noopener noreferrer">${fi('book-open')}Sumber lengkap</a>` : ''}</div></div>`
    return `<details class="doa doa-nu${sourceOnly ? ' doa-online' : ''}"><summary><span class="doa-no">${no}</span><span><strong>${esc(d.title)}</strong>${label ? `<small>${esc(label)}</small>` : sourceOnly ? '<small>Katalog judul</small>' : parts.length > 1 ? `<small>${parts.length} bacaan</small>` : ''}</span>${icon('down')}</summary><div class="doa-body">${detail}</div></details>`
  }

  const yasinCard = (d, seen) => `<article class="card dzikir k-quran${seen.has(d.i) ? ' is-done' : ''}" data-card="${d.i}">
    <header><span class="dzikir-no">${d.step}</span><div class="dzikir-head"><h3>${esc(d.title)}</h3><div class="dzikir-tags"><span class="dzikir-kind">Al-Qur’an</span><span class="dzikir-meta">36 · 83 ayat</span></div></div>
      <button class="dzikir-check" data-done="${d.i}" aria-pressed="${seen.has(d.i)}" aria-label="Tandai Surah Yasin sudah dibaca">${fi('check')}</button></header>
    <p class="dzikir-note">${icon('info')}<span>Bacaan tambahan setelah rangkaian tahlil, sebelum Doa Arwah. Tandai selesai setelah membaca seluruh surah.</span></p>
    <details class="doa-yasin" data-yasin="${d.surah}"><summary>${icon('book')}<span>Buka Surah Yasin</span><small>83 ayat</small>${icon('down')}</summary><div class="doa-yasin-slot" data-yasin-slot><p class="muted">Buka untuk memuat teks surah dari mushaf QuranKu.</p></div></details>
    <footer class="dzikir-foot"><div class="dzikir-acts"><a class="btn sm" href="/surah/${d.surah}/1">${fi('book-open')}Mushaf</a><button class="btn sm" data-copyz="tahlil:${d.i}">${fi('copy')}Salin rujukan</button><button class="btn sm" data-share="tahlil:${d.i}">${fi('share')}Bagikan</button></div></footer>
  </article>`

  /** Doa harian per kategori: daftar kategori → daftar doa; pencarian menembus semua kategori. */
  function renderHarian() {
    const q = norm(input.value).trim()
    const foot = (c) => srcFoot(`<strong>Atribusi:</strong> ${nuLink(c ? `${NU.source.url}/${c.slug}` : NU.source.url, 'Sumber Data')}${c ? ` · kategori “Doa ${esc(c.name)}”` : ''}. ${SOURCE_NOTE.nu}`)
    if (q) {
      const hits = NU_CATEGORIES.flatMap((c) => c.items.filter((d) => norm(d.title).includes(q) || (d.parts || []).some((x) => norm(x.title || '').includes(q) || norm(x.arti || '').includes(q) || norm(x.latin || '').includes(q))).map((d) => ({ d, c })))
      body.innerHTML = `<p class="doa-count">${hits.length} hasil ditemukan di ${NU_CATEGORIES.length} kategori</p>
        <div class="list">${hits.map(({ d, c }, i) => doaItem(d, i + 1, c.name)).join('') || '<p class="muted pad">Tidak ditemukan. Coba kata lain, mis. “tidur”, “hujan”, “utang”.</p>'}</div>${foot()}${infaqCard()}`
      return
    }
    const c = cat && NU_CATEGORIES.find((x) => x.slug === cat)
    if (!c) {
      body.innerHTML = `<p class="dzikir-intro">Jelajahi ${NU_TITLE_TOTAL} judul doa dari ${NU_CATEGORIES.length} kategori harian. ${NU_OFFLINE_TOTAL} bacaan dari enam kategori tersimpan di QuranKu untuk dibaca offline; delapan kategori lainnya berupa katalog judul dan tautan ke sumber resmi.</p>
        <div class="cat-grid">${CAT_CARDS.map((x, i) => `<button class="cat-card${x.tab ? ' is-link' : ''}" style="--i:${i}" ${x.cat ? `data-cat="${x.cat}"` : `data-goto="${x.tab}"`}>
          <span class="cat-ic">${fi(x.icon)}</span><strong>${esc(x.name)}</strong><small>${esc(x.desc)}</small><em>${x.n} ${x.tab ? 'bacaan' : x.sourceOnly ? 'judul' : 'doa'}</em></button>`).join('')}</div>
        <p class="hint pad">Koleksi mencakup ${CATALOG_TOTAL} kategori, termasuk Wudhu dan Shalat yang tersedia di tab terpisah agar tidak ada bacaan yang terduplikasi. Lihat Sumber Data untuk atribusi.</p>${foot()}${infaqCard()}`
      return
    }
    const countLabel = c.sourceOnly ? 'judul' : 'doa'
    body.innerHTML = `<div class="cat-head"><button class="btn sm" data-cat="">${fi('arrow-left')}Kategori</button><div><h2>${fi(c.icon)}Doa ${esc(c.name)}</h2><small>${c.count || c.items.length} ${countLabel} · ${esc(c.desc)}</small></div></div>
      <div class="cat-chips">${NU_CATEGORIES.map((x) => `<button class="chip${x.slug === c.slug ? ' active' : ''}" data-cat="${x.slug}">${esc(x.name)}</button>`).join('')}</div>
      <div class="list">${c.items.map((d, i) => doaItem(d, i + 1)).join('')}</div>${foot(c)}${infaqCard()}`
  }

  /** Doa wudhu & wirid/doa usai salat: data tersimpan di aplikasi (offline). */
  function renderDzikir(kind) {
    const q = norm(input.value)
    const all = kind === 'tahlil' ? TAHLIL.items : DZIKIR[kind]
    const items = all.map((d, i) => ({ ...d, i })).filter((d) => !q || norm(d.title).includes(q) || norm(d.translation).includes(q) || norm(d.latin).includes(q))
    const page = kind === 'tahlil' ? TAHLIL.source : DZIKIR.source.pages[kind]
    const seen = done[kind]
    const intro =
      kind === 'salat'
        ? 'Dibaca berurutan setelah salam dari salat fardu: wirid lebih dulu, lalu doa. Tandai tiap bacaan agar tidak ada yang terlewat.'
        : kind === 'tahlil'
          ? 'Rangkaian Tahlil dan Doa Arwah versi Lengkap. Surah Yasin ditambahkan setelah rangkaian dzikir tahlil dan sebelum Doa Arwah sebagai bacaan lanjutan.'
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
        if (d.surah) return `${head}${yasinCard(d, seen)}`
        return `${head}<article class="card dzikir k-${d.kind}${seen.has(d.i) ? ' is-done' : ''}" data-card="${d.i}">
          <header><span class="dzikir-no">${d.step}</span><div class="dzikir-head"><h3>${esc(d.title)}</h3>
            <div class="dzikir-tags"><span class="dzikir-kind">${KIND_LABEL[d.kind] || 'Doa'}</span>${d.notes ? `<span class="dzikir-meta">${icon('beads')}${esc(d.notes.replace(/(\d+)\s*x/gi, '$1×'))}</span>` : ''}</div></div>
            <button class="dzikir-check" data-done="${d.i}" aria-pressed="${seen.has(d.i)}" aria-label="Tandai sudah dibaca">${fi('check')}</button></header>
          ${d.arabic ? `<div class="dzikir-ar"><p class="ayah-ar" lang="ar" dir="rtl">${esc(d.arabic)}</p></div>` : ''}
          ${d.latin ? `<p class="ayah-latin">${esc(d.latin)}</p>` : ''}
          ${d.translation ? `<p class="ayah-id">${esc(d.translation)}</p>` : ''}
          ${d.fawaid ? `<p class="dzikir-note">${icon('info')}<span>${esc(d.fawaid)}</span></p>` : ''}
          ${d.links && d.links.length ? `<div class="dzikir-links">${d.links.map((l) => `<a class="chip chip-link" href="/surah/${l.s}/${l.a}">${fi('book-open')}${esc(l.label)}</a>`).join('')}</div>` : ''}
          <footer class="dzikir-foot">
            <div class="dzikir-acts">
              ${n ? `<button class="btn sm dzikir-count" data-count="${n}" data-n="0" data-for="${d.i}" aria-label="Penghitung bacaan 0 / ${n}">${icon('beads')}<span>0 / ${n}</span></button>` : ''}
              <button class="btn sm" data-copyz="${kind}:${d.i}">${fi('copy')}Salin</button>
              <button class="btn sm" data-share="${kind}:${d.i}">${fi('share')}Bagikan</button>
            </div>
          </footer></article>`
      }).join('') || '<p class="muted pad">Tidak ditemukan.</p>'}</div>
      ${srcFoot(`<strong>Atribusi:</strong> ${nuLink(page.url, 'Sumber Data')}, bagian “${esc(page.title)}”. ${SOURCE_NOTE[kind === 'tahlil' ? 'tahlil' : 'dzikir']}${page.note ? ' ' + esc(page.note) : ''}`)}${infaqCard()}`
    paintProgress(kind)
  }

  function paintProgress(kind) {
    const box = $('[data-progress]', body)
    if (!box) return
    const total = (kind === 'tahlil' ? TAHLIL.items : DZIKIR[kind]).length
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
    root.querySelectorAll('[data-tab]').forEach((b) => {
      const selected = b.dataset.tab === tab
      b.classList.toggle('active', selected)
      b.setAttribute('aria-selected', String(selected))
      b.tabIndex = selected ? 0 : -1
    })
    body.setAttribute('aria-labelledby', `doa-tab-${tab}`)
    const act = root.querySelector('[data-tab].active')
    const bar = root.querySelector('.tabs')
    if (act && bar && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = act.offsetLeft - (bar.clientWidth - act.offsetWidth) / 2
    if (tab === 'quran') renderQuran()
    else if (tab === 'harian') renderHarian()
    else renderDzikir(tab)
  }
  const tablist = root.querySelector('.tabs')
  tablist.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]')
    if (b) {
      if (b.dataset.tab === 'harian' && tab === 'harian') cat = null
      tab = b.dataset.tab
      render()
    }
  })
  tablist.addEventListener('keydown', (e) => {
    const current = e.target.closest('[role="tab"]')
    if (!current) return
    const tabs = [...tablist.querySelectorAll('[role="tab"]')]
    const index = tabs.indexOf(current)
    const next = e.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : e.key === 'ArrowLeft' ? tabs[(index - 1 + tabs.length) % tabs.length] : e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : null
    if (!next) return
    e.preventDefault()
    next.focus()
    next.click()
  })
  body.addEventListener('toggle', (e) => {
    if (e.target.matches('details[data-i]') && e.target.open) fillQuran(e.target)
    if (e.target.matches('details[data-yasin]') && e.target.open) fillYasin(e.target)
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
    if (e.target.closest('[data-retry-yasin]')) {
      const det = e.target.closest('details[data-yasin]')
      if (det) return fillYasin(det)
    }
    const cnt = e.target.closest('[data-count]')
    if (cnt) {
      const max = +cnt.dataset.count
      const n = +cnt.dataset.n >= max ? 0 : +cnt.dataset.n + 1
      cnt.dataset.n = n
      cnt.querySelector('span').textContent = `${n} / ${max}`
      cnt.setAttribute('aria-label', `Penghitung bacaan ${n} / ${max}`)
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
      const key = sh.dataset.share
      const p = payload(key)
      if (!p) return
      const blocks = p.imageBlocks || [{ arabic: p.ar, latin: p.latin, translation: p.arti || p.text }]
      const name = key.replace(/[^a-zA-Z0-9_-]/g, '-')
      return openShare(p, {
        title: 'Bagikan doa',
        what: 'doa',
        image: {
          filename: `quranku-doa-${name}.png`,
          create: ({ theme, format }) => createShareImage({
            blocks,
            heading: p.heading || 'DOA & DZIKIR',
            reference: p.ref || p.title,
            sourceUrl: shareUrl(p, APP.origin),
            showLatin: view.latin,
            showTranslation: view.arti,
            theme,
            format
          })
        }
      })
    }
    const c = e.target.closest('[data-copyz],[data-copyn],[data-copyq]')
    if (c) {
      const key = c.dataset.copyz || (c.dataset.copyq != null ? `q:${c.dataset.copyq}` : `n:${c.dataset.copyn}`)
      const p = payload(key)
      if (p) toast((await copyText(typeof p.text === 'string' ? p.text : doaText(p))) ? 'Bacaan disalin' : 'Gagal menyalin')
    }
  })
  input.addEventListener('input', debounce(render, 150))
  applyView()
  render()
}
