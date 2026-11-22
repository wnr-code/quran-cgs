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
    removeEventListener('qk:route', close)
    if (--openCount <= 0) {
      openCount = 0
      document.body.classList.remove('sheet-open')
    }
    setTimeout(() => wrap.remove(), 220)
    onClose && onClose()
  }
  const onKey = (e) => e.key === 'Escape' && close()
  document.addEventListener('keydown', onKey)
  addEventListener('qk:route', close)
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
