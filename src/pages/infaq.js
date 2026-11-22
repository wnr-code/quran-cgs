// Infaq pengembang: tombol INFAQ → popup resmi Trakteer (sematan "overlay") ditampilkan DI ATAS halaman ini.
// Tidak ada tab baru, tidak ada window.open, halaman tidak berpindah. Nominal, nama, dan pesan diisi di formulir Trakteer.
// Aplikasi tidak pernah menyimpulkan "sudah bayar" dari tertutupnya popup: Papan Kebaikan hanya berisi doa/ucapan
// yang dikirim Trakteer ke server lewat webhook (/api/trakteer-webhook). Nama & nominal tidak ditampilkan ke publik.
import { pageHeader, skeleton } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { getDonors } from '../api/donors-api.js'
import { openSheet } from '../components/modal.js'
import { $, esc, toast } from '../utils/helpers.js'
import { formatDateTime } from '../utils/format.js'
import { Capacitor } from '@capacitor/core'
import { APP } from '../config.js'

// Identitas tombol sesuai kode sematan Trakteer milik pengelola; warna mengikuti tema QuranKu.
export const TRBTN = {
  text: 'INFAQ',
  url: 'https://trakteer.id/lanteraku/tip',
  img: 'https://mirror-uploads.trakteer.id/images/units/uic-WAJ1GG3F86NzLSXQAwcEDJTa83KnmEMF1794742909.png',
  size: 30
}

/**
 * Alamat popup sematan Trakteer untuk sebuah halaman tip.
 * `https://trakteer.id/<akun>/tip` → `https://trakteer.id/v1/<akun>/tip/embed/modal?embedId=0&ref=<halaman ini>`
 * (jalur lama tanpa `/v1` kini menampilkan 404; halaman tip biasa menolak dibingkai).
 */
export function embedUrl(tipUrl, ref = '') {
  const u = new URL(tipUrl)
  const path = u.pathname.replace(/^\/v1(?=\/)/, '').replace(/\/+$/, '')
  return `${u.origin}/v1${path}/embed/modal?embedId=0&ref=${ref}`
}

/** Use the registered public site as Trakteer's embed ref inside the Capacitor WebView. */
export function embedRef(isNative, origin, pathname = '/') {
  return new URL(pathname || '/', isNative ? APP.origin : origin).href
}

const TICKER = 'Jika pembayaran blank atau tidak muncul: kembali lalu pilih QRIS atau transfer bank/virtual account. GoPay & ShopeePay tidak dapat berjalan di jendela ini — ketuk tulisan ini untuk membuka halaman pembayaran.'
const TRAKTEER_ORIGIN = new URL(TRBTN.url).origin

