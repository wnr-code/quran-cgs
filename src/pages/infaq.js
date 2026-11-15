import { pageHeader, skeleton } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { TRAKTEER } from '../config.js'
import { getDonors } from '../api/donors-api.js'
import { $, esc } from '../utils/helpers.js'
import { formatRupiah, formatDateTime } from '../utils/format.js'

const PERIODS = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', all: 'Sepanjang waktu' }
let period = 'daily'

export default async function infaq(root) {
  root.innerHTML = `<div class="page">${pageHeader('Infaq Pengembang')}
    <section class="card infaq-hero ornament">${icon('heart', 'infaq-ic')}
      <h2>Dukung pengembangan QuranKu</h2>
      <p class="np-sub">QuranKu gratis, tanpa iklan, dan tanpa pelacakan. Infaq Anda membantu biaya pengembangan dan pemeliharaan. Jazakumullahu khairan.</p>
      ${TRAKTEER.url
        ? `<a class="btn btn-gold btn-block" href="${esc(TRAKTEER.url)}" target="_blank" rel="noopener noreferrer">${icon('gift')}Infaq melalui Trakteer</a><p class="hint on-dark">Anda akan diarahkan ke trakteer.id/${esc(TRAKTEER.username)}. Pembayaran diproses sepenuhnya oleh Trakteer.</p>`
        : `<p class="notice">Tautan Trakteer belum dikonfigurasi oleh pengelola (isi <code>VITE_TRAKTEER_USERNAME</code>).</p>`}
    </section>
    <section class="card"><p class="eyebrow">${icon('trophy')} Top donatur</p>
      <div class="tabs small" data-tabs>${Object.entries(PERIODS).map(([k, v]) => `<button data-p="${k}">${v}</button>`).join('')}</div>
      <div data-top>${skeleton(3)}</div></section>
    <section class="card"><p class="eyebrow">Donatur terbaru</p><div data-latest>${skeleton(4)}</div></section>
    <p class="hint pad">Nama yang tampil adalah nama yang diisi donatur di Trakteer (boleh anonim/“Seseorang”). Papan diperbarui otomatis setelah infaq terkonfirmasi. Periode dihitung menurut Waktu Indonesia Barat (WIB).</p>
  </div>`
  const topEl = $('[data-top]', root)
  const latestEl = $('[data-latest]', root)
  let data = null

  const medal = (i) => (i < 3 ? `<span class="medal m${i + 1}">${i + 1}</span>` : `<span class="medal">${i + 1}</span>`)
  const renderTop = () => {
    root.querySelectorAll('[data-p]').forEach((b) => b.classList.toggle('active', b.dataset.p === period))
    if (!data) return
    const rows = data.top[period]
    topEl.innerHTML = rows.length
      ? `<ol class="donor-list">${rows.map((r, i) => `<li>${medal(i)}<span class="donor-name">${esc(r.name)}<small>${r.count}× infaq</small></span><b>${formatRupiah(r.amount)}</b></li>`).join('')}</ol>`
      : `<p class="muted">Belum ada infaq pada periode ${PERIODS[period].toLowerCase()} ini. Jadilah yang pertama.</p>`
  }
  const load = async () => {
    try {
      data = await getDonors()
      renderTop()
      latestEl.innerHTML = data.latest.length
        ? `<ul class="donor-list">${data.latest.map((r) => `<li><span class="medal">${icon('heart')}</span><span class="donor-name">${esc(r.name)}<small>${r.quantity ? `${r.quantity} ${esc(r.unit)} · ` : ''}${formatDateTime(r.at)}</small></span><b>${formatRupiah(r.amount)}</b></li>`).join('')}</ul><p class="hint">Total terkumpul: ${formatRupiah(data.totals.amount)} dari ${data.totals.count} infaq.</p>`
        : '<p class="muted">Belum ada donatur tercatat.</p>'
    } catch {
      const msg = `<div class="state small">${icon('cloudOff', 'state-icon')}<p>${navigator.onLine ? 'Papan donatur belum aktif atau tidak dapat dihubungi. Fitur ini memerlukan Cloudflare Pages Functions + D1 (lihat docs/INFAQ.md).' : 'Papan donatur memerlukan koneksi internet.'}</p><button class="btn sm" data-reload>${icon('refresh')}Muat ulang</button></div>`
      topEl.innerHTML = msg
      latestEl.innerHTML = '<p class="muted">—</p>'
    }
  }
  root.firstElementChild.addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]')
    if (b) {
      period = b.dataset.p
      renderTop()
    } else if (e.target.closest('[data-reload]')) {
      topEl.innerHTML = skeleton(3)
      load()
    }
  })
  renderTop()
  load()
}
