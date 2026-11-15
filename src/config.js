// Konfigurasi aplikasi QuranKu. Nilai dapat ditimpa lewat variabel lingkungan Vite (VITE_*).
import { QARI_EXTRA } from './data/qari-extra.js'

const env = import.meta.env || {}

// Diisi saat build oleh vite.config.js (berubah pada setiap build). Di luar build (uji unit) memakai nilai bawaan.
/* global __APP_BUILD__ */
const build = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : { version: '1.0.0', number: 'dev', commit: '', time: '' }

export const APP = {
  name: 'QuranKu',
  version: build.version,
  build: build.number,
  commit: build.commit,
  builtAt: build.time,
  /** Contoh: "1.0.0 (build 261115.1112 · a1b2c3d)" */
  versionLabel: `${build.version} (build ${build.number}${build.commit ? ' · ' + build.commit : ''})`,
  packageId: 'id.cgs.quranku',
  origin: 'https://quran.cgs.my.id',
  repo: 'https://github.com/wnr-code/quran-cgs',
  license: 'MIT',
  copyright: '© 2026 WNR Code',
  /** Alamat yang menyajikan aplikasi yang sama: [utama, cadangan]. Bila yang sedang dipakai mati, data diambil dari yang lain. */
  mirrors: ['https://quran.cgs.my.id', 'https://quran-cgs.appwnr.workers.dev']
}

export const API = {
  equran: 'https://equran.id/api/v2',
  // Proxy opsional (Cloudflare Pages Function) dipakai bila akses langsung gagal (mis. CORS).
  equranProxy: '/api/quran',
  alquranCloud: 'https://api.alquran.cloud/v1',
  timeout: 12000,
  retries: 1
}

// === INFAQ ===
// Seluruh proses pembayaran diatur di sisi server (Cloudflare Worker); tidak ada kunci di frontend.
export const INFAQ = {
  api: '/api/infaq',
  donorsApi: '/api/donors'
}

// Qari dari EQuran.id: audio per ayat DAN surah penuh.
export const QARI_AYAH = {
  '01': 'Abdullah Al-Juhany',
  '02': 'Abdul Muhsin Al-Qasim',
  '03': 'Abdurrahman As-Sudais',
  '04': 'Ibrahim Al-Dossari',
  '05': 'Misyari Rasyid Al-Afasy',
  '06': 'Yasser Al-Dosari'
}
// Qari tambahan (mp3quran.net): hanya audio surah penuh. Lihat src/data/qari-extra.js.
export const QARI_SURAH = Object.fromEntries(QARI_EXTRA.map((q) => [q.id, q]))
/** Nama semua qari menurut id. */
export const QARI = { ...QARI_AYAH, ...Object.fromEntries(QARI_EXTRA.map((q) => [q.id, q.name + (q.style === 'mujawwad' ? ' (Mujawwad)' : '')])) }
export const DEFAULT_QARI = '05'

// Teks basmalah (QS. Al-Fatihah 1:1, rasm standar Indonesia sebagaimana data EQuran.id).
export const BASMALAH = 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ'
