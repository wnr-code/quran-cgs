// Adapter data Al-Qur'an: memori → IndexedDB → EQuran.id → proxy → Al Quran Cloud → data lokal (/data).
// Data ayat TIDAK PERNAH dibuat/diubah di sini; hanya dipetakan, divalidasi, dan disimpan.
import { API } from '../config.js'
import { createEquran } from './equran.js'
import { alquranCloud } from './alqurancloud.js'
import { localData } from './local-data.js'
import { ApiError } from './http.js'
import { kv, surahRepo, tafsirRepo } from '../database/repositories.js'
import { validateSurahList, validateSurahDetail, validateTafsir, isSurahNo } from '../utils/validation.js'
import { emit } from '../utils/helpers.js'

const providers = () => {
  const list = [createEquran(API.equran)]
  // Proxy same-origin hanya masuk akal di produksi (Cloudflare Pages Functions).
  if (import.meta.env && import.meta.env.PROD) list.push(createEquran(API.equranProxy))
  list.push(alquranCloud)
  list.push(localData) // cadangan terakhir: berkas di domain sendiri
  return list
}

async function firstValid(method, arg, validate) {
  let lastErr
  for (const p of providers()) {
    try {
      const data = await p[method](arg)
      if (validate(data)) return data
      lastErr = new ApiError(`Data dari ${p.name} tidak lolos validasi`)
      console.warn('[api]', lastErr.message)
    } catch (e) {
      lastErr = e
      console.warn(`[api] ${p.name}.${method} gagal:`, e.message)
    }
  }
  throw lastErr || new ApiError('Semua sumber data gagal')
}

const mem = { list: null, surah: new Map(), tafsir: new Map() }
const inflight = new Map()
const once = (key, fn) => {
  if (!inflight.has(key)) inflight.set(key, fn().finally(() => inflight.delete(key)))
  return inflight.get(key)
}

const LIST_TTL = 30 * 24 * 3600 * 1000

/** Daftar 114 surah. */
export function getSurahList({ force = false } = {}) {
  return once('list', async () => {
    if (mem.list && !force) return mem.list
    const cached = await kv.get('surahList')
    const cachedOk = cached && validateSurahList(cached.data)
    if (cachedOk && !force && Date.now() - cached.at < LIST_TTL && cached.data[0].source === 'equran') return (mem.list = cached.data)
    try {
      const data = await firstValid('list', undefined, validateSurahList)
      mem.list = data
      await kv.set('surahList', { at: Date.now(), data })
      return data
    } catch (e) {
      if (cachedOk) return (mem.list = cached.data)
      throw e
    }
  })
}

/** Ringkasan satu surah dari daftar (bila tersedia). */
export async function getSurahSummary(n) {
  try {
    return (await getSurahList())[n - 1] || null
  } catch {
    return null
  }
}

/** Detail surah. Teks Al-Qur'an tidak berubah, jadi salinan lokal yang valid dipakai lebih dulu. */
export function getSurah(n, { force = false } = {}) {
  n = Number(n)
  if (!isSurahNo(n)) return Promise.reject(new ApiError('Nomor surah tidak valid'))
  return once('surah:' + n, async () => {
    if (!force && mem.surah.has(n)) return mem.surah.get(n)
    const local = await surahRepo.get(n)
    const localOk = local && validateSurahDetail(local, n)
    // Salinan dari data lokal (tanpa audio) dicoba diganti sumber utama saat dibuka lagi.
    if (localOk && !force && local.source !== 'lokal') {
      mem.surah.set(n, local)
      return local
    }
    try {
      const data = await firstValid('surah', n, (d) => validateSurahDetail(d, n))
      if (data.source !== 'lokal') mem.surah.set(n, data)
      await surahRepo.put(data)
      emit('offline:changed')
      return data
    } catch (e) {
      if (localOk) return local
      throw e
    }
  })
}

export function getTafsir(n, { force = false } = {}) {
  n = Number(n)
  if (!isSurahNo(n)) return Promise.reject(new ApiError('Nomor surah tidak valid'))
  return once('tafsir:' + n, async () => {
    if (!force && mem.tafsir.has(n)) return mem.tafsir.get(n)
    const local = await tafsirRepo.get(n)
    const localOk = local && validateTafsir(local, n)
    if (localOk && !force) {
      mem.tafsir.set(n, local)
      return local
    }
    try {
      const data = await firstValid('tafsir', n, (d) => validateTafsir(d, n))
      mem.tafsir.set(n, data)
      await tafsirRepo.put(data)
      return data
    } catch (e) {
      if (localOk) return local
      throw e
    }
  })
}

export function forgetSurah(n) {
  mem.surah.delete(n)
}
export function clearMemory() {
  mem.list = null
  mem.surah.clear()
  mem.tafsir.clear()
}

export function friendlyError(e) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Anda sedang offline dan data ini belum tersimpan di perangkat.'
  return 'Data belum dapat dimuat dari server. Periksa koneksi lalu coba lagi.' + (e && e.message ? ` (${e.message})` : '')
}
