# Status fitur — teruji, belum teruji, dan batasan

Terakhir diperbarui: 15 November 2026.

## Cara pengujian
- `npm test` — 13 unit/integrasi test, semuanya lulus (termasuk webhook → SQL sungguhan → papan donatur).
- `npm run build` — berhasil tanpa error.
- `tests/e2e/smoke.mjs` — 14 langkah di Chromium headless terhadap build produksi dengan API tiruan, semuanya lulus.
- `tests/e2e/fallback.mjs` — semua API pihak ketiga dimatikan; surah terbuka dari data lokal.
- **Workflow GitHub Actions "Live API test"** — menguji **API sungguhan** (EQuran.id, Al Quran Cloud) dari runner GitHub: `tests/live/api.mjs` (kontrak data) dan `tests/e2e/live.mjs` (alur di Chrome tanpa mock). Jalankan ulang kapan saja dari tab Actions.
- **Workflow "Android build"** — membangun APK/AAB.

## Teruji terhadap API sungguhan (15 Nov 2026)
- EQuran.id: daftar 114 surah; **seluruh 114 surah diunduh dan lolos validasi, total 6236 ayat**; basmalah tidak menempel pada ayat 1; tafsir; header CORS `*`.
- Audio EQuran: tersedia untuk 6 qari, per ayat dan per surah, mendukung Range.
- Doa harian EQuran: 227 doa, 226 dipakai. Satu entri (id 42) dilewati karena kolom teks Arabnya tidak berisi huruf Arab pada sumber; aplikasi tidak memperbaikinya.
- Al Quran Cloud (cadangan): daftar, surah, tafsir, audio, CORS.
- Di Chrome tanpa mock: daftar surah, Al-Baqarah 286 ayat dari sumber utama, tafsir, doa sehari-hari, **audio surah berputar, audio per ayat berputar, unduh audio manual, dan audio unduhan berputar saat offline**.

## Teruji dengan API tiruan
- Beranda, navigasi bawah, tema.
- Angka Arab-Indic bawaan, penanda ayat ﴿١﴾, opsi Latin; referensi internal tetap Latin.
- Mushaf Continuous dan Ayah Focus; preset; ukuran font; RTL; font Amiri Quran termuat.
- Basmalah: sekali di awal surah, tidak ada pada At-Taubah, tidak digandakan pada Al-Fatihah.
- Mode membaca imersif menyembunyikan navigasi.
- Posisi bacaan tersimpan dan dipulihkan setelah muat ulang; bookmark.
- Pencarian `2:255`, `juz 30`, kata terjemahan.
- Halaman Asmaul Husna (99), jadwal salat, kiblat, tasbih, kalender, target, offline, infaq, pengaturan, tentang terbuka tanpa error JavaScript.
- Service worker: shell, daftar surah, surah tersimpan, dan bookmark tersedia offline; surah yang belum tersimpan menampilkan pesan error yang jelas.
- Papan donatur: token salah → 401, payload rusak → 400, tanpa D1 → 503; kiriman ganda tidak menggandakan baris; nama digabung tanpa beda huruf besar/kecil; transaksi tes disembunyikan; periode WIB.

## Belum teruji — mohon diuji setelah deploy
| Hal | Catatan |
|---|---|
| Deploy Cloudflare (Workers), domain, proxy `/api/quran` | Konfigurasi lolos `wrangler deploy --dry-run`; deploy sungguhan dijalankan oleh Cloudflare saat push ke `main` dan belum saya lihat hasilnya. |
| Papan donatur di D1 sungguhan + webhook Trakteer sungguhan | Logika teruji di SQLite lokal. Tabel belum dibuat di database `quran`; lihat [INFAQ.md](INFAQ.md). |
| Nominal pada papan donatur | Lihat catatan `price` di [INFAQ.md](INFAQ.md). |
| Notifikasi dan kompas kiblat | Memerlukan perangkat fisik. |
| Android APK/AAB | Build di GitHub Actions berhasil (tanpa signing). **Belum dipasang/diuji di perangkat**, belum ditandatangani, belum diajukan ke Play. Lihat [ANDROID.md](ANDROID.md). |
| Instalasi PWA di ponsel, Lighthouse, iOS Safari | Belum diuji. |

## Belum dikerjakan / berbeda dari spesifikasi
- **Data lokal cadangan terakhir** (`/data/`, dari paket `quran-json`) hanya berisi **teks Arab** — tanpa terjemahan, transliterasi, audio, dan tafsir (terjemahan paket itu tidak dipublikasikan karena hak redistribusinya tidak jelas). Berkas ini disajikan dari domain aplikasi, jadi tetap memerlukan koneksi ke situs; untuk pemakaian tanpa internet gunakan *Kelola Offline → Unduh semua teks*.
- **Pengingat hanya berjalan selama aplikasi terbuka atau masih hidup di latar.** Tidak ada server push (akan memerlukan layanan tambahan). Android dapat menghentikan aplikasi di latar, sehingga pengingat tidak dijamin tepat waktu.
- **Hari besar Islam pada kalender** dihitung dari kalender Umm al-Qura dan dapat berbeda 1–2 hari dari ketetapan pemerintah RI; tersedia koreksi ±2 hari di pengaturan.
- **Jadwal salat** adalah hisab lokal (Subuh 20°, Isya 18°, ihtiyat 2 menit) dan dapat berbeda 1–2 menit dari jadwal resmi Kemenag. Waktu ditampilkan dalam zona waktu perangkat.
- **Nomor halaman** mengikuti mushaf Madinah 604 halaman dari metadata `quran-meta`, bukan dari API. Navigasi per halaman melompat ke ayat pertama halaman; tata letak baris demi baris seperti mushaf cetak tidak tersedia.
- **Pencarian kata** hanya mencakup surah yang sudah tersimpan di perangkat.
- **Layar penuh sistem** hanya bila peramban mengizinkan Fullscreen API; di TWA bilah status tetap tampil.
- **Audio unduhan** disimpan sebagai respons *opaque* karena server audio EQuran tidak mengirim header CORS. Pemutaran offline berfungsi, tetapi ukuran berkas tidak dapat dibaca aplikasi dan peramban menghitung kuota penyimpanan lebih besar daripada ukuran asli.
- Beranda memiliki dua pintasan tambahan di luar enam yang diminta: Arah Kiblat dan Infaq.
- **Screenshot di `store/screenshots/`** dibuat dari API tiruan (edisi teks `quran-json`). Ambil ulang dari situs produksi sebelum diunggah ke Play Store.

## Yang harus Anda isi
1. Sidik jari SHA-256 di `public/.well-known/assetlinks.json`.
2. Tabel `donations` di D1 `quran` dan secret `TRAKTEER_WEBHOOK_TOKEN` (bila ingin papan donatur).
