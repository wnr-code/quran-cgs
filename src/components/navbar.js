import { icon } from './icons.js'

const ITEMS = [
  { path: '/', label: 'Beranda', icon: 'home' },
  { path: '/quran', label: 'Quran', icon: 'book' },
  { path: '/murottal', label: 'Murottal', icon: 'headphones' },
  { path: '/bookmark', label: 'Bookmark', icon: 'bookmark' },
  { path: '/lainnya', label: 'Lainnya', icon: 'grid' }
]

export function renderNavbar(el) {
  el.innerHTML = ITEMS.map((i) => `<a href="#${i.path}" data-path="${i.path}" class="nav-item">${icon(i.icon)}<span>${i.label}</span></a>`).join('')
}

export function setActiveNav(el, path) {
  const main = ['/quran', '/murottal', '/bookmark']
  let active = '/lainnya'
  if (path === '/') active = '/'
  else if (path.startsWith('/surah') || path.startsWith('/tafsir') || path.startsWith('/cari')) active = '/quran'
  else {
    const m = main.find((p) => path.startsWith(p))
    if (m) active = m
  }
  for (const a of el.querySelectorAll('.nav-item')) {
    const on = a.dataset.path === active
    a.classList.toggle('active', on)
    if (on) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  }
}

export function pageHeader(title, { back = true, actions = '', subtitle = '' } = {}) {
  return `<header class="page-head">
    ${back ? `<button class="icon-btn" data-back aria-label="Kembali">${icon('back')}</button>` : ''}
    <div class="page-title"><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>
    <div class="page-actions">${actions}</div>
  </header>`
}

export const skeleton = (n = 6, cls = '') => `<div class="skeleton-list">${Array.from({ length: n }, () => `<div class="skeleton ${cls}"></div>`).join('')}</div>`

export const emptyState = (iconName, title, text = '', action = '') =>
  `<div class="state">${icon(iconName, 'state-icon')}<h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${action}</div>`

export const errorState = (text, retryAttr = 'data-retry') =>
  `<div class="state state-error">${icon('cloudOff', 'state-icon')}<h3>Tidak dapat memuat data</h3><p>${text}</p><button class="btn btn-primary" ${retryAttr}>${icon('refresh')}Coba lagi</button></div>`
