// Router berbasis hash (#/path) — aman untuk hosting statis, mode offline, dan Android TWA.
import { skeleton, errorState } from './components/navbar.js'
import { esc } from './utils/helpers.js'

const routes = []
let current = { cleanup: null, token: 0 }
let viewEl
let onChange
let initial = true

export function addRoute(pattern, loader, meta = {}) {
  const keys = []
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$')
  routes.push({ re, keys, loader, meta, pattern })
}

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = raw.split('?')
  return { path: path.startsWith('/') ? path : '/' + path, query: Object.fromEntries(new URLSearchParams(qs)) }
}

export function navigate(path, { replace = false } = {}) {
  if (replace) location.replace('#' + path)
  else location.hash = path
}

export function goBack(fallback = '/') {
  if ((+sessionStorage.getItem('qk-nav') || 0) > 1) history.back()
  else navigate(fallback)
}

async function render() {
  const { path, query } = parseHash()
  let match = null
  let params = {}
  for (const r of routes) {
    const m = r.re.exec(path)
    if (m) {
      match = r
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])))
      break
    }
  }
  if (!match) return navigate('/', { replace: true })
  const token = ++current.token
  if (current.cleanup) {
    try {
      current.cleanup()
    } catch (e) {
      console.warn(e)
    }
    current.cleanup = null
  }
  sessionStorage.setItem('qk-nav', String((+sessionStorage.getItem('qk-nav') || 0) + 1))
  onChange && onChange(path, match.meta)
  viewEl.innerHTML = `<div class="page">${skeleton(6)}</div>`
  window.scrollTo(0, 0)
  try {
    const mod = await match.loader()
    if (token !== current.token) return
    const wasInitial = initial
    initial = false
    const cleanup = await mod.default(viewEl, { params, query, path, initial: wasInitial })
    if (token !== current.token) {
      if (typeof cleanup === 'function') cleanup()
      return
    }
    current.cleanup = typeof cleanup === 'function' ? cleanup : null
  } catch (e) {
    console.error('[router]', e)
    if (token !== current.token) return
    viewEl.innerHTML = `<div class="page">${errorState(esc(navigator.onLine ? 'Halaman gagal dimuat. ' + (e.message || '') : 'Halaman ini belum tersimpan untuk offline.'))}</div>`
    const btn = viewEl.querySelector('[data-retry]')
    if (btn) btn.onclick = render
  }
}

export function startRouter(el, changeCb) {
  viewEl = el
  onChange = changeCb
  addEventListener('hashchange', render)
  // Tombol kembali generik
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-back]')
    if (b) {
      e.preventDefault()
      goBack(b.dataset.back || '/')
    }
  })
  render()
}

export const rerender = render
