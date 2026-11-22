// Router berbasis History API — URL bersih tanpa tanda # (mis. /surah/2/255), aman untuk hosting
// statis, mode offline, PWA, dan Capacitor Android karena setiap jalur dilayani shell yang sama.
// URL lama berbentuk /#/surah/2/255 tetap diterima lalu dirapikan ke bentuk bersih.
import { skeleton, errorState } from './components/page-layout.js'
import { esc } from './utils/helpers.js'

const routes = []
let current = { cleanup: null, token: 0 }
let viewEl
let onChange
let initial = true

/**
 * Nilai parameter rute. decodeURIComponent melempar URIError untuk persen rusak
 * (tautan terpotong seperti /surah/%E0%A4); tanpa penanganan, render berhenti
 * sebelum apa pun digambar dan pengguna melihat halaman kosong tanpa pesan.
 */
export function decodeParam(value = '') {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function addRoute(pattern, loader, meta = {}) {
  const keys = []
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$')
  routes.push({ re, keys, loader, meta, pattern })
}

/**
 * Jalur internal untuk sebuah URL, atau null bila URL bukan milik aplikasi ini.
 * Menerima bentuk bersih (/surah/2/255), bentuk hash lama (/#/surah/2/255), dan root (/#).
 */
export function internalPath(raw = location.href) {
  let url
  try {
    url = new URL(raw, location.origin)
  } catch {
    return null
  }
  if (url.origin !== location.origin) return null
  // Bentuk hash lama: semua yang setelah #/ adalah jalur router.
  if (url.hash.startsWith('#/')) return '/' + url.hash.slice(2)
  if (url.hash === '#' || url.hash === '#/') return '/'
  const path = url.pathname.replace(/\/+$/, '') || '/'
  // Shell utama.
  if (path === '/' || path === '/index.html') return '/' + url.search
  // Halaman statis & berkas aset bukan rute aplikasi.
  if (/\.[a-z0-9]+$/i.test(path)) return null
  return path + url.search
}

/** Path + query dari bentuk hash (dipertahankan untuk kompatibilitas). */
export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/'
  const [path, qs = ''] = raw.split('?')
  return { path: path.startsWith('/') ? path : '/' + path, query: Object.fromEntries(new URLSearchParams(qs)) }
}

/** Path + query yang sedang aktif, dibaca dari location (bukan dari hash). */
export function currentRoute() {
  const raw = internalPath() || '/'
  const [path, qs = ''] = raw.split('?')
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs)) }
}

export function navigate(path, { replace = false } = {}) {
  const target = path.startsWith('/') ? path : '/' + path
  if (replace) history.replaceState(null, '', target)
  else history.pushState(null, '', target)
  return render()
}

export function goBack(fallback = '/') {
  if ((+sessionStorage.getItem('qk-nav') || 0) > 1) history.back()
  else navigate(fallback)
}

async function render() {
  const { path, query } = currentRoute()
  let match = null
  let params = {}
  for (const r of routes) {
    const m = r.re.exec(path)
    if (m) {
      match = r
      r.keys.forEach((k, i) => (params[k] = decodeParam(m[i + 1])))
      break
    }
  }
  if (!match) {
    history.replaceState(null, '', '/')
    return render()
  }
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
  // Sheet/dialog menutup diri saat rute berubah; pushState tidak memicu hashchange.
  dispatchEvent(new Event('qk:route'))
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

/**
 * Rapikan URL hash lama (?adzan=subuh#/salat) tanpa memuat ulang halaman.
 * Query di depan hash harus dipertahankan karena dipakai notifikasi adzan;
 * bila jalur hash sendiri membawa query, query itu yang diutamakan.
 */
function migrateLegacyHash() {
  const { hash, search, pathname } = location
  if (hash.startsWith('#/')) {
    const inner = hash.slice(2)
    const [path, innerQuery = ''] = inner.split('?')
    const query = innerQuery || search.replace(/^\?/, '')
    const clean = '/' + path.replace(/^\/+/, '') + (query ? '?' + query : '')
    history.replaceState(null, '', clean)
  } else if (hash === '#' || hash === '#/') {
    history.replaceState(null, '', pathname + search)
  }
}

export function startRouter(el, changeCb) {
  viewEl = el
  onChange = changeCb
  migrateLegacyHash()
  addEventListener('popstate', render)
  // Tautan internal ditangani router (tanpa reload). Tautan luar, berkas statis,
  // target="_blank", dan klik dengan tombol pengubah dibiarkan seperti biasa.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest?.('a[href]')
    if (a) {
      const href = a.getAttribute('href') || ''
      const opensElsewhere = a.target && a.target !== '_self'
      if (href.startsWith('/') && !opensElsewhere && !a.hasAttribute('download') && !/\.[a-z0-9]+$/i.test(href.split('?')[0])) {
        e.preventDefault()
        navigate(href)
        return
      }
    }
    // Tombol kembali generik
    const b = e.target.closest('[data-back]')
    if (b) {
      e.preventDefault()
      goBack(b.dataset.back || '/')
    }
  })
  render()
}

export const rerender = render
