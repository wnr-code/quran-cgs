import { icon } from './icons.js'
import { esc } from '../utils/helpers.js'

let openCount = 0

/** Bottom sheet / dialog. content: string HTML (sudah di-escape oleh pemanggil). */
export function openSheet({ title = '', content = '', onOpen, onClose, wide = false } = {}) {
  const wrap = document.createElement('div')
  wrap.className = 'sheet-wrap'
  wrap.innerHTML = `
    <div class="sheet-backdrop" data-close></div>
    <section class="sheet ${wide ? 'sheet-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="sheet-head">
        <h2>${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Tutup">${icon('close')}</button>
      </header>
      <div class="sheet-body">${content}</div>
    </section>`
  document.body.appendChild(wrap)
  openCount++
  document.body.classList.add('sheet-open')
  requestAnimationFrame(() => wrap.classList.add('open'))
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    wrap.classList.remove('open')
    document.removeEventListener('keydown', onKey)
    removeEventListener('hashchange', close)
    if (--openCount <= 0) {
      openCount = 0
      document.body.classList.remove('sheet-open')
    }
    setTimeout(() => wrap.remove(), 220)
    onClose && onClose()
  }
  const onKey = (e) => e.key === 'Escape' && close()
  document.addEventListener('keydown', onKey)
  addEventListener('hashchange', close)
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close()
  })
  const body = wrap.querySelector('.sheet-body')
  onOpen && onOpen(body, close)
  const focusable = wrap.querySelector('.sheet-body button, .sheet-body input, .sheet-body select, .sheet-body textarea')
  if (focusable && !('ontouchstart' in window)) focusable.focus({ preventScroll: true })
  return { close, el: body }
}

export function confirmDialog(message, { ok = 'Ya, lanjutkan', cancel = 'Batal', danger = false } = {}) {
  return new Promise((resolve) => {
    let result = false
    openSheet({
      title: 'Konfirmasi',
      content: `<p class="confirm-text">${esc(message)}</p>
        <div class="btn-row"><button class="btn" data-no>${esc(cancel)}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(ok)}</button></div>`,
      onOpen(body, close) {
        body.querySelector('[data-yes]').onclick = () => {
          result = true
          close()
        }
        body.querySelector('[data-no]').onclick = close
      },
      onClose: () => resolve(result)
    })
  })
}

/**
 * Dialog modal di tengah layar (desktop) / hampir setinggi layar (ponsel), berisi sebuah elemen DOM yang sudah ada.
 * Tombol kembali Android menutup dialog lebih dulu (lewat satu entri riwayat tanpa mengubah alamat).
 */
export function openDialog({ title = '', node, className = '', onClose } = {}) {
  const wrap = document.createElement('div')
  wrap.className = `dlg-wrap ${className}`.trim()
  wrap.innerHTML = `<div class="dlg-backdrop" data-dlg-close></div>
    <section class="dlg" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="dlg-head"><h2>${esc(title)}</h2><button class="dlg-x" data-dlg-close aria-label="Tutup">${icon('close')}</button></header>
      <div class="dlg-body"></div>
    </section>`
  const body = wrap.querySelector('.dlg-body')
  if (node) body.appendChild(node)
  document.body.appendChild(wrap)
  openCount++
  document.body.classList.add('sheet-open')
  requestAnimationFrame(() => wrap.classList.add('open'))
  const marker = { dlg: Date.now() + Math.random() }
  let pushed = false
  try {
    history.pushState(marker, '')
    pushed = true
  } catch {}
  let closed = false
  const finish = () => {
    if (closed) return
    closed = true
    wrap.classList.remove('open')
    document.removeEventListener('keydown', onKey)
    removeEventListener('popstate', onPop)
    if (--openCount <= 0) {
      openCount = 0
      document.body.classList.remove('sheet-open')
    }
    if (node && node.parentNode === body) body.removeChild(node) // elemen isi dikembalikan ke pemanggil
    setTimeout(() => wrap.remove(), 220)
    onClose && onClose()
  }
  // Tombol kembali (atau pindah halaman): entri riwayat dialog sudah terlepas → cukup tutup.
  const onPop = () => finish()
  const close = () => {
    if (closed) return
    const mine = pushed && history.state && history.state.dlg === marker.dlg
    finish() // tutup dulu; jangan bergantung pada popstate (isi bingkai bisa menambah entri riwayatnya sendiri)
    if (mine) history.back() // lepas entri riwayat dialog
  }
  const onKey = (e) => e.key === 'Escape' && close()
  document.addEventListener('keydown', onKey)
  addEventListener('popstate', onPop)
  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-dlg-close]')) close()
  })
  return { close, el: body, wrap }
}
