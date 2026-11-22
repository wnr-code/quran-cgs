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
const akadHtml = () => `<div class="akad" data-akad>
      <p>Kami membuka kesempatan bagi siapa pun yang ingin memberikan <b>infaq atau sedekah secara sukarela</b> sebagai dukungan terhadap pengembangan, pemeliharaan, operasional, dan keberlangsungan QuranKu.</p>
      <ul class="akad-list">
        <li>${icon('check')}<span><b>Pemberian sukarela (hibah/sedekah), bukan jual beli.</b> Tidak ada barang, ayat, fitur, atau layanan yang dijual. Al-Qur'an dan seluruh isi aplikasi tidak diperjualbelikan dan tetap gratis.</span></li>
        <li>${icon('check')}<span><b>Bukan pinjaman, investasi, atau titipan.</b> Tidak ada pengembalian, bagi hasil, keuntungan, ataupun imbalan apa pun yang dijanjikan.</span></li>
        <li>${icon('check')}<span><b>Menjadi milik pengelola setelah diterima.</b> Dana dipakai untuk biaya server dan domain, pengembangan, pemeliharaan, operasional, <b>termasuk kebutuhan hidup pengelolanya</b> agar dapat terus mengurus QuranKu.</span></li>
        <li>${icon('check')}<span><b>Bukan zakat dan bukan wakaf.</b> Mohon tidak meniatkannya sebagai zakat; salurkan zakat Anda kepada amil yang berwenang.</span></li>
        <li>${icon('check')}<span><b>Tanpa paksaan dan tanpa batas nominal.</b> Berilah dari harta yang halal dan tidak memberatkan diri maupun keluarga.</span></li>
        <li>${icon('check')}<span><b>Transparan soal potongan.</b> Pembayaran diproses penyedia layanan pembayaran pihak ketiga yang dapat mengenakan biaya layanan; yang sampai ke pengelola adalah jumlah setelah potongan itu. Sebutan unit di formulir (misalnya “Kopi”) hanyalah satuan nominal, bukan barang yang dibeli.</span></li>
        <li>${icon('check')}<span><b>Papan Kebaikan hanya menampilkan doa & ucapan.</b> Bukan imbalan dan bukan perlombaan. Nama dan nominal tidak ditampilkan demi menjaga keikhlasan; hanya pesan/doa yang Anda tulis yang dibagikan.</span></li>
      </ul>
      <p class="akad-ijab"><b>Pernyataan akad.</b> Dengan menekan tombol INFAQ dan menyelesaikan pembayaran, Anda menyatakan memberi dana tersebut secara sukarela sebagai infaq/sedekah kepada pengelola QuranKu untuk keperluan di atas, tanpa mengharap imbalan dari pengelola; dan pengelola menerimanya.</p>
      <p class="akad-doa">Semoga setiap kebaikan menjadi amal jariyah dan Allah Subhanahu wa Ta'ala membalasnya dengan sebaik-baik balasan.<br /><b>Jazakumullahu khairan katsiran.</b></p>
    </div>
    <div class="akad-actions"><button type="button" class="btn btn-primary btn-block" data-akad-ok>${icon('check')}Bismillah, saya setuju & lanjut</button><button type="button" class="btn btn-block" data-close>Nanti saja</button></div>`

export default function infaq(root) {
  root.innerHTML = `<div class="page infaq-page">${pageHeader('Infaq Pengembang')}
    <section class="card infaq-hero ornament">${icon('heart', 'infaq-ic')}
      <h2>Dukung Pengembangan QuranKu</h2>
      <p class="np-sub">QuranKu tetap gratis dan tanpa iklan, memberi ataupun tidak. Aplikasi tidak memakai pelacak iklan atau analitik. Formulir pembayaran dimuat dari Trakteer setelah Anda menekan tombol.</p>
      <button type="button" class="trbtn-infaq" data-infaq-open><img src="${TRBTN.img}" alt="" width="22" height="22" decoding="async" data-trbtn-img /><span>${TRBTN.text}</span></button>
      <button type="button" class="akad-link" data-akad-open>${icon('info')}Baca akad & tujuan infaq</button>
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
  trImg.addEventListener('error', () => (trImg.hidden = true)) // offline / gambar tidak termuat: tombol tetap tampil
  let alive = true
  let data = null
  let overlay = null
  let refreshTimers = []

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

  // ---------- Popup akad ----------
  let sheet = null
  function openAkad() {
    if (sheet || overlay) return
    sheet = openSheet({
      title: 'Akad & Tujuan Infaq',
      content: akadHtml(),
      onOpen(body, close) {
        body.querySelector('[data-akad-ok]').onclick = () => {
          close()
          openOverlay()
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
      doaEl.innerHTML = data.doa.length
        ? `<ul class="doa-list" aria-label="Doa & ucapan">${data.doa
            .map(
              (r) => `<li class="doa-item"><blockquote class="doa-msg">${esc(r.message)}</blockquote><small class="doa-meta">Hamba Allah · ${formatDateTime(r.at)}</small></li>`
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
    if (t.closest('[data-infaq-open]') || t.closest('[data-akad-open]')) return openAkad()
    if (t.closest('[data-reload]')) {
      doaEl.innerHTML = skeleton(3)
      return load(true)
    }
  })
  const onVisible = () => document.visibilityState === 'visible' && alive && load(true)
  document.addEventListener('visibilitychange', onVisible)

  load()

  return () => {
    alive = false
    refreshTimers.forEach(clearTimeout)
    overlay && overlay.close()
    sheet && sheet.close()
    document.removeEventListener('visibilitychange', onVisible)
  }
}
