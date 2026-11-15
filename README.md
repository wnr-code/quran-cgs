# QuranKu

Aplikasi Al-Qur'an digital berbahasa Indonesia: **PWA** (web) + **Android TWA** (Google Play) dari satu basis kode.
Gratis, tanpa iklan, tanpa akun, tanpa pelacak. Seluruhnya berjalan di layanan free-tier (Cloudflare Workers).

| | |
|---|---|
| Nama | QuranKu |
| Package Android | `id.cgs.quranku` |
| Domain | https://quran.cgs.my.id |
| Hosting | Cloudflare Workers + aset statis (`npx wrangler deploy`; build otomatis, output `dist`) |
| Teknologi | HTML, CSS, JavaScript ES Modules, Vite, IndexedDB, Service Worker, Cache API |

## Menjalankan

```bash
npm install
npm run dev        # pengembangan, http://localhost:5173
npm test           # unit test (angka, metadata, validasi, kiblat, webhook infaq)
npm run build      # hasil di dist/ (termasuk dist/sw.js)
npm run preview    # menyajikan dist/ di http://localhost:4173
```

Service worker hanya aktif pada hasil build (`npm run build && npm run preview`), tidak pada `npm run dev`.

Konfigurasi opsional (salin `.env.example` → `.env`, atau isi di Cloudflare → Worker → Settings → Builds → Variables):

| Variabel | Isi |
|---|---|
| `INFAQ_USERNAME`, `INFAQ_UNIT_PRICE` | di `wrangler.toml`; secret infaq di dashboard Cloudflare → [docs/INFAQ.md](docs/INFAQ.md). |

## Fitur

- **Al-Qur'an**: 114 surah, 30 juz, 6236 ayat; teks Arab, transliterasi, terjemahan Indonesia; info juz/halaman; penanda sajdah; pencarian (nama/nomor surah, `2:255`, `juz 30`, `halaman 50`, kata terjemahan/Latin pada surah tersimpan).
- **Mode membaca**: Mushaf Continuous (ayat mengalir) dan Ayah Focus; mode imersif; preset Mushaf Klasik / Ivory Reading / Dark Reading / Night Comfort; ukuran font, tinggi baris, jarak, lebar, margin, warna; posisi bacaan tersimpan dan dipulihkan.
- **Angka Arab-Indic** (٠–٩) sebagai bawaan untuk nomor surah/ayat/juz/halaman, dengan penanda ayat ﴿١﴾; dapat diganti ke Latin. Data internal, URL, dan referensi (`2:255`) tetap bilangan biasa.
- **Murottal**: 6 qari, per ayat dan per surah, ulangi, putar otomatis, kecepatan, volume, mini player, unduh manual untuk offline.
- **Tafsir** per ayat (Kemenag RI via EQuran.id), bookmark tafsir.
- **Bookmark, kategori, catatan, riwayat**, ekspor/impor cadangan JSON.
- **Target tilawah** dan statistik harian/mingguan/bulanan, pengingat.
- **Jadwal salat** (hisab lokal), **kalender Hijriah**, **Asmaul Husna**, **doa harian**, **tasbih digital**, **arah kiblat**.
- **Offline**: app shell, font Arab, daftar surah; surah tersimpan saat dibuka; halaman Kelola Offline.
- **Infaq pengembang** dengan alur di dalam aplikasi (nominal → QRIS/halaman pembayaran → menunggu → terima kasih), papan donatur Harian / Mingguan / Bulanan / Sepanjang waktu → [docs/INFAQ.md](docs/INFAQ.md).

## Struktur

```
index.html            shell aplikasi
sw.js                 templat service worker (diisi saat build → dist/sw.js)
vite.config.js        build + plugin service worker
public/               manifest, ikon, font, _headers, privacy.html, .well-known/assetlinks.json
src/app.js            entry: router, navbar, mini player, registrasi SW
src/api/              adapter API (EQuran → proxy → Al Quran Cloud), validasi, timeout, retry
src/database/         IndexedDB (skema, repository)
src/services/         audio, offline, progres, posisi baca, notifikasi, kiblat
src/pages/            satu berkas per halaman (dimuat lazy)
src/components/       navbar, modal, kartu ayat, toolbar baca, pemutar audio
src/utils/            angka Arab-Indic, metadata juz/halaman, Hijriah, validasi
src/data/             metadata Quran (hasil scripts/gen-meta.mjs), Asmaul Husna, kota
src/styles/           tema, komponen, reader, responsif
functions/            handler API: proxy EQuran, infaq (buat/status/klaim), webhook, papan donatur
worker/               entry Cloudflare Worker (merutekan /api/* + aset statis)
migrations/           skema D1 untuk papan donatur
android/              proyek Android TWA (Gradle) + twa-manifest.json (Bubblewrap)
store/                materi Google Play (deskripsi, grafis, screenshot, Data Safety)
tests/                unit test + smoke test E2E
docs/                 panduan deploy, Android, infaq, status fitur
```

## Sumber data

| Data | Sumber |
|---|---|
| Teks Arab, terjemahan, transliterasi, tafsir, audio | [EQuran.id API v2](https://equran.id/apidev/v2) (utama) |
| Cadangan teks & audio | [Al Quran Cloud API](https://alquran.cloud/api) (`quran-uthmani`, `id.indonesian`, `en.transliteration`) |
| Cadangan terakhir (teks Arab saja) | paket [`quran-json`](https://github.com/risan/quran-json) (CC BY 4.0), disalin ke `public/data/` saat build |
| Juz, halaman mushaf (Madinah 604 hlm.), sajdah | paket `quran-meta` (riwayat Hafs) |
| Asmaul Husna | [wnr-code/asmaul_husna](https://github.com/wnr-code/asmaul_husna) (MIT) |
| Jadwal salat | hisab lokal dengan pustaka `adhan` |
| Font Arab | Amiri Quran, Scheherazade New (SIL OFL), disajikan sendiri |

Daftar lengkap sumber juga tampil di aplikasi: **Lainnya → Tentang → Sumber Data** (`src/data/sources.js`).

Tidak ada ayat, tafsir, doa, atau nomor halaman yang dibuat oleh aplikasi. Satu surah tidak pernah menggabungkan dua edisi yang berbeda.

## Dokumentasi

- [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md) — deploy ke Cloudflare + domain
- [docs/ANDROID.md](docs/ANDROID.md) — build APK/AAB, signing, asset links, Play Console
- [docs/INFAQ.md](docs/INFAQ.md) — alur infaq, webhook + Public API, papan donatur (D1)
- [docs/STATUS.md](docs/STATUS.md) — **apa yang sudah diuji, apa yang belum, dan batasan**
- [store/](store/) — materi listing Google Play
