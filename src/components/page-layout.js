import { icon } from './icons.js'
import { esc } from '../utils/helpers.js'

/** Dekorasi lentera untuk tema Ramadan; disembunyikan dari teknologi bantu. */
export const ramadanLanterns = () => `<div class="ramadan-lanterns" aria-hidden="true"><span class="ramadan-lantern ramadan-lantern--one"><i></i></span><span class="ramadan-lantern ramadan-lantern--two"><i></i></span></div>`

/** Standard page title bar used by every non-reader page. */
export function pageHeader(title, { back = true, actions = '', subtitle = '' } = {}) {
  return `<header class="page-head">
    ${ramadanLanterns()}
    ${back ? `<button class="icon-btn" data-back aria-label="Kembali">${icon('back')}</button>` : ''}
    <div class="page-title"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
    <div class="page-actions">${actions}</div>
  </header>`
}

export const skeleton = (count = 6, className = '') =>
  `<div class="skeleton-list">${Array.from({ length: count }, () => `<div class="skeleton ${className}"></div>`).join('')}</div>`

export const emptyState = (iconName, title, text = '', action = '') =>
  `<div class="state">${icon(iconName, 'state-icon')}<h2>${title}</h2>${text ? `<p>${text}</p>` : ''}${action}</div>`

export const errorState = (text, retryAttr = 'data-retry') =>
  `<div class="state state-error">${icon('cloudOff', 'state-icon')}<h3>Tidak dapat memuat data</h3><p>${text}</p><button class="btn btn-primary" ${retryAttr}>${icon('refresh')}Coba lagi</button></div>`
