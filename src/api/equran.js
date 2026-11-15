// Klien EQuran.id API v2 (sumber utama). Respons: { code, message, data }.
import { API } from '../config.js'
import { fetchJson, ApiError } from './http.js'
import { stripHtml } from '../utils/helpers.js'

export const EQURAN_EDITION = {
  source: 'equran',
  label: 'EQuran.id API v2',
  text: 'Teks Arab rasm Utsmani standar Indonesia (via EQuran.id)',
  translation: 'Terjemahan Bahasa Indonesia Kementerian Agama RI (via EQuran.id)',
  tafsir: 'Tafsir Kementerian Agama RI (via EQuran.id)',
  url: 'https://equran.id'
}

function unwrap(json) {
  if (!json || typeof json !== 'object' || json.code !== 200 || json.data == null) throw new ApiError('Respons EQuran tidak valid')
  return json.data
}

const audioMap = (o) => {
  const out = {}
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (typeof v === 'string' && /^https:\/\//.test(v)) out[k] = v
  return out
}

export function mapSummary(d) {
  return {
    nomor: Number(d.nomor),
    nama: String(d.nama || ''),
    namaLatin: String(d.namaLatin || ''),
    jumlahAyat: Number(d.jumlahAyat),
    tempatTurun: String(d.tempatTurun || ''),
    arti: String(d.arti || ''),
    deskripsi: stripHtml(d.deskripsi),
    audioFull: audioMap(d.audioFull),
    source: 'equran'
  }
}

export function mapDetail(d) {
  return {
    ...mapSummary(d),
    ayat: (Array.isArray(d.ayat) ? d.ayat : []).map((a) => ({
      nomorAyat: Number(a.nomorAyat),
      teksArab: String(a.teksArab || ''),
      teksLatin: String(a.teksLatin || ''),
      teksIndonesia: String(a.teksIndonesia || ''),
      audio: audioMap(a.audio)
    })),
    source: 'equran',
    edition: EQURAN_EDITION
  }
}

export function mapTafsir(d) {
  return {
    nomor: Number(d.nomor),
    namaLatin: String(d.namaLatin || ''),
    tafsir: (Array.isArray(d.tafsir) ? d.tafsir : []).map((t) => ({ ayat: Number(t.ayat), teks: String(t.teks || '') })),
    source: 'equran',
    edition: EQURAN_EDITION.tafsir
  }
}

export function createEquran(base = API.equran) {
  return {
    name: base.startsWith('http') ? 'equran' : 'equran-proxy',
    list: async () => unwrap(await fetchJson(`${base}/surat`)).map(mapSummary),
    surah: async (n) => mapDetail(unwrap(await fetchJson(`${base}/surat/${n}`))),
    tafsir: async (n) => mapTafsir(unwrap(await fetchJson(`${base}/tafsir/${n}`)))
  }
}
