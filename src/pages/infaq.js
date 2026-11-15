// Infaq pengembang: tombol INFAQ → popup "INFAQ QURANKU" di atas halaman (tanpa tab baru, tanpa pindah halaman):
// pilih nominal → formulir pembayaran Trakteer di dalam popup (bingkai) dengan jumlah unit yang sama, atau kode QRIS
// → menunggu → terima kasih. Menutup popup TIDAK dianggap membayar.
// Seluruh status dikonfirmasi server dari data transaksi sukses; halaman ini tidak pernah menganggap lunas sendiri.
import { pageHeader, skeleton } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { getDonors } from '../api/donors-api.js'
import { getInfaqConfig, createInfaq, getInfaqStatus, claimInfaq } from '../api/infaq-api.js'
import { openDialog } from '../components/modal.js'
import { $, esc, toast } from '../utils/helpers.js'
import { formatRupiah, formatDateTime } from '../utils/format.js'

const PERIODS = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', all: 'Sepanjang waktu' }
const PRESETS = [1, 2, 5, 10, 20, 50]
const STORE = 'quranku:infaq'
const POLL_MS = 4000
// Identitas tombol sesuai kode sematan Trakteer milik pengelola (teks, warna, alamat, gambar, ukuran).
export const TRBTN = {
  text: 'INFAQ',
  color: '#1A6275',
  url: 'https://trakteer.id/lanteraku/tip',
  img: 'https://mirror-uploads.trakteer.id/images/units/uic-WAJ1GG3F86NzLSXQAwcEDJTa83KnmEMF1794742909.png',
  size: 30
}
let period = 'daily'

const loadIntent = () => {
  try {
    const it = JSON.parse(localStorage.getItem(STORE) || 'null')
    return it && typeof it.id === 'string' && it.expiresAt > Date.now() ? it : null
  } catch {
    return null
  }
}
const saveIntent = (it) => {
  try {
    it ? localStorage.setItem(STORE, JSON.stringify(it)) : localStorage.removeItem(STORE)
  } catch {}
}

const ERRORS = {
  rate_limited: 'Terlalu banyak percobaan. Mohon tunggu beberapa menit lalu coba lagi.',
  not_configured: 'Infaq belum dapat diterima saat ini.',
  invalid_quantity: 'Nominal tidak valid.',
  network: 'Tidak dapat terhubung. Periksa koneksi internet Anda.'
}
const errText = (e) => ERRORS[e && e.code] || 'Terjadi kendala. Silakan coba lagi.'

async function drawQr(canvas, text) {
  const { default: qrcode } = await import('qrcode-generator')
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const quiet = 4
  const scale = Math.max(4, Math.floor(880 / (n + quiet * 2)))
  const size = (n + quiet * 2) * scale
  canvas.width = canvas.height = size
  const c = canvas.getContext('2d')
  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, size, size)
  c.fillStyle = '#000000'
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.isDark(r, col)) c.fillRect((col + quiet) * scale, (r + quiet) * scale, scale, scale)
}

