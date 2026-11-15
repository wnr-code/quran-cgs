// Pencatatan tilawah harian (motivasi pribadi, hanya tersimpan di perangkat).
import { progressRepo } from '../database/repositories.js'
import { ayahId, pageOf, isPageEnd } from '../utils/quran-meta.js'
import { dateKey } from '../utils/format.js'
import { emit } from '../utils/helpers.js'

export const GOAL_TYPES = {
  p1: { label: '1 halaman per hari', pages: 1 },
  p2: { label: '2 halaman per hari', pages: 2 },
  p5: { label: '5 halaman per hari', pages: 5 },
  juz1: { label: '1 juz per hari (±20 halaman)', pages: 20 },
  khatam30: { label: 'Khatam 30 hari (±21 halaman/hari)', pages: 21 },
  custom: { label: 'Target kustom', pages: null }
}

export function goalPages(goal) {
  if (!goal) return 2
  if (goal.type === 'custom') return Math.max(1, Math.min(604, parseInt(goal.pages, 10) || 1))
  return (GOAL_TYPES[goal.type] || GOAL_TYPES.p2).pages
}

let today = null
let dirty = false
let timer

async function ensureToday() {
  const key = dateKey()
  if (today && today.date === key) return today
  const rec = await progressRepo.get(key)
  today = rec ? { ...rec, _set: new Set(rec.ayahIds || []) } : { date: key, ayahIds: [], pages: [], _set: new Set() }
  if (!Array.isArray(today.pages)) today.pages = []
  return today
}

function flushSoon() {
  dirty = true
  clearTimeout(timer)
  timer = setTimeout(flush, 1500)
}

export async function flush() {
  if (!dirty || !today) return
  dirty = false
  const { _set, ...rec } = today
  rec.ayahIds = Array.from(_set)
  rec.ayahs = rec.ayahIds.length
  await progressRepo.put(rec)
  emit('progress:changed')
}

/** Tandai rentang ayat telah dibaca. Halaman dihitung selesai ketika ayat terakhirnya terbaca. */
export async function markRead(surah, fromAyah, toAyah) {
  const t = await ensureToday()
  let changed = false
  for (let a = fromAyah; a <= toAyah; a++) {
    const id = ayahId(surah, a)
    if (!t._set.has(id)) {
      t._set.add(id)
      changed = true
    }
    if (isPageEnd(surah, a)) {
      const p = pageOf(surah, a)
      if (!t.pages.includes(p)) {
        t.pages.push(p)
        changed = true
      }
    }
  }
  if (changed) flushSoon()
}

export async function todayProgress() {
  const t = await ensureToday()
  return { date: t.date, ayahs: t._set.size, pages: t.pages.length }
}

/** Statistik n hari terakhir (termasuk hari ini), urut lama→baru. */
export async function lastDays(n) {
  await flush()
  const all = await progressRepo.all()
  const map = new Map(all.map((r) => [r.date, r]))
  const out = []
  const d = new Date()
  d.setDate(d.getDate() - (n - 1))
  for (let i = 0; i < n; i++) {
    const key = dateKey(d)
    const r = map.get(key)
    out.push({ date: key, pages: r ? (r.pages || []).length : 0, ayahs: r ? r.ayahs || (r.ayahIds || []).length : 0 })
    d.setDate(d.getDate() + 1)
  }
  return out
}

export function streak(days, target) {
  let s = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].pages >= target) s++
    else if (i === days.length - 1) continue // hari ini belum selesai tidak memutus rangkaian
    else break
  }
  return s
}

if (typeof addEventListener === 'function') {
  addEventListener('pagehide', () => flush())
  document.addEventListener('visibilitychange', () => document.hidden && flush())
}
