// Konfigurasi aplikasi QuranKu. Nilai dapat ditimpa lewat variabel lingkungan Vite (VITE_*).
const env = import.meta.env || {}

export const APP = {
  name: 'QuranKu',
  version: '1.0.0',
  packageId: 'id.cgs.quranku',
  origin: 'https://quran.cgs.my.id'
}

export const API = {
  equran: 'https://equran.id/api/v2',
  equranDoa: 'https://equran.id/api/doa',
  // Proxy opsional (Cloudflare Pages Function) dipakai bila akses langsung gagal (mis. CORS).
  equranProxy: '/api/quran',
  alquranCloud: 'https://api.alquran.cloud/v1',
  timeout: 12000,
  retries: 1
}

// === INFAQ / TRAKTEER ===
// Username Trakteer pengembang (bagian setelah trakteer.id/).
// Bisa diganti lewat env Cloudflare Pages: VITE_TRAKTEER_USERNAME
export const TRAKTEER = {
  username: (env.VITE_TRAKTEER_USERNAME || 'anichinapk').trim(),
  get url() {
    return this.username ? `https://trakteer.id/${encodeURIComponent(this.username)}/tip` : ''
  },
  donorsApi: '/api/donors'
}

export const QARI = {
  '01': 'Abdullah Al-Juhany',
  '02': 'Abdul Muhsin Al-Qasim',
  '03': 'Abdurrahman As-Sudais',
  '04': 'Ibrahim Al-Dossari',
  '05': 'Misyari Rasyid Al-Afasy',
  '06': 'Yasser Al-Dosari'
}

// Teks basmalah (QS. Al-Fatihah 1:1, rasm standar Indonesia sebagaimana data EQuran.id).
export const BASMALAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ'
