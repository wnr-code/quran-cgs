// Simpan & pulihkan posisi bacaan terakhir.
import { kv, historyRepo } from '../database/repositories.js'
import { juzOf, pageOf } from '../utils/quran-meta.js'
import { emit } from '../utils/helpers.js'

const LS_KEY = 'quranku:lastRead'

/** pos: { surah, ayah, surahName, surahNameAr, offset, mode, immersive } */
export function savePosition(pos) {
  const rec = { ...pos, juz: juzOf(pos.surah, pos.ayah), page: pageOf(pos.surah, pos.ayah), at: Date.now() }
  // localStorage ditulis sinkron agar aman saat halaman ditutup mendadak; IndexedDB sebagai salinan utama.
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rec))
  } catch {}
  kv.set('lastRead', rec)
  emit('lastread:changed', rec)
  return rec
}

export async function getLastRead() {
  let ls = null
  try {
    ls = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
  } catch {}
  const db = await kv.get('lastRead')
  if (ls && db) return ls.at >= db.at ? ls : db
  return ls || db || null
}

export function addHistory(surah, ayah, surahName) {
  return historyRepo.add({ surah, ayah, surahName })
}

export function clearLastRead() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {}
  return kv.del('lastRead')
}
