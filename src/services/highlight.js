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

/** Teks ayat aman; rentang Tajwid hanya berasal dari anotasi data yang sudah dicocokkan. */
export function highlightHtml(surah, ayah, text, { tajweedRanges = [] } = {}) {
  const highlights = getHighlights(surah, ayah).filter((r) => Array.isArray(r) && Number.isInteger(r[0]) && Number.isInteger(r[1]))
  const rules = Array.isArray(tajweedRanges)
    ? tajweedRanges.filter((r) => r && Number.isInteger(r.start) && Number.isInteger(r.end) && r.start >= 0 && r.end > r.start && r.end <= text.length && /^[a-z_]+$/.test(r.rule))
    : []
  if (!highlights.length && !rules.length) return esc(text)

  const points = new Set([0, text.length])
  for (const [start, end] of highlights) {
    points.add(Math.max(0, Math.min(text.length, start)))
    points.add(Math.max(0, Math.min(text.length, end)))
  }
  for (const range of rules) {
    points.add(range.start)
    points.add(range.end)
  }
  const ordered = [...points].sort((a, b) => a - b)
  let html = ''
  for (let i = 0; i < ordered.length - 1; i++) {
    const start = ordered[i]
    const end = ordered[i + 1]
    if (start >= end) continue
    const rule = rules.filter((r) => r.start <= start && r.end >= end).at(-1)
    const isHighlighted = highlights.some(([a, b]) => a <= start && b >= end)
    let piece = esc(text.slice(start, end))
    if (rule) piece = `<span class="tajweed tajweed-${rule.rule}" title="${esc(rule.label)}" data-rule-label="${esc(rule.label)}" aria-label="Aturan Tajwid: ${esc(rule.label)}">${piece}</span>`
    if (isHighlighted) piece = `<mark class="hl">${piece}</mark>`
    html += piece
  }
  return html
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
