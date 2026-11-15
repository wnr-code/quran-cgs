// Doa harian dari EQuran.id (bila tersedia). Data divalidasi & disimpan lokal; tidak ada teks doa yang ditulis manual.
import { API } from '../config.js'
import { fetchJson } from './http.js'
import { kv } from '../database/repositories.js'
import { stripHtml } from '../utils/helpers.js'

const str = (...v) => {
  for (const x of v) if (typeof x === 'string' && x.trim()) return x.trim()
  return ''
}

function mapDoa(d, i) {
  return {
    id: d.id ?? i + 1,
    grup: str(d.grup, d.group, d.kategori),
    nama: str(d.nama, d.judul, d.doa, d.title),
    ar: str(d.ar, d.arab, d.ayat),
    tr: str(d.tr, d.latin),
    idn: str(d.idn, d.artinya, d.arti, d.terjemah),
    tentang: stripHtml(str(d.tentang, d.riwayat, d.referensi, d.sumber))
  }
}

// Huruf Arab termasuk bentuk presentasi (U+FB50–FDFF, U+FE70–FEFF).
const hasArabic = (s) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s)
const usable = (d) => !!(d && d.nama && d.ar && hasArabic(d.ar))
const valid = (list) => Array.isArray(list) && list.length > 0 && list.every(usable)

/** Memetakan & memvalidasi respons API doa; melempar error bila formatnya tidak dikenali. */
export function parseDoa(json) {
  const raw = Array.isArray(json) ? json : json && Array.isArray(json.data) ? json.data : null
  // Entri yang tidak lengkap dilewati (tidak pernah diisi/diperbaiki oleh aplikasi).
  const data = raw ? raw.map(mapDoa).filter(usable) : null
  if (!valid(data)) throw new Error('Format data doa tidak dikenali')
  return data
}

export async function getDoaHarian() {
  const cached = await kv.get('doaEquran')
  if (cached && valid(cached.data) && Date.now() - cached.at < 30 * 24 * 3600 * 1000) return cached.data
  try {
    const json = await fetchJson(API.equranDoa)
    const data = parseDoa(json)
    await kv.set('doaEquran', { at: Date.now(), data })
    return data
  } catch (e) {
    if (cached && valid(cached.data)) return cached.data
    throw e
  }
}