// Isi popup akad: ditampilkan sebelum formulir pembayaran dibuka.
// Disusun mengikuti kaidah hibah/tabarru': penerima jelas, qabul dinyatakan, dana menjadi milik
// penerima, tanpa imbalan (menutup riba), bukan zakat/fidyah/kafarah/nazar, dan nafkah wajib lebih utama.
const akadHtml = ({ lanjut = true } = {}) => `<div class="akad" data-akad>
      <p>QuranKu tidak mewajibkan apa pun. Aplikasi tetap gratis, lengkap, dan tanpa iklan, baik Anda berinfaq maupun tidak.</p>
      <p class="akad-jenis"><b>Ini hibah, bukan jual beli.</b> Anda memberikan uang secara sukarela kepada penerima di bawah ini, dan Anda niatkan sebagai infaq atau sedekah. Bukan pinjaman, bukan titipan, bukan investasi, dan bukan wakaf.</p>
      <p class="akad-pihak"><b>Penerima:</b> Aep (WNR Code), pengembang dan pengelola resmi aplikasi QuranKu. <b>Kanal pembayaran:</b> Lanteraku, akun Trakteer milik pengelola; Trakteer dan mitranya hanya memproses pembayaran dan tidak menjadi penerima dana. <b>Penerimaan (qabul):</b> dinyatakan dengan tersedianya kanal pembayaran ini. <b>Identitas penerima</b> dapat diverifikasi lewat kontak pengelola di halaman Tentang dan data pengembang pada listing aplikasi ini.</p>
      <ul class="akad-list">
        <li>${icon('check')}<span><b>Menjadi milik penerima setelah diterima.</b> Dana digunakan untuk keperluan yang halal: biaya server dan domain, pengembangan, pemeliharaan, operasional aplikasi, serta penghidupan pengelola.</span></li>
        <li>${icon('check')}<span><b>Tanpa imbalan apa pun.</b> Tidak ada barang, ayat, fitur, konten, layanan, hak istimewa, maupun pengaruh atas isi dan keputusan aplikasi yang diberikan sebagai balasan. Al-Qur'an dan seluruh isi aplikasi tidak diperjualbelikan.</span></li>
        <li>${icon('check')}<span><b>Bukan zakat, fidyah, kafarah, atau nazar.</b> Mohon tidak meniatkannya sebagai salah satunya; salurkan zakat Anda kepada amil yang berwenang.</span></li>
        <li>${icon('check')}<span><b>Nafkah keluarga lebih utama.</b> Infaq ini sunnah; nafkah keluarga hukumnya wajib. Mohon jangan berinfaq dengan berutang atau dengan mengurangi nafkah yang wajib.</span></li>
        <li>${icon('check')}<span><b>Tanpa paksaan dan tanpa batas nominal.</b> Berilah dari harta yang halal dan sesuai kemampuan. Jika ragu atau keberatan, tidak perlu berinfaq — tidak ada konsekuensi apa pun pada aplikasi.</span></li>
        <li>${icon('check')}<span><b>Transparan soal potongan.</b> Trakteer dan mitra pembayarannya dapat mengenakan biaya layanan; jumlah yang sampai ke penerima adalah setelah potongan itu. Sebutan unit di formulir (misalnya “Kopi”) hanyalah satuan nominal, bukan barang yang dibeli.</span></li>
        <li>${icon('check')}<span><b>Papan Kebaikan hanya menampilkan doa & ucapan.</b> Bukan imbalan dan bukan perlombaan. Nama dan nominal tidak ditampilkan demi menjaga keikhlasan; hanya pesan/doa yang Anda tulis yang dibagikan.</span></li>
      </ul>
      <p class="akad-ijab"><b>Pernyataan akad.</b> Dengan menekan “Bismillah, saya setuju &amp; lanjut” lalu menyelesaikan pembayaran, saya menyatakan memberikan dana tersebut secara sukarela, sadar, tanpa paksaan, dari harta yang halal, sebagai hibah kepada Aep (WNR Code) selaku pengembang dan pengelola QuranKu, untuk keperluan yang disebut di atas, tanpa mengharapkan imbalan apa pun; dan penerima menerimanya.</p>
      <p class="akad-batal">Bila terjadi pembayaran ganda, salah nominal, atau kesalahan teknis, ajukan pengembalian dalam 7 hari melalui kontak di halaman <b>Tentang</b>.</p>
      <p class="akad-doa">Semoga Allah menerimanya dan menjadikannya amal jariyah.<br /><b>Jazakumullahu khairan katsiran.</b></p>
    </div>
    <div class="akad-actions"><button type="button" class="btn btn-primary btn-block" data-akad-ok>${icon('check')}Bismillah, saya setuju${lanjut ? ' & lanjut' : ''}</button><button type="button" class="btn btn-block" data-close>${lanjut ? 'Nanti saja' : 'Tutup'}</button></div>`

// ---------------------------------------------------------------------------
// Persetujuan akad. Akad hanya perlu sekali (ijab-qabul penanda ridha, bukan
// syarat sah sedekah), tetapi terikat pada ISI yang disetujui: bila teks akad
// berubah, persetujuan lama batal dan akad tampil lagi. Selalu bisa dibatalkan.
// ---------------------------------------------------------------------------
const AKAD_KEY = 'quranku:akad-infaq'

