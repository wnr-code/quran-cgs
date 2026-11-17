import { icon } from './icons.js'
import { getInboxUnreadCount } from '../services/inbox.js'

export const notificationBell = () => `<a class="icon-btn notification-bell" href="#/notifikasi" data-inbox-bell data-count="0" aria-label="Notifikasi">
  ${icon('bell')}<span class="notification-badge" data-inbox-badge hidden></span>
</a>`

/** Paint the badge and play a single, restrained cue only when unread information increases. */
export async function refreshNotificationBell(root = document) {
  const button = root.querySelector('[data-inbox-bell]')
  if (!button) return
  const count = await getInboxUnreadCount()
  if (!button.isConnected) return
  const previous = Number(button.dataset.count) || 0
  button.dataset.count = String(count)
  button.classList.toggle('has-unread', count > 0)
  const badge = button.querySelector('[data-inbox-badge]')
  if (badge) {
    badge.hidden = count === 0
    badge.textContent = count > 9 ? '9+' : String(count)
  }
  button.setAttribute('aria-label', count ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi')
  if (count > previous) {
    button.classList.remove('notification-bell--arrive')
    void button.offsetWidth
    button.classList.add('notification-bell--arrive')
  } else if (!count) {
    button.classList.remove('notification-bell--arrive')
  }
}
