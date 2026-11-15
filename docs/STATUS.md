# Status fitur — teruji, belum teruji, dan batasan

Terakhir diperbarui: 14 November 2026.

## Cara pengujian
- `npm test` — 12 unit test, semuanya lulus.
- `npm run build` — berhasil tanpa error.
- `tests/e2e/smoke.mjs` — 14 langkah di Chromium headless terhadap hasil build produksi, semuanya lulus.

**Penting:** lingkungan pengujian tidak memiliki akses internet ke `equran.id` maupun `api.alquran.cloud`. Smoke test memakai **tiruan (mock) API** dengan bentuk respons EQuran v2, berisi teks dari paket `quran-json`. Jadi alur aplikasi teruji, tetapi **sambungan ke API sungguhan belum pernah dijalankan.**

## Teruji otomatis (dengan API tiruan)
- Beranda, navigasi bawah, tema.
- 114 surah, 30 juz, total 6236 ayat; jumlah ayat tiap surah divalidasi terhadap metadata.
- Angka Arab-Indic bawaan, penanda ayat ﴿١﴾, opsi Latin; referensi internal tetap Latin.
- Mushaf Continuous dan Ayah Focus; preset; ukuran font; RTL; font Amiri Quran termuat.
- Basmalah: sekali di awal surah, tidak ada pada At-Taubah, tidak digandakan pada Al-Fatihah.
- Mode membaca imersif menyembunyikan navigasi.
- Posisi bacaan tersimpan dan dipulihkan setelah muat ulang; bookmark.
- Tafsir; pencarian `2:255`, `juz 30`, kata terjemahan.
- Halaman Asmaul Husna (99), jadwal salat, kiblat, tasbih, kalender, doa, target, offline, infaq, pengaturan terbuka tanpa error JavaScript.
- Service worker: shell, daftar surah, surah tersimpan, dan bookmark tersedia offline; surah yang belum tersimpan menampilkan pesan error yang jelas.
- Cadangan terakhir: dengan semua API pihak ketiga dimatikan, daftar 114 surah dan surah Ya-Sin terbuka dari data lokal dan ditandai sebagai sumber cadangan (`tests/e2e/fallback.mjs`).
- Halaman Tentang menampilkan seluruh sumber data.
- Webhook Trakteer (token salah → 401, payload rusak → 400, tanpa D1 → 503, valid → tersimpan) dan perhitungan periode WIB.

## Belum teruji — mohon diuji setelah deploy
| Hal | Catatan |
|---|---|
| EQuran.id API sungguhan (surah, tafsir) | Pemetaan ditulis menurut dokumentasi v2; belum dijalankan terhadap server asli. |
| Cadangan Al Quran Cloud dan proxy `/api/quran` | Belum dijalankan terhadap server asli. |
| Doa harian (`equran.id/api/doa`) | Bentuk respons belum terverifikasi. Bila tidak cocok, halaman menampilkan "tidak tersedia" (tidak ada doa buatan). |
| Pemutaran audio, mini player, unduh audio offline | Kode ada; tidak dapat diuji tanpa berkas audio asli. |
| Nominal pada papan donatur | Lihat catatan `price` di [INFAQ.md](INFAQ.md). |
| Notifikasi dan kompas kiblat | Memerlukan perangkat fisik. |
| Android APK/AAB | **Belum pernah di-build.** Lihat [ANDROID.md](ANDROID.md). |
| Instalasi PWA di perangkat nyata, Lighthouse | Manifest dan service worker valid di Chromium headless; belum diuji di ponsel. |
| iOS Safari | Belum diuji. |

## Belum dikerjakan / berbeda dari spesifikasi
- **Data lokal cadangan terakhir** (`/data/`, dari paket `quran-json`) hanya berisi teks, terjemahan, dan transliterasi ejaan Inggris — tanpa audio dan tanpa tafsir. Berkas ini disajikan dari domain aplikasi, jadi tetap memerlukan koneksi ke situs; untuk pemakaian tanpa internet gunakan *Kelola Offline → Unduh semua teks*.
- **Pengingat hanya berjalan selama aplikasi terbuka atau masih hidup di latar.** Tidak ada server push (akan memerlukan layanan tambahan). Android dapat menghentikan aplikasi di latar, sehingga pengingat tidak dijamin tepat waktu.
- **Hari besar Islam pada kalender** dihitung dari kalender Umm al-Qura dan dapat berbeda 1–2 hari dari ketetapan pemerintah RI; tersedia koreksi ±2 hari di pengaturan.
- **Jadwal salat** adalah hisab lokal (Subuh 20°, Isya 18°, ihtiyat 2 menit) dan dapat berbeda 1–2 menit dari jadwal resmi Kemenag. Waktu ditampilkan dalam zona waktu perangkat.
- **Nomor halaman** mengikuti mushaf Madinah 604 halaman dari metadata `quran-meta`, bukan dari API. Navigasi per halaman melompat ke ayat pertama halaman; tata letak baris demi baris seperti mushaf cetak tidak tersedia.
- **Pencarian kata** hanya mencakup surah yang sudah tersimpan di perangkat.
- **Layar penuh sistem** hanya bila peramban mengizinkan Fullscreen API; di TWA bilah status tetap tampil.
- Beranda memiliki dua pintasan tambahan di luar enam yang diminta: Arah Kiblat dan Infaq.
- **Screenshot di `store/screenshots/`** dibuat dari API tiruan (edisi teks `quran-json`). Ambil ulang dari situs produksi sebelum diunggah ke Play Store.

## Yang harus Anda isi
1. `VITE_TRAKTEER_USERNAME` di Cloudflare Pages.
2. Sidik jari SHA-256 di `public/.well-known/assetlinks.json`.
3. Binding D1 `DB` dan secret `TRAKTEER_WEBHOOK_TOKEN` (bila ingin papan donatur).
