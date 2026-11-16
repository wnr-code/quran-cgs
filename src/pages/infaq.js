// Infaq pengembang: tombol INFAQ → popup resmi Trakteer (sematan "overlay") ditampilkan DI ATAS halaman ini.
// Tidak ada tab baru, tidak ada window.open, halaman tidak berpindah. Nominal, nama, dan pesan diisi di formulir Trakteer.
// Aplikasi tidak pernah menyimpulkan "sudah bayar" dari tertutupnya popup: papan donatur hanya berisi data
// yang dikirim Trakteer ke server lewat webhook (/api/trakteer-webhook).
import { pageHeader, skeleton } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { getDonors } from '../api/donors-api.js'
import { openSheet } from '../components/modal.js'
import { $, esc, toast } from '../utils/helpers.js'
import { formatRupiah, formatDateTime } from '../utils/format.js'

const PERIODS = { daily: 'Hari ini', weekly: 'Minggu ini', monthly: 'Bulan ini', all: 'Semua' }

// Identitas tombol sesuai kode sematan Trakteer milik pengelola (teks, warna, alamat, gambar, ukuran).
export const TRBTN = {
  text: 'INFAQ',
  color: '#1A6275',
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
const TICKER = 'Jika pembayaran blank atau tidak muncul: kembali lalu pilih QRIS atau transfer bank/virtual account. GoPay & ShopeePay tidak dapat berjalan di jendela ini — ketuk tulisan ini untuk membuka halaman pembayaran.'
const TRAKTEER_ORIGIN = new URL(TRBTN.url).origin

const initial = (name) => (String(name || '').trim().match(/[\p{L}\p{N}]/u) || ['H'])[0].toUpperCase()

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
        <li>${icon('check')}<span><b>Papan donatur hanya ucapan terima kasih.</b> Bukan imbalan dan bukan perlombaan. Bila ingin menjaga keikhlasan, isi nama “Hamba Allah”.</span></li>
      </ul>
      <p class="akad-ijab"><b>Pernyataan akad.</b> Dengan menekan tombol INFAQ dan menyelesaikan pembayaran, Anda menyatakan memberi dana tersebut secara sukarela sebagai infaq/sedekah kepada pengelola QuranKu untuk keperluan di atas, tanpa mengharap imbalan dari pengelola; dan pengelola menerimanya.</p>
      <p class="akad-doa">Semoga setiap kebaikan menjadi amal jariyah dan Allah Subhanahu wa Ta'ala membalasnya dengan sebaik-baik balasan.<br /><b>Jazakumullahu khairan katsiran.</b></p>
    </div>
    <div class="akad-actions"><button type="button" class="btn btn-primary btn-block" data-akad-ok>${icon('check')}Bismillah, saya setuju & lanjut</button><button type="button" class="btn btn-block" data-close>Nanti saja</button></div>`

export default function infaq(root) {
  root.innerHTML = `<div class="page infaq-page">${pageHeader('Infaq Pengembang')}
    <section class="card infaq-hero ornament">${icon('heart', 'infaq-ic')}
      <h2>Dukung Pengembangan QuranKu</h2>
      <p class="np-sub">QuranKu hadir sebagai aplikasi Al-Qur'an yang gratis, tanpa iklan, dan tanpa pelacakan — dan akan tetap gratis bagi siapa pun, memberi ataupun tidak.</p>
      <button type="button" class="trbtn-infaq" data-infaq-open style="--trbtn:${TRBTN.color}"><img src="${TRBTN.img}" alt="" width="22" height="22" decoding="async" data-trbtn-img /><span>${TRBTN.text}</span></button>
      <button type="button" class="akad-link" data-akad-open>${icon('info')}Baca akad & tujuan infaq</button>
    </section>
    <p class="hint pad infaq-note">Di dalam aplikasi, gunakan <b>QRIS</b> atau <b>transfer bank/virtual account</b>. Dompet digital seperti GoPay dan ShopeePay perlu membuka aplikasinya sehingga tidak dapat berjalan di jendela ini — untuk itu <a href="${TRBTN.url}" target="_blank" rel="noopener noreferrer" data-trk-direct>buka halaman pembayaran</a>.</p>
    <div class="infaq-stats" data-stats hidden></div>
    <section class="card"><p class="eyebrow">${icon('trophy')} Papan donatur</p>
      <div class="tabs small" data-tabs>${Object.entries(PERIODS).map(([k, v]) => `<button data-p="${k}">${v}</button>`).join('')}</div>
      <div data-top>${skeleton(3)}</div></section>
    <section class="card"><p class="eyebrow">${icon('heart')} Ucapan & doa donatur</p><div data-latest>${skeleton(4)}</div></section>
    <p class="hint pad">Nama dan ucapan yang tampil adalah yang Anda tulis di formulir infaq (boleh “Hamba Allah”, ucapan boleh dikosongkan). Papan diperbarui otomatis setelah pembayaran dikonfirmasi penyedia. Periode dihitung menurut Waktu Indonesia Barat (WIB).</p>
  </div>`
  const page = root.firstElementChild
  const topEl = $('[data-top]', root)
  const latestEl = $('[data-latest]', root)
  const statsEl = $('[data-stats]', root)
  const trImg = $('[data-trbtn-img]', root)
  trImg.addEventListener('error', () => (trImg.hidden = true)) // offline / gambar tidak termuat: tombol tetap tampil
  let alive = true
  let data = null
  let period = 'all'
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
    frame.src = embedUrl(TRBTN.url, location.origin + location.pathname)
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

  // ---------- Papan donatur ----------
  const renderTop = () => {
    root.querySelectorAll('[data-p]').forEach((b) => b.classList.toggle('active', b.dataset.p === period))
    if (!data) return
    const rows = data.top[period]
    if (!rows.length) {
      topEl.innerHTML = `<div class="infaq-empty">${icon('trophy')}<p>Belum ada infaq pada periode ini.<br />Jadilah yang pertama, insyaallah berkah.</p></div>`
      return
    }
    const col = (r, i) =>
      r
        ? `<div class="podium-col p${i + 1}"><span class="podium-ava">${esc(initial(r.name))}<i class="podium-rank">${i + 1}</i></span><span class="podium-name">${esc(r.name)}</span><span class="podium-amt">${formatRupiah(r.amount)}</span><span class="podium-base"></span></div>`
        : '<div class="podium-col"></div>'
    const rest = rows.slice(3)
    topEl.innerHTML = `<div class="podium">${col(rows[1], 1)}${col(rows[0], 0)}${col(rows[2], 2)}</div>
      ${rest.length ? `<ol class="donor-list" start="4">${rest.map((r, i) => `<li><span class="medal">${i + 4}</span><span class="donor-name">${esc(r.name)}<small>${r.count}× infaq</small></span><b>${formatRupiah(r.amount)}</b></li>`).join('')}</ol>` : ''}`
  }
  async function load(fresh = false) {
    try {
      data = await getDonors(fresh)
      if (!alive) return
      renderTop()
      statsEl.hidden = !data.totals.count
      statsEl.innerHTML = `<div class="infaq-stat"><small>Total terkumpul</small><b>${formatRupiah(data.totals.amount)}</b></div><div class="infaq-stat"><small>Jumlah infaq</small><b>${data.totals.count}×</b></div>`
      latestEl.innerHTML = data.latest.length
        ? `<ul class="wish-list">${data.latest
            .map(
              (r) => `<li class="wish"><span class="wish-ava">${esc(initial(r.name))}</span><div class="wish-body">
                <div class="wish-head"><strong>${esc(r.name)}</strong><b>${formatRupiah(r.amount)}</b></div><small>${formatDateTime(r.at)}</small>
                ${r.message ? `<p class="wish-msg">${esc(r.message)}</p>` : ''}</div></li>`
            )
            .join('')}</ul>`
        : `<div class="infaq-empty">${icon('heart')}<p>Belum ada ucapan.<br />Tulis doa atau pesan Anda di formulir infaq.</p></div>`
    } catch {
      if (!alive) return
      topEl.innerHTML = `<div class="state small">${icon('cloudOff', 'state-icon')}<p>${navigator.onLine ? 'Papan donatur belum dapat dimuat.' : 'Papan donatur memerlukan koneksi internet.'}</p><button class="btn sm" data-reload>${icon('refresh')}Muat ulang</button></div>`
      latestEl.innerHTML = '<p class="muted">—</p>'
    }
  }

  page.addEventListener('click', (e) => {
    const t = e.target
    if (t.closest('[data-infaq-open]') || t.closest('[data-akad-open]')) return openAkad()
    const p = t.closest('[data-p]')
    if (p) {
      period = p.dataset.p
      return renderTop()
    }
    if (t.closest('[data-reload]')) {
      topEl.innerHTML = skeleton(3)
      return load(true)
    }
  })
  const onVisible = () => document.visibilityState === 'visible' && alive && load(true)
  document.addEventListener('visibilitychange', onVisible)

  renderTop()
  load()

  return () => {
    alive = false
    refreshTimers.forEach(clearTimeout)
    overlay && overlay.close()
    sheet && sheet.close()
    document.removeEventListener('visibilitychange', onVisible)
  }
}