/** Versi = hash isi teks akad. Berubah otomatis setiap teks akad diubah. */
export function akadVersion() {
  // Teks tanpa blok tombol: label tombol bergantung konteks, isi akad tidak.
  const text = akadHtml().split('<div class="akad-actions">')[0]
  // djb2 sederhana: cukup untuk mendeteksi perubahan teks, bukan untuk keamanan.
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/** @returns {{versi:string, tanggal:string}|null} persetujuan yang masih berlaku */
export function akadConsent() {
  try {
    const v = JSON.parse(localStorage.getItem(AKAD_KEY) || 'null')
    if (!v || v.versi !== akadVersion() || !v.tanggal) return null
    return v
  } catch {
    return null
  }
}

export function setAkadConsent(ok = true) {
  try {
    if (ok) localStorage.setItem(AKAD_KEY, JSON.stringify({ versi: akadVersion(), tanggal: new Date().toISOString() }))
    else localStorage.removeItem(AKAD_KEY)
  } catch {}
  return akadConsent()
}

export default function infaq(root) {
  root.innerHTML = `<div class="page infaq-page">${pageHeader('Infaq Pengembang')}
    <section class="card infaq-hero ornament">${icon('heart', 'infaq-ic')}
      <h2>Dukung Pengembangan QuranKu</h2>
      <p class="np-sub">QuranKu tetap gratis dan tanpa iklan, memberi ataupun tidak. Aplikasi tidak memakai pelacak iklan atau analitik. Formulir pembayaran dimuat dari Trakteer setelah Anda menekan tombol.</p>
      <button type="button" class="trbtn-infaq" data-infaq-open><img src="${TRBTN.img}" alt="" width="22" height="22" decoding="async" data-trbtn-img /><span>${TRBTN.text}</span></button>
      <button type="button" class="akad-link" data-akad-open>${icon('info')}Baca akad & tujuan infaq</button>
      <p class="akad-status" data-akad-status hidden></p>
    </section>
    <p class="hint pad infaq-note">Di dalam aplikasi, gunakan <b>QRIS</b> atau <b>transfer bank/virtual account</b>. Dompet digital seperti GoPay dan ShopeePay perlu membuka aplikasinya sehingga tidak dapat berjalan di jendela ini — untuk itu <a href="${TRBTN.url}" target="_blank" rel="noopener noreferrer" data-trk-direct>buka halaman pembayaran</a>.</p>
    <div class="infaq-stats" data-stats hidden></div>
    <section class="card"><p class="eyebrow">${icon('heart')} Mutiara Doa & Ucapan</p>
      <p class="doa-ayat">“Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai, pada setiap tangkai seratus biji.” <small>QS. Al-Baqarah: 261</small></p>
      <div data-doa>${skeleton(4)}</div></section>
    <p class="hint pad">Nama & nominal tidak ditampilkan demi menjaga keikhlasan. Hanya doa/ucapan yang Anda tulis di formulir infaq yang dibagikan di sini (boleh dikosongkan) — mohon tidak menulis data pribadi di dalamnya. Papan diperbarui otomatis setelah pembayaran dikonfirmasi penyedia.</p>
  </div>`
  const page = root.firstElementChild
  const doaEl = $('[data-doa]', root)
  const statsEl = $('[data-stats]', root)
  const trImg = $('[data-trbtn-img]', root)
  const akadStatus = $('[data-akad-status]', root)
  trImg.addEventListener('error', () => (trImg.hidden = true)) // offline / gambar tidak termuat: tombol tetap tampil
  let alive = true
  let data = null
  let overlay = null
  let refreshTimers = []
  // Waktu doa terbaru yang sudah pernah tampil. Dipakai sekali untuk menyorot doa baru;
  // bukan penanda "sudah bayar", hanya hiasan tampilan.
  let seenLatest = 0

  // ---------- Popup Trakteer ----------
  function openOverlay() {
    if (overlay) return
    if (!navigator.onLine) {
      toast('Infaq memerlukan koneksi internet.')
      return
    }
    const el = document.createElement('div')
    el.className = 'trk-overlay'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-modal', 'true')
    el.setAttribute('aria-label', 'Infaq QuranKu')
    el.innerHTML = `<div class="trk-wait" data-wait><span class="spinner" aria-hidden="true"></span><h3>INFAQ QURANKU</h3><p class="muted">Membuka formulir infaq…</p></div>
      <a class="trk-ticker" href="${TRBTN.url}" target="_blank" rel="noopener noreferrer" data-trk-ticker aria-label="${TICKER}"><span class="trk-ticker-run" aria-hidden="true"><span>${TICKER}</span><span>${TICKER}</span></span></a>
      <iframe title="Formulir infaq" allow="payment *; clipboard-write *" allowtransparency="true" referrerpolicy="strict-origin-when-cross-origin"></iframe>
      <button type="button" class="trk-x" data-trk-close aria-label="Tutup">${icon('close')}</button>`
    const frame = el.querySelector('iframe')
    const say = () => {
      try {
        frame.contentWindow.postMessage({ type: 'embed.openModal' }, TRAKTEER_ORIGIN)
      } catch {}
    }
    frame.addEventListener('load', () => {
      el.querySelector('[data-wait]')?.remove()
      // Formulir penyedia punya tombol tutupnya sendiri: tombol X milik aplikasi hanya tampil selama memuat.
      el.querySelector('[data-trk-close]')?.remove()
      say()
      setTimeout(say, 400) // halaman sematan baru memasang pendengar pesan setelah skripnya berjalan
      setTimeout(say, 1200)
    })
    const ref = embedRef(Capacitor.isNativePlatform(), location.origin, location.pathname)
    frame.src = embedUrl(TRBTN.url, ref)
    document.body.appendChild(el)
    document.body.classList.add('sheet-open')
    requestAnimationFrame(() => el.classList.add('open'))

    // Tombol kembali Android menutup popup lebih dulu (satu entri riwayat, alamat tidak berubah).
    const marker = Date.now() + Math.random()
    let pushed = false
    try {
      history.pushState({ trk: marker }, '')
      pushed = true
    } catch {}
    let closed = false
    const finish = () => {
      if (closed) return
      closed = true
      overlay = null
      removeEventListener('message', onMsg)
      removeEventListener('popstate', finish)
      document.removeEventListener('keydown', onKey)
      el.classList.remove('open')
      document.body.classList.remove('sheet-open')
      setTimeout(() => el.remove(), 220)
      // Menutup popup bukan bukti bayar. Papan cukup dimuat ulang beberapa kali; infaq baru muncul
      // hanya bila penyedia benar-benar mengonfirmasinya ke server.
      if (alive) refreshTimers = [1500, 8000, 25000, 60000].map((ms) => setTimeout(() => alive && load(true), ms))
    }
    const close = () => {
      if (closed) return
      const mine = pushed && history.state && history.state.trk === marker
      finish()
      if (mine) history.back()
    }
    const onMsg = (e) => {
      if (e.origin !== TRAKTEER_ORIGIN || e.source !== frame.contentWindow) return
      if (e.data && e.data.type === 'embed.modalClosed') setTimeout(close, 200)
    }
    const onKey = (e) => e.key === 'Escape' && close()
    addEventListener('message', onMsg)
    addEventListener('popstate', finish)
    document.addEventListener('keydown', onKey)
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('[data-trk-close]')) close()
    })
    overlay = { close }
  }

  // ---------- Akad & persetujuan ----------
  let sheet = null

  /** Tampilkan "sudah menyetujui akad" + jalan untuk membatalkannya. */
  function renderAkadStatus() {
    const consent = akadConsent()
    akadStatus.hidden = !consent
    if (!consent) return
    const tgl = new Date(consent.tanggal)
    const label = Number.isFinite(tgl.getTime()) ? tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
    akadStatus.innerHTML = `Anda sudah menyetujui akad ini${label ? ` pada ${esc(label)}` : ''}. <button type="button" class="akad-reset" data-akad-reset>Batalkan persetujuan</button>`
  }

  /**
   * Alur tombol INFAQ.
   * - Belum menyetujui akad versi ini → tampilkan akad dulu (ijab-qabul).
   * - Sudah menyetujui → langsung ke formulir pembayaran; akad tetap bisa dibaca lewat tautan.
   */
  function mulaiInfaq() {
    if (akadConsent()) return openOverlay()
    openAkad({ lanjut: true })
  }

  /** @param {{lanjut?: boolean}} [opts] lanjut: setelah setuju, buka formulir pembayaran. */
  function openAkad({ lanjut = false } = {}) {
    if (sheet || overlay) return
    sheet = openSheet({
      title: 'Akad & Tujuan Infaq',
      content: akadHtml({ lanjut }),
      onOpen(body, close) {
        body.querySelector('[data-akad-ok]').onclick = () => {
          setAkadConsent(true)
          renderAkadStatus()
          close()
          if (lanjut) openOverlay()
          else toast('Persetujuan akad disimpan. Infaq berikutnya tidak menampilkan akad lagi.')
        }
      },
      onClose() {
        sheet = null
      }
    })
  }

  // ---------- Papan Kebaikan (anonim: hanya doa/ucapan + hitungan) ----------
  async function load(fresh = false) {
    try {
      data = await getDonors(fresh)
      if (!alive) return
      statsEl.hidden = !data.totals.count
      statsEl.innerHTML = `<div class="infaq-stat"><small>Kebaikan tercatat</small><b>${data.totals.count}×</b></div><div class="infaq-stat"><small>Doa & ucapan</small><b>${data.totals.doaCount} doa</b></div>`
      // Doa yang `at`-nya lebih baru dari render sebelumnya diberi sorotan singkat (sekali saja).
      // Pada muat pertama seenLatest = 0 sehingga tidak ada yang disorot.
      const latest = data.doa.reduce((m, r) => Math.max(m, r.at), 0)
      const markNew = seenLatest > 0 && latest > seenLatest
      seenLatest = Math.max(seenLatest, latest)
      doaEl.innerHTML = data.doa.length
        ? `<ul class="doa-list" aria-label="Doa & ucapan">${data.doa
            .map(
              (r, i) =>
                `<li class="doa-item${markNew && r.at > 0 && r.at === latest ? ' is-new' : ''}" style="--i:${Math.min(i, 6)}"><blockquote class="doa-msg">${esc(r.message)}</blockquote><small class="doa-meta">Hamba Allah · ${formatDateTime(r.at)}</small></li>`
            )
            .join('')}</ul>`
        : `<div class="infaq-empty">${icon('heart')}<p>Belum ada doa yang dibagikan.<br />Tulis doa atau pesan Anda di formulir infaq — ia akan tampil di sini tanpa nama & nominal.</p></div>`
    } catch {
      if (!alive) return
      doaEl.innerHTML = `<div class="state small">${icon('cloudOff', 'state-icon')}<p>${navigator.onLine ? 'Papan kebaikan belum dapat dimuat.' : 'Papan kebaikan memerlukan koneksi internet.'}</p><button class="btn sm" data-reload>${icon('refresh')}Muat ulang</button></div>`
    }
  }

  page.addEventListener('click', (e) => {
    const t = e.target
    if (t.closest('[data-infaq-open]')) return mulaiInfaq()
    if (t.closest('[data-akad-open]')) return openAkad()
    if (t.closest('[data-akad-reset]')) {
      setAkadConsent(false)
      renderAkadStatus()
      toast('Persetujuan dibatalkan. Akad akan tampil lagi saat Anda berinfaq.')
      return
    }
    if (t.closest('[data-reload]')) {
      doaEl.innerHTML = skeleton(3)
      return load(true)
    }
  })
  const onVisible = () => document.visibilityState === 'visible' && alive && load(true)
  document.addEventListener('visibilitychange', onVisible)

  renderAkadStatus()
  load()

  return () => {
    alive = false
    refreshTimers.forEach(clearTimeout)
    overlay && overlay.close()
    sheet && sheet.close()
    document.removeEventListener('visibilitychange', onVisible)
  }
}
