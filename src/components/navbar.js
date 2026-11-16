import { icon } from './icons.js'

// Floating bottom navigation for the shared PWA / Capacitor interface.
const ITEMS = [
  { path: '/', label: 'Beranda', icon: 'home' },
  { path: '/murottal', label: 'Murottal', icon: 'headphones' },
  { path: '/quran', label: 'Quran', icon: 'book', fab: true },
  { path: '/bookmark', label: 'Bookmark', icon: 'bookmark' },
  { path: '/lainnya', label: 'Lainnya', icon: 'grid' }
]

export function renderNavbar(el) {
  el.innerHTML = ITEMS.map((item) =>
    item.fab
      ? `<a href="#${item.path}" data-path="${item.path}" class="nav-item nav-fab" aria-label="Baca Al-Qur'an"><span class="fab-disc">${icon(item.icon)}</span><span>${item.label}</span></a>`
      : `<a href="#${item.path}" data-path="${item.path}" class="nav-item">${icon(item.icon)}<span>${item.label}</span></a>`
  ).join('')
}

export function setActiveNav(el, path) {
  const main = ['/quran', '/murottal', '/bookmark']
  let active = '/lainnya'
  if (path === '/') active = '/'
  else if (path.startsWith('/surah') || path.startsWith('/tafsir') || path.startsWith('/cari')) active = '/quran'
  else {
    const match = main.find((candidate) => path.startsWith(candidate))
    if (match) active = match
  }
  for (const anchor of el.querySelectorAll('.nav-item')) {
    const selected = anchor.dataset.path === active
    anchor.classList.toggle('active', selected)
    if (selected) anchor.setAttribute('aria-current', 'page')
    else anchor.removeAttribute('aria-current')
  }
}
