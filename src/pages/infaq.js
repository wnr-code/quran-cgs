// Infaq pengembang: pilih nominal → kode pembayaran / halaman pembayaran → menunggu → terima kasih.
// Seluruh status dikonfirmasi server dari data transaksi sukses; halaman ini tidak pernah menganggap lunas sendiri.
import { pageHeader, skeleton } from '../components/navbar.js'
import { icon } from '../components/icons.js'
import { getDonors } from '../api/donors-api.js'
import { getInfaqConfig, createInfaq, getInfaqStatus, claimInfaq } from '../api/infaq-api.js'
import { openSheet } from '../components/modal.js'
import { $, esc, toast } from '../utils/helpers.js'
import { formatRupiah, formatDateTime } from '../utils/format.js'

const PERIODS = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', all: 'Sepanjang waktu' }
const PRESETS = [1, 2, 5, 10, 20, 50]
const STORE = 'quranku:infaq'
const POLL_MS = 4000
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
    <section class="card infaq-flow" data-flow aria-live="polite">${skeleton(3)}</section>
    <section class="card"><p class="eyebrow">${icon('trophy')} Top donatur</p>
      <div class="tabs small" data-tabs>${Object.entries(PERIODS).map(([k, v]) => `<button data-p="${k}">${v}</button>`).join('')}</div>
      <div data-top>${skeleton(3)}</div></section>
    <section class="card"><p class="eyebrow">Donatur terbaru</p><div data-latest>${skeleton(4)}</div></section>
    <p class="hint pad">Nama yang tampil adalah nama yang diisi saat berinfaq (boleh “Hamba Allah”). Papan diperbarui otomatis setelah infaq terkonfirmasi. Periode dihitung menurut Waktu Indonesia Barat (WIB).</p>
  </div>`
  const page = root.firstElementChild
  const flow = $('[data-flow]', root)
  const topEl = $('[data-top]', root)
  const latestEl = $('[data-latest]', root)
  let cfg = null
  let intent = null
  let quantity = 2
  let timer = null
  let tick = null
  let popup = null
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
    if (!cfg || !cfg.enabled) {
      flow.innerHTML = `<div class="state small">${icon('cloudOff', 'state-icon')}<p>${navigator.onLine ? 'Infaq belum dapat diterima saat ini. Silakan coba lagi nanti.' : 'Infaq memerlukan koneksi internet.'}</p><button class="btn sm" data-retry-config>${icon('refresh')}Muat ulang</button></div>`
      return
    }
    const max = cfg.maxQuantity
    flow.innerHTML = `<p class="eyebrow">${icon('gift')} Pilih nominal infaq</p>
      ${message ? `<p class="infaq-alert">${esc(message)}</p>` : ''}
      <div class="amount-grid">${PRESETS.filter((q) => q <= max).map((q) => `<button type="button" class="amount${q === quantity ? ' on' : ''}" data-q="${q}">${formatRupiah(q * cfg.unitPrice)}</button>`).join('')}</div>
      <label class="field"><span>Nominal lain (kelipatan ${formatRupiah(cfg.unitPrice)})</span>
        <input type="number" inputmode="numeric" data-custom min="${cfg.unitPrice}" max="${cfg.unitPrice * max}" step="${cfg.unitPrice}" placeholder="${cfg.unitPrice * 3}" /></label>
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
    flow.innerHTML = `<div class="infaq-wait"><span class="spinner" aria-hidden="true"></span><h3>Menyiapkan pembayaran…</h3><p class="muted">Mohon tunggu sebentar, kode pembayaran sedang dibuat.</p></div>`
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
      flow.innerHTML = `<p class="eyebrow">${icon('gift')} Selesaikan pembayaran</p>${head}
        <p class="hint center">Pembayaran dibuka dalam jendela di halaman ini. Setelah selesai, tutup jendelanya — status di bawah akan diperbarui sendiri.</p>
        <button class="btn btn-gold btn-block" data-open>${icon('gift')}Bayar sekarang</button>
${waiting}${tail}`
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

  // Jendela pembayaran (popup) di dalam aplikasi: memuat formulir pembayaran penyedia dalam bingkai.
  function openPayPopup() {
    const it = intent
    if (!it) return
    if (!it.embedUrl) return void window.open(it.url, '_blank', 'noopener,noreferrer') // niat lama tanpa alamat bingkai
    closePopup()
    const origin = new URL(it.embedUrl).origin
    const onMsg = (e) => {
      if (e.origin !== origin) return
      const type = typeof e.data === 'string' ? e.data : e.data && (e.data.type || e.data.event)
      if (/clos/i.test(String(type || ''))) closePopup()
    }
    const sheet = openSheet({
      title: 'Pembayaran infaq',
      wide: true,
      content: `<div class="pay-frame"><div class="pay-loading" data-loading><span class="spinner" aria-hidden="true"></span><p class="muted">Memuat pembayaran…</p></div>
          <iframe data-frame title="Pembayaran infaq" src="${esc(it.embedUrl)}" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-write"></iframe></div>
        <p class="hint center pay-note">Isi nama <b>${esc(it.name || 'Hamba Allah')}</b> dan jumlah <b>${it.quantity}</b> (${formatRupiah(it.amount)}) agar infaq dikenali otomatis.
          Jendela kosong? <a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer" data-ext>Buka di tab baru</a>.</p>`,
      onOpen(body) {
        body.classList.add('pay-body')
        const frame = body.querySelector('[data-frame]')
        const done = () => body.querySelector('[data-loading]')?.remove()
        frame.addEventListener('load', done)
        setTimeout(done, 8000)
        addEventListener('message', onMsg)
      },
      onClose() {
        removeEventListener('message', onMsg)
        popup = null
        if (alive && intent) {
          clearTimeout(timer)
          poll() // periksa status segera setelah jendela ditutup
        }
      }
    })
    popup = sheet
  }
  const closePopup = () => popup && popup.close()

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
    closePopup()
    const it = intent
    if (kind === 'paid') {
      saveIntent(null)
      intent = null
      const d = (s && s.donation) || { name: it.name, amount: it.amount, at: Date.now() }
      flow.innerHTML = `<div class="infaq-result ok">${icon('check', 'result-ic')}<h3>Jazakumullahu khairan</h3>
        <p>Infaq sebesar <b>${formatRupiah(d.amount)}</b> atas nama <b>${esc(d.name)}</b> telah kami terima.</p>
        <p class="muted">Semoga menjadi amal jariyah dan diberkahi Allah.</p>
        <button class="btn btn-primary" data-again>Selesai</button></div>`
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
      showPayment()
    } else showForm()
  }

  page.addEventListener('click', (e) => {
    const t = e.target
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
    if (t.closest('[data-open]')) return openPayPopup()
    if (t.closest('[data-cancel]') || t.closest('[data-again]')) return showForm()
    if (t.closest('[data-dl]')) {
      const canvas = $('[data-qr]', flow)
      if (!canvas) return
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = 'qris-infaq-quranku.png'
      a.click()
      toast('Kode QR diunduh')
    }
  })
  page.addEventListener('input', (e) => {
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
    document.removeEventListener('visibilitychange', onVisible)
  }
}
