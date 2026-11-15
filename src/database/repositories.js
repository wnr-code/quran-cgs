import { idb } from './indexeddb.js'
import { BACKUP_STORES } from './migrations.js'
import { cleanText, isAyahNo } from '../utils/validation.js'
import { emit } from '../utils/helpers.js'

// Semua operasi aman-gagal: bila IndexedDB tidak tersedia, aplikasi tetap berjalan.
const safe = async (fn, fallback) => {
  try {
    return await fn()
  } catch (e) {
    console.warn('[db]', e)
    return fallback
  }
}

export const kv = {
  get: (key, fallback = null) => safe(async () => (await idb.get('kv', key)) ?? fallback, fallback),
  set: (key, value) => safe(() => idb.put('kv', value, key)),
  del: (key) => safe(() => idb.delete('kv', key))
}

export const surahRepo = {
  get: (n) => safe(() => idb.get('surahs', n), null),
  put: (s) => safe(() => idb.put('surahs', { ...s, savedAt: Date.now() })),
  delete: (n) => safe(() => idb.delete('surahs', n)),
  all: () => safe(() => idb.getAll('surahs'), []),
  keys: () => safe(() => idb.keys('surahs'), []),
  clear: () => safe(() => idb.clear('surahs'))
}

export const tafsirRepo = {
  get: (n) => safe(() => idb.get('tafsir', n), null),
  put: (t) => safe(() => idb.put('tafsir', { ...t, savedAt: Date.now() })),
  keys: () => safe(() => idb.keys('tafsir'), []),
  clear: () => safe(() => idb.clear('tafsir'))
}

export const DEFAULT_CATEGORIES = ['Umum', 'Favorit', 'Hafalan', 'Tadabbur']
const bmId = (type, s, a) => `${type}:${s}:${a}`

export const bookmarkRepo = {
  id: bmId,
  async toggle({ surah, ayah, surahName, type = 'ayat', category = 'Umum' }) {
    if (!isAyahNo(surah, ayah)) return false
    const id = bmId(type, surah, ayah)
    const existing = await safe(() => idb.get('bookmarks', id), null)
    if (existing) {
      await safe(() => idb.delete('bookmarks', id))
      emit('bookmarks:changed')
      return false
    }
    await safe(() => idb.put('bookmarks', { id, type, surah, ayah, surahName: cleanText(surahName, 80), category: cleanText(category, 40) || 'Umum', createdAt: Date.now() }))
    emit('bookmarks:changed')
    return true
  },
  async setCategory(id, category) {
    const b = await safe(() => idb.get('bookmarks', id), null)
    if (!b) return
    b.category = cleanText(category, 40) || 'Umum'
    await safe(() => idb.put('bookmarks', b))
    emit('bookmarks:changed')
  },
  has: (type, s, a) => safe(async () => !!(await idb.get('bookmarks', bmId(type, s, a))), false),
  all: () => safe(async () => (await idb.getAll('bookmarks')).sort((a, b) => b.createdAt - a.createdAt), []),
  async forSurah(surah) {
    const all = await this.all()
    return new Set(all.filter((b) => b.surah === surah && b.type === 'ayat').map((b) => b.ayah))
  },
  async remove(id) {
    await safe(() => idb.delete('bookmarks', id))
    emit('bookmarks:changed')
  },
  async categories() {
    const all = await this.all()
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...all.map((b) => b.category)]))
  }
}

export const noteRepo = {
  get: (s, a) => safe(() => idb.get('notes', `${s}:${a}`), null),
  async save({ surah, ayah, surahName, text }) {
    const id = `${surah}:${ayah}`
    const t = cleanText(text)
    if (!t) await safe(() => idb.delete('notes', id))
    else await safe(() => idb.put('notes', { id, surah, ayah, surahName: cleanText(surahName, 80), text: t, updatedAt: Date.now() }))
    emit('notes:changed')
  },
  all: () => safe(async () => (await idb.getAll('notes')).sort((a, b) => b.updatedAt - a.updatedAt), []),
  async remove(id) {
    await safe(() => idb.delete('notes', id))
    emit('notes:changed')
  }
}

const HISTORY_MAX = 200
export const historyRepo = {
  async add({ surah, ayah, surahName }) {
    await safe(async () => {
      const all = await idb.getAll('history')
      const last = all[all.length - 1]
      // Hindari duplikat beruntun untuk surah yang sama: perbarui entri terakhir.
      if (last && last.surah === surah) {
        await idb.put('history', { ...last, ayah, at: Date.now() })
      } else {
        await idb.put('history', { surah, ayah, surahName, at: Date.now() })
        if (all.length >= HISTORY_MAX) for (const old of all.slice(0, all.length - HISTORY_MAX + 1)) await idb.delete('history', old.id)
      }
    })
  },
  all: () => safe(async () => (await idb.getAll('history')).sort((a, b) => b.at - a.at), []),
  clear: () => safe(() => idb.clear('history'))
}

export const progressRepo = {
  get: (date) => safe(() => idb.get('progress', date), null),
  put: (rec) => safe(() => idb.put('progress', rec)),
  all: () => safe(() => idb.getAll('progress'), [])
}

export const audioRepo = {
  all: () => safe(() => idb.getAll('audio'), []),
  get: (url) => safe(() => idb.get('audio', url), null),
  put: (rec) => safe(() => idb.put('audio', rec)),
  delete: (url) => safe(() => idb.delete('audio', url)),
  clear: () => safe(() => idb.clear('audio'))
}

/** Ekspor seluruh data pribadi sebagai objek JSON (cadangan lokal). */
export async function exportBackup(settings) {
  const out = { app: 'QuranKu', format: 1, exportedAt: new Date().toISOString(), settings, lastRead: await kv.get('lastRead'), tasbih: await kv.get('tasbih'), stores: {} }
  for (const name of BACKUP_STORES) out.stores[name] = await safe(() => idb.getAll(name), [])
  return out
}

/** Impor cadangan. Data divalidasi ringan dan digabung (id sama akan ditimpa). */
export async function importBackup(data) {
  if (!data || data.app !== 'QuranKu' || typeof data.stores !== 'object') throw new Error('Berkas cadangan tidak valid')
  const count = {}
  for (const name of BACKUP_STORES) {
    const rows = Array.isArray(data.stores[name]) ? data.stores[name] : []
    const valid = rows.filter((r) => {
      if (!r || typeof r !== 'object') return false
      if (name === 'progress') return /^\d{4}-\d{2}-\d{2}$/.test(r.date)
      if (name === 'history') return isAyahNo(r.surah, r.ayah)
      return typeof r.id === 'string' && isAyahNo(r.surah, r.ayah)
    })
    const cleaned = valid.map((r) => {
      const c = { ...r }
      if (name === 'history') delete c.id
      for (const k of ['text', 'category', 'surahName']) if (k in c) c[k] = cleanText(c[k], k === 'text' ? 5000 : 80)
      return c
    })
    if (name === 'history') await idb.clear('history')
    await idb.bulkPut(name, cleaned)
    count[name] = cleaned.length
  }
  if (data.lastRead && isAyahNo(data.lastRead.surah, data.lastRead.ayah)) await kv.set('lastRead', data.lastRead)
  if (data.tasbih && typeof data.tasbih === 'object') await kv.set('tasbih', data.tasbih)
  emit('bookmarks:changed')
  emit('notes:changed')
  return count
}

export async function wipeUserData() {
  for (const name of [...BACKUP_STORES, 'kv', 'surahs', 'tafsir', 'audio']) await safe(() => idb.clear(name))
}
