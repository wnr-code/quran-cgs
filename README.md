# QuranKu

[![Lisensi: MIT](https://img.shields.io/badge/Lisensi-MIT-green.svg)](LICENSE)
[![CI](https://github.com/wnr-code/quran-cgs/actions/workflows/ci.yml/badge.svg)](https://github.com/wnr-code/quran-cgs/actions/workflows/ci.yml)

Aplikasi Al-Qur'an digital berbahasa Indonesia dengan **satu antarmuka bersama** untuk PWA web dan APK Android. Keduanya memakai HTML, CSS, JavaScript, halaman, dan API yang sama; Capacitor menyediakan cangkang Android tipis, bukan UI Compose terpisah.
Gratis, tanpa iklan, tidak memerlukan akun, tanpa pelacak iklan atau analitik, dan **sumber terbuka (MIT)**. PWA memakai Cloudflare Workers + D1; Android membundel antarmuka dan data cadangan untuk penggunaan offline. Layanan pihak ketiga dapat menerima metadata koneksi saat digunakan; lihat [Kebijakan Privasi](public/privacy.html).

**Buka aplikasi:** https://quran.cgs.my.id · cadangan: https://quran-cgs.appwnr.workers.dev

| | |
|---|---|
| Nama | QuranKu |
| Package Android | `id.cgs.quranku` |
| Alamat utama | https://quran.cgs.my.id |
| Alamat cadangan | https://quran-cgs.appwnr.workers.dev (dipakai otomatis bila alamat utama tidak terjangkau) |
| Hosting | Cloudflare Workers + aset statis + D1 (`npx wrangler deploy`; build otomatis, output `dist`) |
| Teknologi | HTML, CSS, JavaScript ES Modules, Vite, IndexedDB, Service Worker, Cache API, Web Push (PWA), Capacitor 8 (Android) |
| Lisensi | [MIT](LICENSE) |

## Menjalankan

```bash
npm install
npm run dev        # pengembangan, http://localhost:5173
npm test           # unit test
npm run build      # hasil di dist/ (termasuk dist/sw.js)
npm run preview    # menyajikan dist/ di http://localhost:4173
npx wrangler dev   # aplikasi + API (/api/*) + D1 lokal, http://localhost:8787
npm run cap:sync   # build PWA yang sama dan sinkronkan aset Android Capacitor
npm run cap:open   # buka proyek android/ di Android Studio
```

Service worker hanya aktif pada hasil build (`npm run build && npm run preview`, atau `npx wrangler dev`), tidak pada `npm run dev`.

Konfigurasi: `INFAQ_USERNAME` dan `INFAQ_UNIT_PRICE` ada di `wrangler.toml`; secret (webhook/API pembayaran) diisi di dashboard Cloudflare → [docs/INFAQ.md](docs/INFAQ.md). Untuk `wrangler dev` lokal, tulis secret di `.dev.vars` (lihat `.env.example`).

## Android APK (Capacitor)

- APK memuat `dist/` hasil build aplikasi yang sama dengan PWA: halaman, navigasi, komponen, tema, penyimpanan lokal, adapter API, dan fallback offline tidak diduplikasi dalam proyek Android.
- Android menambahkan cangkang Capacitor, status bar/splash, tombol kembali, lokasi perkiraan saat diminta, serta satu jembatan migrasi untuk memindahkan posisi baca, kota, tasbih, dan cache surah dari APK Compose lama.
- Data Al-Qur'an dan fitur yang tersedia di PWA menggunakan UI serta API yang sama. Teks yang pernah dibaca tetap tersimpan di IndexedDB dan data cadangan lokal dapat dibaca tanpa koneksi.
- APK Android menjadwalkan azan/imsak Ramadan, pengingat pra-salat, tilawah, target yang belum tercapai, dan catatan kalender bertanggal lewat `AlarmManager` native dalam jendela bergulir 14 hari; jadwal dipulihkan setelah reboot atau perubahan tanggal, waktu, dan zona waktu. PWA memakai Web Push untuk pemberitahuan salat saat tertutup; pengingat tilawah/target/kalender PWA berjalan saat browser aktif. Notifikasi dan akses alarm tepat mengikuti izin Android; Doze, force-stop, atau kebijakan perangkat dapat menunda pengiriman. Lokasi perkiraan diminta hanya setelah pengguna memilih **Gunakan lokasi saya**.
- Penggunaan pertama menampilkan pengenalan tiga langkah tentang bacaan, jadwal salat, dan fitur ibadah; bisa dilewati, dengan animasi yang menghormati pengaturan kurangi gerakan.
- Target Android 16 (API 36). CI membangun APK/AAB dan menjalankan uji startup di emulator; uji perangkat fisik tetap diperlukan sebelum rilis.

Perintah `npm run cap:sync` menjalankan build web lalu menyalin aset yang sama ke Android. Lihat [docs/ANDROID.md](docs/ANDROID.md) untuk APK, AAB, signing, migrasi data, dan keterbatasan native.

## Fitur PWA / web

- **Al-Qur'an**: 114 surah, 30 juz, 6236 ayat; teks Arab, transliterasi, terjemahan Indonesia; info juz/halaman; penanda sajdah; pencarian (nama/nomor surah, `2:255`, `juz 30`, `halaman 50`, kata terjemahan/Latin pada surah tersimpan).
- **Mode membaca**: Mushaf (ayat mengalir), Halaman (lembar per halaman mushaf, digeser ke samping), dan Terjemahan (per ayat); mode imersif tanpa gangguan; preset Mushaf Klasik / Ivory Reading / Dark Reading / Night Comfort; ukuran font, tinggi baris, jarak, lebar, margin, warna; posisi bacaan tersimpan dan dipulihkan.
- **Tandai teks**: tekan lama/pilih kata pada ayat → menu kecil Salin, Tandai, Bookmark, Bagikan.
- **Angka Arab-Indic** (٠–٩) sebagai bawaan untuk nomor surah/ayat/juz/halaman, dengan penanda ayat ﴿١﴾; dapat diganti ke Latin. Data internal, URL, dan referensi (`2:255`) tetap bilangan biasa.
- **Murottal**: halaman pemutar khusus; 6 qari per ayat dan per surah (EQuran.id) + 25 qari tambahan surah penuh (mp3quran.net, riwayat Hafs); ulangi, putar otomatis, kecepatan, volume, mini player, unduh manual untuk offline.
- **Tafsir** per ayat (Kemenag RI via EQuran.id), bookmark tafsir.
- **Bookmark, kategori, catatan, riwayat**, ekspor/impor cadangan JSON.
- **Target tilawah** dan statistik harian/mingguan/bulanan, pengingat.
- **Jadwal salat** (hisab lokal) dan **adzan otomatis**: suara adzan saat aplikasi terbuka, pemberitahuan push saat tertutup; imsak & tarhim khusus Ramadan; tiap waktu bisa dinyalakan/dimatikan.
- **Arah kiblat** (kompas), **kalender Hijriah**, **tasbih digital**.
- **Doa harian per kategori** (Keseharian, Rezeki, Tolak Bala, Kesehatan, Perjalanan, Ilmu), **doa wudhu**, **wirid & doa usai salat** — Arab, Latin, arti dari Quran NU Online, tersimpan di aplikasi (offline); arti/Latin bisa disembunyikan, bagikan ke media sosial. **Tahlil & Doa Arwah Lengkap** (28 langkah) tersedia di tab terpisah; bacaan Tahlil ringkas usai salat tetap berada pada wirid. **Asmaul Husna** (99 nama dengan makna, faedah, rujukan ayat, dan tombol bagikan).
- **Kotak masuk notifikasi**: lonceng dan badge hanya di Lainnya; pengumuman konten, versi aplikasi, dan pengingat tersimpan lokal, dapat ditandai sudah dibaca.
- **PWA**: dapat dipasang dari peramban apa pun (panduan per peramban), pembaruan versi otomatis, app shell + font + daftar surah tersedia offline; surah tersimpan saat dibuka; halaman Kelola Offline.
- **Alamat cadangan otomatis**: bila alamat utama mati, data diambil dari alamat cadangan tanpa tindakan pengguna.
- **Infaq pengembang** di dalam aplikasi (nominal mulai Rp1.000 → halaman pembayaran/QRIS → menunggu → terima kasih), papan donatur Harian / Mingguan / Bulanan / Sepanjang waktu → [docs/INFAQ.md](docs/INFAQ.md).

## Struktur

```
index.html            shell aplikasi
sw.js                 templat service worker (diisi saat build → dist/sw.js)
vite.config.js        build + plugin service worker
public/               manifest, ikon, font, _headers, privacy.html, .well-known/assetlinks.json
src/app.js            entry: router, navbar, mini player, registrasi SW
src/api/              adapter API (EQuran → proxy → Al Quran Cloud), validasi, timeout, retry
src/database/         IndexedDB (skema, repository)
src/services/         audio, offline, progres, posisi baca, notifikasi, adzan, tanda teks, pemasangan PWA, alamat cadangan
src/pages/            satu berkas per halaman (dimuat lazy)
src/components/       navbar, modal, kartu ayat, toolbar baca, pemutar audio
src/utils/            angka Arab-Indic, metadata juz/halaman, Hijriah, validasi
src/data/             metadata Quran (hasil scripts/gen-meta.mjs), Asmaul Husna, dzikir, qari, kota, daftar sumber
src/styles/           design tokens, tema, komponen, reader, responsif
functions/            handler API: proxy EQuran, infaq (buat/status/klaim), webhook, papan donatur, push PWA
worker/               entry Cloudflare Worker (merutekan /api/* + aset statis)
migrations/           skema D1 (papan donatur, langganan push)
capacitor.config.json konfigurasi Capacitor untuk app yang sama
android/              cangkang Android Capacitor + migrasi data lokal Compose lama
store/                materi Google Play (deskripsi, grafis, screenshot, Data Safety)
tests/                unit test + smoke test E2E
docs/                 panduan deploy, Android, infaq, status fitur
```

## Sumber data

| Data | Sumber | Lisensi/ketentuan |
|---|---|---|
| Teks Arab, terjemahan & tafsir Kemenag RI, transliterasi, audio 6 qari | [EQuran.id API v2](https://equran.id/apidev/v2) (utama) | ketentuan EQuran.id |
| Murottal tambahan (25 qari, surah penuh) | [mp3quran.net](https://mp3quran.net), daftar dari [wnr-code/qori-alquran-json](https://github.com/wnr-code/qori-alquran-json) | ketentuan mp3quran.net |
| Cadangan teks, terjemahan, tafsir Jalalayn, audio | [Al Quran Cloud API](https://alquran.cloud/api) (`quran-uthmani`, `id.indonesian`, `en.transliteration`, `id.jalalayn`) | ketentuan alquran.cloud |
| Cadangan terakhir (teks Arab saja) | paket [`quran-json`](https://github.com/risan/quran-json), disalin ke `public/data/` saat build | CC BY-SA 4.0* |
| Juz, halaman mushaf (Madinah 604 hlm.), sajdah | paket [`quran-meta`](https://github.com/quran-center/quran-meta) (riwayat Hafs) | MIT |
| Doa harian (6 kategori, 62 doa), doa wudhu, wirid & doa usai salat | [Quran NU Online](https://quran.nu.or.id/doa), disalin apa adanya ke `src/data/doa-nu.json` dan `src/data/dzikir.json` | ketentuan NU Online |
| Tahlil & Doa Arwah (versi Lengkap, 28 langkah) | [Quran NU Online — Tahlil](https://quran.nu.or.id/tahlil), salinan `src/data/tahlil.json` | ketentuan NU Online; sejumlah terjemahan diringkas dan dicatat di aplikasi |
| Doa dari Al-Qur'an, ayat pilihan, penyemangat beranda | daftar rujukan surah:ayat disusun untuk aplikasi; teks ayat dari sumber Al-Qur'an di atas | — |
| Asmaul Husna (data v2) | [wnr-code/asmaul_husna](https://github.com/wnr-code/asmaul_husna) | MIT |
| Suara adzan | [AlAdhan.com](https://aladhan.com/play) (diputar dari `cdn.aladhan.com`) | ketentuan aladhan.com |
| Jadwal salat | hisab lokal dengan pustaka [`adhan`](https://github.com/batoulapps/adhan-js) | MIT |
| Kode QR infaq | [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) | MIT |
| Font Arab | Amiri Quran, Scheherazade New, disajikan sendiri | SIL OFL 1.1 |
| Ikon font | [Font Awesome Free 6.7.2](https://fontawesome.com) (subset, disajikan sendiri) | ikon CC BY 4.0, font SIL OFL 1.1 |
| Pembayaran infaq | [Trakteer](https://trakteer.id) | — |

\* Berkas `LICENSE.txt` pada repositori quran-json menyatakan CC BY-SA 4.0, sementara metadata paket npm menyebut CC BY 4.0; QuranKu memilih label yang lebih ketat. Paket tersebut sudah ditandai deprecated dan tidak terawat; QuranKu hanya membundel teks Arab, bukan terjemahan atau transliterasinya.

Daftar lengkap beserta keterangan pemakaian tampil di aplikasi: **Lainnya → Sumber Data** (`src/data/sources.js`).

Tidak ada ayat, tafsir, doa, atau nomor halaman yang dibuat oleh aplikasi. Satu surah tidak pernah menggabungkan dua edisi yang berbeda.

## Dokumentasi

- [docs/DEPLOY-CLOUDFLARE.md](docs/DEPLOY-CLOUDFLARE.md) — deploy ke Cloudflare + domain
- [docs/ANDROID.md](docs/ANDROID.md) — build APK/AAB, signing, asset links, Play Console
- [docs/INFAQ.md](docs/INFAQ.md) — alur infaq, webhook + Public API, papan donatur (D1)
- [docs/STATUS.md](docs/STATUS.md) — **apa yang sudah diuji, apa yang belum, dan batasan**
- [store/](store/) — materi listing Google Play

## Lisensi

Kode QuranKu dirilis dengan [lisensi MIT](LICENSE) — © 2026 WNR Code. Anda bebas memakai, menyalin, mengubah, dan menyebarkannya selama menyertakan pemberitahuan hak cipta dan teks lisensi.

Lisensi MIT **hanya berlaku untuk kode aplikasi ini**. Teks Al-Qur'an, terjemahan, tafsir, doa, audio, font, dan pustaka pihak ketiga tetap mengikuti lisensi/ketentuan pemiliknya masing-masing (lihat tabel Sumber data). Lisensi font ada di `public/fonts/LICENSE-*.txt`.
