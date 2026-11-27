import { pageHeader } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { getInboxItems, markAllInboxRead, markInboxItemRead } from '../services/inbox.js'
import { esc, on, openExternal } from '../utils/helpers.js'
import { navigate } from '../router.js'

const TYPE_LABEL = { content: 'Konten baru', update: 'Pembaruan aplikasi', reminder: 'Pengingat' }
const TYPE_ICON = { content: 'book', update: 'refresh', reminder: 'clock' }

function dateLabel(value) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

function dateTime(value) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : ''
}

export default function notifications(root) {
  let renderToken = 0
  let items = []

  const render = async () => {
    const token = ++renderToken
    const current = await getInboxItems()
    if (token !== renderToken) return
    items = current
    const unread = items.filter((item) => item.unread).length
    const read = items.length - unread
    root.innerHTML = `<div class="page inbox-page">${pageHeader('Notifikasi', {
      actions: `<button type="button" class="icon-btn" data-inbox-mark-all aria-label="Tandai semua sudah dibaca" title="Tandai semua dibaca" ${unread ? '' : 'disabled'}>${icon('check')}</button>`
    })}
      <section class="card inbox-summary" aria-live="polite">
        <span class="inbox-summary-icon">${icon('bell')}</span>
        <span class="inbox-summary-copy"><strong>${unread ? `${unread} informasi belum dibaca` : 'Semua informasi sudah dibaca'}</strong><small>${read ? `${read} informasi tersimpan di riwayat` : 'Info baru, pembaruan, dan pengingat Anda ada di sini.'}</small></span>
      </section>
      ${items.length ? `<div class="inbox-list" aria-label="Daftar notifikasi">${items.map((item) => `<article class="card inbox-card${item.unread ? ' is-unread' : ''}">
        <div class="inbox-card-head"><span class="inbox-item-icon type-${esc(item.type)}">${icon(TYPE_ICON[item.type] || 'bell')}</span><div class="inbox-item-title"><div class="inbox-meta"><span>${esc(TYPE_LABEL[item.type] || 'Informasi')}</span><span class="inbox-state">${item.unread ? 'Belum dibaca' : 'Sudah dibaca'}</span></div><h2>${esc(item.title)}</h2><time datetime="${dateTime(item.at)}">${esc(dateLabel(item.at))}</time></div></div>
        <p>${esc(item.body)}</p>
        <div class="inbox-card-actions"><button type="button" class="btn btn-sm${item.unread ? ' btn-primary' : ''}" data-inbox-open="${esc(item.id)}">${item.unread ? 'Buka informasi' : 'Buka lagi'}${icon('forward')}</button></div>
      </article>`).join('')}</div>` : `<div class="card inbox-empty"><span class="inbox-empty-icon">${icon('bell')}</span><h2>Belum ada informasi</h2><p>Info baru dan pengingat yang muncul akan tersimpan di sini.</p></div>`}
      <p class="hint inbox-privacy">Informasi dan status baca disimpan di perangkat ini. Pengingat yang sudah dibuka dari notifikasi sistem ditandai sebagai dibaca.</p>
    </div>`
  }

  const handleClick = async (event) => {
    const markAll = event.target.closest('[data-inbox-mark-all]')
    if (markAll) {
      if (markAll.disabled) return
      await markAllInboxRead()
      return render()
    }
    const open = event.target.closest('[data-inbox-open]')
    if (!open) return
    const item = items.find((entry) => entry.id === open.dataset.inboxOpen)
    if (!item) return
    await markInboxItemRead(item.id)
    // Notifikasi pembaruan APK membuka Play Store (tautan luar), bukan rute aplikasi.
    if (item.external) {
      await openExternal(item.external)
      return render()
    }
    if (item.route && item.route !== '/notifikasi') navigate(item.route)
    else await render()
  }

  const stopListening = on('inbox:changed', () => void render())
  root.addEventListener('click', handleClick)
  void render()
  return () => {
    renderToken++
    stopListening()
    root.removeEventListener('click', handleClick)
  }
}