export default function infaq(root) {
  root.innerHTML = `<div class="page">${pageHeader('Infaq Pengembang')}
    <section class="card infaq-hero ornament">${icon('heart', 'infaq-ic')}
      <h2>Dukung pengembangan QuranKu</h2>
      <p class="np-sub">QuranKu gratis, tanpa iklan, dan tanpa pelacakan. Infaq Anda membantu biaya pengembangan dan pemeliharaan. Jazakumullahu khairan.</p>
    </section>
    <section class="card infaq-cta">
      <button type="button" class="trbtn-infaq" data-infaq-open style="--trbtn:${TRBTN.color};--trbtn-scale:${TRBTN.size / 40}"><img src="${TRBTN.img}" alt="" width="22" height="22" decoding="async" data-trbtn-img /><span>${TRBTN.text}</span></button>
      <p class="hint center" data-cta-note>Formulir infaq terbuka dalam jendela di halaman ini.</p>
    </section>
    <section class="card"><p class="eyebrow">${icon('trophy')} Top donatur</p>
      <div class="tabs small" data-tabs>${Object.entries(PERIODS).map(([k, v]) => `<button data-p="${k}">${v}</button>`).join('')}</div>
      <div data-top>${skeleton(3)}</div></section>
    <section class="card"><p class="eyebrow">Donatur terbaru</p><div data-latest>${skeleton(4)}</div></section>
    <p class="hint pad">Nama yang tampil adalah nama yang diisi saat berinfaq (boleh “Hamba Allah”). Papan diperbarui otomatis setelah infaq terkonfirmasi. Periode dihitung menurut Waktu Indonesia Barat (WIB).</p>
  </div>`
  const page = root.firstElementChild
  // Isi alur infaq hidup di elemen terpisah; dipasang ke dalam popup saat dibuka.
  const flow = document.createElement('section')
  flow.className = 'infaq-flow'
  flow.setAttribute('data-flow', '')
  flow.setAttribute('aria-live', 'polite')
  flow.innerHTML = skeleton(3)
  const ctaNote = $('[data-cta-note]', root)
  const trImg = $('[data-trbtn-img]', root)
  trImg.addEventListener('error', () => (trImg.hidden = true)) // offline / gambar tidak termuat: tombol tetap tampil
  let dialog = null
  const openModal = () => {
    if (dialog) return
    dialog = openDialog({
      title: 'INFAQ QURANKU',
      node: flow,
      className: 'infaq-dlg',
      onClose() {
        dialog = null
        // Bingkai pembayaran dilepas saat popup ditutup; niat infaq tetap menunggu dan dipulihkan saat dibuka lagi.
        if (intent && alive) showPayment()
        updateNote()
      }
    })
    if (intent) showPayment()
  }
  const updateNote = () => {
    if (!ctaNote) return
    ctaNote.textContent = intent ? `Infaq ${formatRupiah(intent.amount)} sedang menunggu pembayaran — ketuk INFAQ untuk melanjutkan.` : 'Formulir infaq terbuka dalam jendela di halaman ini.'
  }
  const topEl = $('[data-top]', root)
  const latestEl = $('[data-latest]', root)
  let cfg = null
  let intent = null
  let quantityTouched = false
  let quantity = 2 // diganti setelah konfigurasi dimuat: pilihan yang paling dekat dengan Rp10.000
  let timer = null
  let tick = null
  let pollSeq = 0
  let alive = true
  let data = null

  const stopTimers = () => {
    pollSeq++
    clearTimeout(timer)
    clearInterval(tick)
    timer = tick = null
  }

  // ---------- Langkah 1: formulir ----------
  function showForm(message = '') {
    stopTimers()
    intent = null
    saveIntent(null)
    updateNote()
    if (!cfg || !cfg.enabled) {
      flow.innerHTML = `<div class="state small">${icon('cloudOff', 'state-icon')}<p>${navigator.onLine ? 'Infaq belum dapat diterima saat ini. Silakan coba lagi nanti.' : 'Infaq memerlukan koneksi internet.'}</p><button class="btn sm" data-retry-config>${icon('refresh')}Muat ulang</button></div>`
      return
    }
    const max = cfg.maxQuantity
    if (!quantityTouched) {
      quantity = PRESETS.filter((q) => q <= max).reduce((best, q) => (Math.abs(q * cfg.unitPrice - 10000) < Math.abs(best * cfg.unitPrice - 10000) ? q : best), 1)
    }
    flow.innerHTML = `<p class="eyebrow">${icon('gift')} Pilih nominal infaq</p>
      ${message ? `<p class="infaq-alert">${esc(message)}</p>` : ''}
      <div class="amount-grid">${PRESETS.filter((q) => q <= max).map((q) => `<button type="button" class="amount${q === quantity ? ' on' : ''}" data-q="${q}">${formatRupiah(q * cfg.unitPrice)}</button>`).join('')}</div>
      <label class="field"><span>Nominal lain (minimal ${formatRupiah(cfg.unitPrice)}, kelipatan ${formatRupiah(cfg.unitPrice)})</span>
        <input type="number" inputmode="numeric" data-custom min="${cfg.unitPrice}" max="${cfg.unitPrice * max}" step="${cfg.unitPrice}" placeholder="${Math.max(cfg.unitPrice, 15000)}" /></label>
      <label class="field"><span>Nama (tampil di papan donatur)</span><input type="text" data-name maxlength="40" placeholder="Hamba Allah" autocomplete="name" /></label>
      <label class="field"><span>Doa / pesan (opsional)</span><input type="text" data-msg maxlength="150" autocomplete="off" /></label>
      <div class="infaq-total"><span>Total infaq</span><b data-total>${formatRupiah(quantity * cfg.unitPrice)}</b></div>
      <button class="btn btn-primary btn-block" data-pay>${icon('heart')}Lanjut bayar</button>
      <p class="hint">Pembayaran melalui QRIS atau metode lain yang tersedia. Infaq bersifat sukarela dan tidak membuka fitur apa pun.</p>`
    try {
      $('[data-name]', flow).value = localStorage.getItem(STORE + ':name') || ''
    } catch {}
  }

  const setQuantity = (q, fromCustom = false) => {
    quantity = Math.max(1, Math.min(cfg.maxQuantity, q))
    quantityTouched = true
    flow.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('on', !fromCustom && +b.dataset.q === quantity))
    $('[data-total]', flow).textContent = formatRupiah(quantity * cfg.unitPrice)
    if (!fromCustom) $('[data-custom]', flow).value = ''
  }

  // ---------- Langkah 2: menyiapkan ----------
  async function pay() {
    const name = $('[data-name]', flow).value.trim()
    const message = $('[data-msg]', flow).value.trim()
    try {
      localStorage.setItem(STORE + ':name', name)
    } catch {}
    flow.innerHTML = `<div class="infaq-wait"><span class="spinner" aria-hidden="true"></span><h3>Menyiapkan pembayaran…</h3><p class="muted">Mohon tunggu sebentar.</p></div>`
    try {
      const it = await createInfaq({ quantity, name, message })
      if (!alive) return
      if (it.mode === 'redirect' && !it.url) throw Object.assign(new Error('x'), { code: 'not_configured' })
      intent = { ...it, createdAt: Date.now() }
      saveIntent(intent)
      showPayment()
    } catch (e) {
      if (alive) showForm(errText(e))
    }
  }

  // ---------- Langkah 3: bayar & menunggu ----------
  function showPayment() {
    stopTimers()
    const it = intent
    const head = `<div class="infaq-total big"><span>Infaq atas nama ${esc(it.name || 'Hamba Allah')}</span><b>${formatRupiah(it.amount)}</b></div>`
    const waiting = `<div class="infaq-status"><span class="spinner sm" aria-hidden="true"></span><span data-wait>Menunggu pembayaran…</span><b data-left></b></div>`
    const tail = `<details class="infaq-claim"><summary>Sudah bayar tetapi belum terdeteksi?</summary>
        <p class="hint">Masukkan ID transaksi yang tertera pada bukti pembayaran Anda.</p>
        <div class="claim-row"><input type="text" data-ref maxlength="100" placeholder="ID transaksi" autocomplete="off" autocapitalize="off" spellcheck="false" /><button class="btn sm" data-claim>Periksa</button></div>
        <p class="hint" data-claim-msg></p></details>
      <button class="btn btn-block" data-cancel>Batalkan</button>`
    if (it.mode === 'qris') {
      flow.innerHTML = `<p class="eyebrow">${icon('gift')} Pindai untuk membayar</p>${head}
        <div class="qr-box"><canvas data-qr width="10" height="10" role="img" aria-label="Kode QRIS pembayaran infaq"></canvas></div>
        <p class="hint center">Buka aplikasi bank atau dompet digital Anda, pilih bayar dengan QRIS, lalu pindai kode di atas. Bila memakai ponsel yang sama, unduh kodenya lalu unggah dari galeri.</p>
        <div class="btn-row center"><button class="btn sm" data-dl>${icon('download')}Unduh QR</button></div>${waiting}${tail}`
      drawQr($('[data-qr]', flow), it.qr).catch(() => {
        if (alive) $('.qr-box', flow).innerHTML = '<p class="muted">Kode QR tidak dapat ditampilkan di perangkat ini.</p>'
      })
    } else {
      // Formulir pembayaran Trakteer ditampilkan di dalam popup (bingkai). Bingkai hanya dipasang selama popup terbuka.
      const frame = dialog
        ? `<div class="trk-frame"><div class="trk-loading" data-loading><span class="spinner" aria-hidden="true"></span><p class="muted">Memuat formulir pembayaran…</p></div>
            <iframe data-frame title="Formulir infaq Trakteer" src="${esc(it.url)}" allow="payment *; clipboard-write *" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`
        : ''
      flow.innerHTML = `${head}
        <p class="hint center">Jumlah <b>${it.quantity} unit</b> (${formatRupiah(it.amount)}) sudah terisi${it.name && it.name !== 'Hamba Allah' ? `; isi nama <b>${esc(it.name)}</b>` : ''}. Jangan ubah jumlah unit agar infaq dikenali otomatis.</p>
        ${frame}${waiting}
        <details class="infaq-claim trk-help"><summary>Formulir tidak tampil atau kosong?</summary>
          <p class="hint">Sebagian peramban atau kebijakan keamanan penyedia pembayaran tidak mengizinkan formulir ditampilkan di dalam aplikasi lain. Bila itu terjadi, buka formulirnya lewat tombol ini — status di sini tetap diperbarui otomatis.</p>
          <a class="btn btn-block" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer" data-open>${icon('share')}Buka formulir pembayaran</a></details>
${tail}`
      const fr = $('[data-frame]', flow)
      if (fr) {
        const done = () => $('[data-loading]', flow)?.remove()
        fr.addEventListener('load', done)
        setTimeout(done, 9000)
      }
    }
    const left = $('[data-left]', flow)
    const countdown = () => {
      const s = Math.max(0, Math.round((it.expiresAt - Date.now()) / 1000))
      left.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
      if (s <= 0) showResult('expired')
    }
    countdown()
    tick = setInterval(countdown, 1000)
    poll()
  }

  async function poll() {
    if (!alive || !intent) return
    const seq = ++pollSeq
    let delay = POLL_MS
    try {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const s = await getInfaqStatus(intent.id)
        if (!alive || !intent || seq !== pollSeq) return
        if (s.status === 'paid') return showResult('paid', s)
        if (s.status === 'expired') return showResult('expired')
      }
    } catch (e) {
      if (e && e.status === 404) return showForm('Sesi infaq tidak ditemukan. Silakan mulai lagi.')
      delay = POLL_MS * 2
    }
    if (seq === pollSeq) timer = setTimeout(poll, delay)
  }

  async function claim() {
    const ref = $('[data-ref]', flow).value.trim()
    const msg = $('[data-claim-msg]', flow)
    if (!/^[\w-]{6,100}$/.test(ref)) {
      msg.textContent = 'ID transaksi tidak valid (minimal 6 karakter: huruf, angka, atau tanda hubung).'
      return
    }
    msg.textContent = 'Memeriksa…'
    try {
      const s = await claimInfaq(intent.id, ref)
      if (!alive) return
      if (s.status === 'paid') return showResult('paid', s)
      msg.textContent = 'Transaksi dengan ID tersebut belum ditemukan. Bila baru saja membayar, coba lagi dalam satu menit.'
    } catch (e) {
      msg.textContent = errText(e)
    }
  }

  // ---------- Langkah 4: hasil ----------
  function showResult(kind, s) {
    stopTimers()
    const it = intent
    if (kind === 'paid') {
      saveIntent(null)
      intent = null
      const d = (s && s.donation) || { name: it.name, amount: it.amount, at: Date.now() }
      flow.innerHTML = `<div class="infaq-result ok">${icon('check', 'result-ic')}<h3>Jazakumullahu khairan</h3>
        <p>Infaq sebesar <b>${formatRupiah(d.amount)}</b> atas nama <b>${esc(d.name)}</b> telah kami terima.</p>
        <p class="muted">Semoga menjadi amal jariyah dan diberkahi Allah.</p>
        <button class="btn btn-primary" data-again>Selesai</button></div>`
      if (!dialog) toast('Infaq diterima. Jazakumullahu khairan.')
      updateNote()
      load(true)
    } else {
      flow.innerHTML = `<div class="infaq-result">${icon('clock', 'result-ic')}<h3>Pembayaran belum terdeteksi</h3>
        <p class="muted">Batas waktu menunggu telah habis. Bila Anda belum membayar, tidak ada dana yang terpotong. Bila sudah membayar, masukkan ID transaksi untuk memeriksanya.</p>
        <div class="claim-row"><input type="text" data-ref maxlength="100" placeholder="ID transaksi" autocomplete="off" autocapitalize="off" spellcheck="false" /><button class="btn sm" data-claim>Periksa</button></div>
        <p class="hint" data-claim-msg></p>
        <button class="btn btn-primary" data-again>Coba lagi</button></div>`
    }
  }

  // ---------- Papan donatur ----------
  const medal = (i) => (i < 3 ? `<span class="medal m${i + 1}">${i + 1}</span>` : `<span class="medal">${i + 1}</span>`)
  const renderTop = () => {
    root.querySelectorAll('[data-p]').forEach((b) => b.classList.toggle('active', b.dataset.p === period))
    if (!data) return
    const rows = data.top[period]
    topEl.innerHTML = rows.length
      ? `<ol class="donor-list">${rows.map((r, i) => `<li>${medal(i)}<span class="donor-name">${esc(r.name)}<small>${r.count}× infaq</small></span><b>${formatRupiah(r.amount)}</b></li>`).join('')}</ol>`
      : `<p class="muted">Belum ada infaq pada periode ${PERIODS[period].toLowerCase()} ini. Jadilah yang pertama.</p>`
  }
  async function load(fresh = false) {
    try {
      data = await getDonors(fresh)
      if (!alive) return
      renderTop()
      latestEl.innerHTML = data.latest.length
        ? `<ul class="donor-list">${data.latest.map((r) => `<li><span class="medal">${icon('heart')}</span><span class="donor-name">${esc(r.name)}<small>${formatDateTime(r.at)}</small></span><b>${formatRupiah(r.amount)}</b></li>`).join('')}</ul><p class="hint">Total terkumpul: ${formatRupiah(data.totals.amount)} dari ${data.totals.count} infaq.</p>`
        : '<p class="muted">Belum ada donatur tercatat.</p>'
    } catch {
      if (!alive) return
      topEl.innerHTML = `<div class="state small">${icon('cloudOff', 'state-icon')}<p>${navigator.onLine ? 'Papan donatur belum dapat dimuat.' : 'Papan donatur memerlukan koneksi internet.'}</p><button class="btn sm" data-reload>${icon('refresh')}Muat ulang</button></div>`
      latestEl.innerHTML = '<p class="muted">—</p>'
    }
  }

  async function init() {
    try {
      cfg = await getInfaqConfig()
    } catch {
      cfg = null
    }
    if (!alive) return
    const saved = cfg && cfg.enabled ? loadIntent() : null
    if (saved) {
      intent = saved
      showPayment() // popup tidak dibuka sendiri; status tetap dipantau
      updateNote()
    } else showForm()
  }

  const onClick = (e) => {
    const t = e.target
    if (t.closest('[data-infaq-open]')) return openModal()
    const p = t.closest('[data-p]')
    if (p) {
      period = p.dataset.p
      return renderTop()
    }
    if (t.closest('[data-reload]')) {
      topEl.innerHTML = skeleton(3)
      return load(true)
    }
    if (t.closest('[data-retry-config]')) {
      flow.innerHTML = skeleton(3)
      return init()
    }
    const q = t.closest('[data-q]')
    if (q) return setQuantity(+q.dataset.q)
    if (t.closest('[data-pay]')) return pay()
    if (t.closest('[data-claim]')) return claim()
    if (t.closest('[data-cancel]')) return showForm()
    if (t.closest('[data-again]')) {
      const wasOk = !!t.closest('.infaq-result.ok')
      showForm()
      if (wasOk && dialog) dialog.close()
      return
    }
    if (t.closest('[data-dl]')) {
      const canvas = $('[data-qr]', flow)
      if (!canvas) return
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'qris-infaq-quranku.png'
      a.click()
      toast('Kode QR diunduh')
    }
  }
  page.addEventListener('click', onClick)
  flow.addEventListener('click', onClick)
  flow.addEventListener('input', (e) => {
    if (!e.target.matches('[data-custom]') || !cfg) return
    const v = parseInt(e.target.value, 10)
    if (Number.isFinite(v) && v >= cfg.unitPrice) setQuantity(Math.round(v / cfg.unitPrice), true)
  })
  const onVisible = () => {
    if (document.visibilityState === 'visible' && intent && alive) {
      clearTimeout(timer)
      poll()
    }
  }
  document.addEventListener('visibilitychange', onVisible)

  renderTop()
  load()
  init()
  return () => {
    alive = false
    stopTimers()
    dialog && dialog.close()
    document.removeEventListener('visibilitychange', onVisible)
  }
}
