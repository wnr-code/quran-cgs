// Menu kecil yang muncul ketika sebagian teks ayat dipilih (tekan lama lalu geser, seperti salin-tempel).
import { icon } from './icons.js'
import { debounce, copyText, shareText, toast } from '../utils/helpers.js'
import { ayahRef } from '../utils/arabic-numbers.js'
import { getHighlights, setHighlight, highlightHtml, isCovered, snapToWords } from '../services/highlight.js'
import { APP } from '../config.js'

/**
 * @param content elemen berisi ayat (.ayah[data-a] > .ayah-text)
 * @param opts { surah, onBookmark(ayah), onMore(ayah) }
 * @returns fungsi pembersih
 */
export function initSelectionMenu(content, { surah, onBookmark, onMore }) {
  const n = surah.nomor
  const menu = document.createElement('div')
  menu.className = 'sel-menu'
  menu.setAttribute('role', 'toolbar')
  menu.setAttribute('aria-label', 'Aksi teks terpilih')
  menu.hidden = true
  document.body.appendChild(menu)
  let info = null

  const textOf = (k) => surah.ayat[k - 1].teksArab

  /** Bagian mana dari tiap ayat yang sedang dipilih: [{ ayah, start, end }] */
  function read() {
    const sel = window.getSelection ? window.getSelection() : null
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null
    const r = sel.getRangeAt(0)
    if (!content.contains(r.commonAncestorContainer) && !r.intersectsNode(content)) return null
    const parts = []
    for (const el of content.querySelectorAll('.ayah-text')) {
      if (!r.intersectsNode(el)) continue
      const ay = el.closest('.ayah')
      if (!ay || parts.some((p) => p.ayah === +ay.dataset.a)) continue
      const whole = document.createRange()
      whole.selectNodeContents(el)
      let start = 0
      let end = el.textContent.length
      if (r.compareBoundaryPoints(Range.START_TO_START, whole) > 0) {
        const pre = document.createRange()
        pre.setStart(whole.startContainer, whole.startOffset)
        pre.setEnd(r.startContainer, r.startOffset)
        start = pre.toString().length
      }
      if (r.compareBoundaryPoints(Range.END_TO_END, whole) < 0) {
        const pre = document.createRange()
        pre.setStart(whole.startContainer, whole.startOffset)
        pre.setEnd(r.endContainer, r.endOffset)
        end = pre.toString().length
      }
      const k = +ay.dataset.a
      const snapped = snapToWords(textOf(k), start, end)
      if (snapped) parts.push({ ayah: k, start: snapped[0], end: snapped[1] })
    }
    if (!parts.length) return null
    const rect = r.getBoundingClientRect()
    if (!rect.width && !rect.height) return null
    return { parts, rect, marked: parts.every((p) => isCovered(getHighlights(n, p.ayah), [p.start, p.end])) }
  }

  const refLabel = (parts) => {
    const a = parts[0].ayah
    const b = parts[parts.length - 1].ayah
    return `QS. ${surah.namaLatin} ${ayahRef(n, a)}${b !== a ? '–' + b : ''}`
  }
  const selectedText = (parts) => parts.map((p) => textOf(p.ayah).slice(p.start, p.end)).join(' ')

  function place() {
    if (!info) return
    const sel = window.getSelection()
    const rect = sel && sel.rangeCount && !sel.isCollapsed ? sel.getRangeAt(0).getBoundingClientRect() : info.rect
    const w = menu.offsetWidth
    const h = menu.offsetHeight
    // Di bawah teks terpilih (menu bawaan peramban biasanya muncul di atasnya); bila tak muat, di atas.
    let top = rect.bottom + 14
    if (top + h > innerHeight - 12) top = Math.max(8, rect.top - h - 14)
    const left = Math.max(8, Math.min(innerWidth - w - 8, rect.left + rect.width / 2 - w / 2))
    menu.style.top = Math.round(top) + 'px'
    menu.style.left = Math.round(left) + 'px'
    menu.classList.toggle('off', rect.bottom < 0 || rect.top > innerHeight)
  }

  function show(next) {
    info = next
    if (!info) {
      menu.hidden = true
      return
    }
    const btn = (act, ic, label) => `<button type="button" data-sel="${act}">${icon(ic)}<span>${label}</span></button>`
    menu.innerHTML =
      btn('copy', 'copy', 'Salin') +
      btn('mark', info.marked ? 'close' : 'check', info.marked ? 'Hapus tanda' : 'Tandai') +
      btn('bookmark', 'bookmark', 'Bookmark') +
      btn('share', 'share', 'Bagikan') +
      btn('more', 'more', 'Lainnya')
    menu.hidden = false
    place()
  }
  const hide = () => show(null)

  const refresh = debounce(() => {
    if (document.body.classList.contains('sheet-open')) return hide()
    show(read())
  }, 260)

  function repaint(k) {
    const html = highlightHtml(n, k, textOf(k))
    for (const el of content.querySelectorAll(`.ayah[data-a="${k}"] .ayah-text`)) el.innerHTML = html
  }

  // Menyentuh menu tidak boleh membatalkan pilihan teks.
  const keep = (e) => e.preventDefault()
  menu.addEventListener('pointerdown', keep)
  menu.addEventListener('mousedown', keep)
  menu.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-sel]')
    if (!b || !info) return
    const { parts } = info
    const act = b.dataset.sel
    const clear = () => {
      const sel = window.getSelection()
      sel && sel.removeAllRanges()
      hide()
    }
    if (act === 'copy') {
      const ok = await copyText(`${selectedText(parts)}\n(${refLabel(parts)})`)
      toast(ok ? 'Teks disalin' : 'Gagal menyalin')
      clear()
    } else if (act === 'mark') {
      const on = !info.marked
      for (const p of parts) {
        setHighlight(n, p.ayah, textOf(p.ayah), p.start, p.end, on)
        repaint(p.ayah)
      }
      toast(on ? 'Ditandai' : 'Tanda dihapus', 1400)
      clear()
    } else if (act === 'bookmark') {
      clear()
      onBookmark && onBookmark(parts[0].ayah)
    } else if (act === 'share') {
      const r = await shareText(refLabel(parts), `${selectedText(parts)}\n(${refLabel(parts)})`, `${APP.origin}/#/surah/${n}/${parts[0].ayah}`)
      if (r === 'copied') toast('Teks & tautan disalin')
      clear()
    } else if (act === 'more') {
      clear()
      onMore && onMore(parts[0].ayah)
    }
  })

  // Menyentuh bagian yang sudah ditandai → pilih bagian itu sehingga menu (Hapus tanda) muncul.
  const onMarkClick = (e) => {
    const m = e.target.closest && e.target.closest('mark.hl')
    if (!m || !content.contains(m)) return
    const sel = window.getSelection()
    if (!sel || !sel.isCollapsed) return
    const r = document.createRange()
    r.selectNodeContents(m)
    sel.removeAllRanges()
    sel.addRange(r)
  }
  const onScroll = () => info && place()

  document.addEventListener('selectionchange', refresh)
  content.addEventListener('click', onMarkClick)
  window.addEventListener('scroll', onScroll, { passive: true })
  content.addEventListener('scroll', onScroll, { passive: true, capture: true })
  window.addEventListener('resize', onScroll)

  return () => {
    document.removeEventListener('selectionchange', refresh)
    content.removeEventListener('click', onMarkClick)
    window.removeEventListener('scroll', onScroll)
    content.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('resize', onScroll)
    menu.remove()
  }
}
