// Sumber LOKAL (cadangan terakhir): berkas JSON yang disajikan dari domain aplikasi sendiri (/data/…),
// berasal dari paket `quran-json`. Dipakai hanya bila EQuran.id, proxy, dan Al Quran Cloud gagal.
// Ditandai sebagai edisi tersendiri; tidak pernah dicampur dengan edisi lain dalam satu surah.
import { fetchJson, ApiError } from './http.js'

export const LOCAL_EDITION = {
  source: 'lokal',
  label: 'Data lokal QuranKu (cadangan terakhir, hanya teks Arab)',
  text: 'Teks rasm Utsmani dari Ensiklopedia Al-Qur\'an (QuranEnc) via paket quran-json',
  translation: 'Tidak tersedia pada data lokal (hanya teks Arab)',
  transliteration: 'Tidak tersedia pada data lokal',
  url: 'https://github.com/risan/quran-json'
}

export function mapLocalSummary(c) {
  return {
    nomor: c.id,
    nama: String(c.name || ''),
    namaLatin: String(c.transliteration || ''),
    jumlahAyat: c.total_verses,
    tempatTurun: c.type === 'medinan' ? 'Madinah' : 'Mekah',
    arti: String(c.translation || ''),
    deskripsi: '',
    audioFull: {},
    source: 'lokal'
  }
}

export function mapLocalDetail(c) {
  if (!c || !Array.isArray(c.verses)) throw new ApiError('Data lokal tidak valid')
  return {
    ...mapLocalSummary(c),
    ayat: c.verses.map((v) => ({
      nomorAyat: v.id,
      teksArab: String(v.text || ''),
      teksLatin: String(v.transliteration || ''),
      teksIndonesia: String(v.translation || ''),
      audio: {}
    })),
    edition: LOCAL_EDITION
  }
}

const opts = { timeout: 8000, retries: 0 }

export const localData = {
  name: 'lokal',
  async list() {
    const d = await fetchJson('/data/surah-list.json', opts)
    if (!Array.isArray(d)) throw new ApiError('Data lokal tidak valid')
    return d.map(mapLocalSummary)
  },
  surah: async (n) => mapLocalDetail(await fetchJson(`/data/surah/${n}.json`, opts)),
  tafsir: async () => {
    throw new ApiError('Tafsir tidak tersedia pada data lokal')
  }
}
