// Klien cadangan: api.alquran.cloud v1.
// Seluruh teks (Arab, terjemahan, transliterasi) diambil dari SATU layanan ini dan ditandai
// sebagai edisi tersendiri — tidak pernah dicampur dengan edisi EQuran dalam satu surah.
import { API } from '../config.js'
import { fetchJson, ApiError } from './http.js'

export const CLOUD_EDITION = {
  source: 'alqurancloud',
  label: 'Al Quran Cloud API (cadangan)',
  text: 'quran-uthmani (Tanzil, rasm Utsmani)',
  translation: 'id.indonesian (Terjemahan Bahasa Indonesia)',
  transliteration: 'en.transliteration',
  tafsir: 'id.jalalayn (Tafsir Jalalain, Bahasa Indonesia)',
  url: 'https://alquran.cloud'
}

function unwrap(json) {
  if (!json || json.code !== 200 || json.data == null) throw new ApiError('Respons Al Quran Cloud tidak valid')
  return json.data
}

const bare = (s) => s.replace(/[^\u0621-\u064A\u0671]/g, '')

/** Edisi quran-uthmani menyertakan basmalah di awal ayat 1 (selain Al-Fatihah & At-Taubah) — pisahkan. */
export function stripBasmalah(text, surah, ayah) {
  if (ayah !== 1 || surah === 1 || surah === 9) return text
  const words = text.trim().split(/\s+/)
  if (words.length > 4 && bare(words[0]) === 'بسم' && bare(words[1]).endsWith('لله')) return words.slice(4).join(' ')
  return text
}

const tempat = (t) => (String(t).toLowerCase().startsWith('med') ? 'Madinah' : 'Mekah')
const cleanName = (n) => String(n || '').replace(/^سُورَةُ\s*/, '').trim()

function mapSummary(d) {
  return {
    nomor: d.number,
    nama: cleanName(d.name),
    namaLatin: String(d.englishName || ''),
    jumlahAyat: d.numberOfAyahs,
    tempatTurun: tempat(d.revelationType),
    arti: String(d.englishNameTranslation || ''),
    deskripsi: '',
    audioFull: { '05': `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${d.number}.mp3` },
    source: 'alqurancloud'
  }
}

export const alquranCloud = {
  name: 'alqurancloud',
  list: async () => unwrap(await fetchJson(`${API.alquranCloud}/surah`)).map(mapSummary),
  async surah(n) {
    const eds = unwrap(await fetchJson(`${API.alquranCloud}/surah/${n}/editions/quran-uthmani,id.indonesian,en.transliteration`))
    if (!Array.isArray(eds) || eds.length !== 3) throw new ApiError('Edisi cadangan tidak lengkap')
    const [ar, id, tr] = eds
    const len = ar.ayahs.length
    if (id.ayahs.length !== len || tr.ayahs.length !== len) throw new ApiError('Jumlah ayat antar-edisi tidak sama')
    return {
      ...mapSummary(ar),
      ayat: ar.ayahs.map((a, i) => ({
        nomorAyat: a.numberInSurah,
        teksArab: stripBasmalah(String(a.text || ''), n, a.numberInSurah),
        teksLatin: String(tr.ayahs[i].text || ''),
        teksIndonesia: String(id.ayahs[i].text || ''),
        audio: { '05': `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${a.number}.mp3` }
      })),
      source: 'alqurancloud',
      edition: CLOUD_EDITION
    }
  },
  async tafsir(n) {
    const d = unwrap(await fetchJson(`${API.alquranCloud}/surah/${n}/id.jalalayn`))
    return {
      nomor: d.number,
      namaLatin: String(d.englishName || ''),
      tafsir: d.ayahs.map((a) => ({ ayat: a.numberInSurah, teks: String(a.text || '') })),
      source: 'alqurancloud',
      edition: CLOUD_EDITION.tafsir
    }
  }
}
