// Tanda (stabilo) pada teks ayat: disimpan di perangkat per ayat sebagai rentang karakter [awal, akhir).
// Rentang selalu dibulatkan ke batas kata supaya sambungan huruf Arab tidak terputus oleh elemen penanda.
import { esc } from '../utils/helpers.js'

const KEY = 'quranku:tanda'
let cache = null

function load() {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    cache = {}
  }
  return cache
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {}
}

const isSpace = (ch) => /\s/.test(ch)

/** Melebarkan rentang ke batas kata terdekat dan membuang spasi di tepinya. */
export function snapToWords(text, start, end) {
  let s = Math.max(0, Math.min(text.length, start))
  let e = Math.max(s, Math.min(text.length, end))
  while (s < e && isSpace(text[s])) s++
  while (e > s && isSpace(text[e - 1])) e--
  if (s >= e) return null
  while (s > 0 && !isSpace(text[s - 1])) s--
  while (e < text.length && !isSpace(text[e])) e++
  return [s, e]
}

/** Gabungan rentang (yang bertumpuk/bersebelahan disatukan). */
export function addRange(list, [s, e]) {
  const out = []
  for (const [a, b] of [...list, [s, e]].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1]
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

/** Menghapus bagian [s, e) dari daftar rentang. */
export function subtractRange(list, [s, e]) {
  const out = []
  for (const [a, b] of list) {
    if (b <= s || a >= e) out.push([a, b])
    else {
      if (a < s) out.push([a, s])
      if (b > e) out.push([e, b])
    }
  }
  return out
}

export const isCovered = (list, [s, e]) => list.some(([a, b]) => a <= s && b >= e)

export const getHighlights = (surah, ayah) => load()[`${surah}:${ayah}`] || []

/** Menandai atau menghapus tanda. Mengembalikan true bila sekarang bertanda. */
export function setHighlight(surah, ayah, text, start, end, on) {
  const range = snapToWords(text, start, end)
  if (!range) return false
  const all = load()
  const key = `${surah}:${ayah}`
  let list = all[key] || []
  if (on) list = addRange(list, range)
  else {
    // Sisa potongan dirapikan lagi ke batas kata; potongan yang hanya spasi dibuang.
    list = subtractRange(list, range)
      .map(([a, b]) => {
        let s = a
        let e = b
        while (s < e && isSpace(text[s])) s++
        while (e > s && isSpace(text[e - 1])) e--
        return s < e ? [s, e] : null
      })
      .filter(Boolean)
  }
  if (list.length) all[key] = list
  else delete all[key]
  save()
  return on
}

/** Teks ayat sebagai HTML aman dengan bagian bertanda dibungkus <mark class="hl">. */
export function highlightHtml(surah, ayah, text) {
  const list = getHighlights(surah, ayah)
  if (!list.length) return esc(text)
  let html = ''
  let pos = 0
  for (const [a, b] of list) {
    if (a < pos || a >= text.length) continue
    html += esc(text.slice(pos, a)) + `<mark class="hl">${esc(text.slice(a, Math.min(b, text.length)))}</mark>`
    pos = Math.min(b, text.length)
  }
  return html + esc(text.slice(pos))
}

export const highlightCount = () => Object.values(load()).reduce((n, l) => n + l.length, 0)
export const exportHighlights = () => ({ ...load() })
export function importHighlights(data) {
  if (!data || typeof data !== 'object') return
  cache = {}
  for (const [k, v] of Object.entries(data)) {
    if (/^\d{1,3}:\d{1,3}$/.test(k) && Array.isArray(v)) cache[k] = v.filter((r) => Array.isArray(r) && r.length === 2 && r.every(Number.isInteger) && r[0] < r[1])
  }
  save()
}
