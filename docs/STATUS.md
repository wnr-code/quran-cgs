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
- Qari tambahan (surah penuh, mp3quran.net): 25 qari dari `wnr-code/qori-alquran-json`. Tiap rekaman dicocokkan dengan API resmi mp3quran (riwayat Hafs, 114 surah; berkas 001 dan 114 berukuran sama persis dengan alamat resmi), berkas 001/002/114 terjangkau dengan ukuran wajar, mendukung Range dan CORS. Pemutaran di Chrome sungguhan diuji untuk satu qari (Mahir al-Mu'aiqly, surah 114). 27 qari lain di sumber tidak dipakai: surah tidak lengkap, alamat archive.org yang tidak tetap, riwayat tidak dapat dipastikan, atau sudah tersedia dari EQuran. Rincian: `scripts/gen-qari.mjs`, `tests/live/qari.mjs`.
- Versi yang ditampilkan (Lainnya & Tentang) berisi nomor build = waktu build (WIB) dan potongan commit; berubah otomatis setiap build.
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
| Infaq terhadap Trakteer & D1 sungguhan | Alur aplikasi, webhook, sinkronisasi Public API, dan klaim ID transaksi teruji secara lokal (SQLite + `wrangler dev`). Belum pernah dijalankan terhadap Trakteer atau D1 produksi. Mode QRIS langsung tidak resmi dan belum terverifikasi; lihat [INFAQ.md](INFAQ.md). |
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
2. Secret infaq (`TRAKTEER_WEBHOOK_TOKEN`, `TRAKTEER_API_KEY`) dan pendaftaran webhook; lihat [INFAQ.md](INFAQ.md).

## Pembaruan 1.1.0

- **Ikon PWA/APK tidak berganti — diperbaiki.** Penyebab: Service Worker menyimpan `manifest.webmanifest` dan berkas ikon di cache runtime tanpa batas waktu, dan nama berkas ikon tidak berubah, sehingga peramban menganggap ikon sama. Sekarang: nama ikon berversi (`*-v2.png`), manifest selalu diambil dari jaringan, cache runtime lama dibuang (`quranku-runtime-v2`). APK: `versionCode` kini naik otomatis di CI (sebelumnya selalu 1).
- **Mode baca baru "Halaman"**: satu halaman Mushaf Madinah per lembar, digeser ke samping (kanan → kiri). Tab mode: Terjemahan · Mushaf · Halaman. Ikon aksi per ayat (putar, bookmark, tafsir, salin, bagikan, lainnya) dan garis kemajuan surah.
- **Ayat pilihan**: 100 ayat (sebelumnya 33), berganti tepat tengah malam waktu perangkat, diperbarui saat aplikasi kembali ke layar, tombol "ayat lain", putar, bagikan.
- **Doa Wudhu & Wirid Setelah Salat**: `src/data/dzikir.json`, disalin apa adanya dari `fitrahive/dua-dhikr` (MIT) lewat `scripts/gen-dzikir.mjs`; tiap bacaan mencantumkan rujukan hadis.
- Uji: qari tidak ganda, ayat pilihan, ikon berversi, dzikir (unit); mode Halaman, wirid, ayat pilihan (E2E).

## Pembaruan 1.2.0 — Adzan otomatis

- **Adzan otomatis** (Jadwal Salat → kartu "Adzan otomatis", bisa On/Off, per waktu salat, pilihan muazin, tombol Coba).
  - Aplikasi terbuka/aktif di latar belakang: suara adzan diputar otomatis tepat waktunya (`src/services/adzan.js`).
  - Aplikasi ditutup: Worker (cron tiap menit) menghitung jadwal tiap pelanggan dan mengirim **Web Push** (`functions/lib/adzan.js`, `functions/lib/webpush.js`, `functions/api/push.js`, tabel D1 `push_subs`). Kunci VAPID dibuat otomatis dan disimpan di D1 (atau isi secret `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_JWK`).
  - **Batasan platform web:** saat aplikasi tertutup, yang berbunyi adalah nada notifikasi perangkat, bukan rekaman adzan; adzan diputar setelah pemberitahuan diketuk. Adzan bersuara penuh saat tertutup hanya mungkin dengan aplikasi Android native (AlarmManager), bukan PWA/TWA.
  - **Imsak** (Subuh − 10 mnt) dan **Tarhim** (Subuh − 15 mnt): pemberitahuan, hanya bulan Ramadan (kalender Umm al-Qura + koreksi hari pengguna). Belum ada rekaman tarhim dari sumber tepercaya, jadi tanpa audio.
  - Suara adzan: `cdn.aladhan.com` (6 rekaman yang tercantum di aladhan.com/play), diperiksa oleh `tests/live/adzan.mjs`.
- **Kompas kiblat** baru: piringan SVG berderajat, penanda Ka'bah, pusat derajat, cahaya & getar saat tepat kiblat, kartu statistik.
- **Versi naik otomatis** tiap merge ke `main` (`.github/workflows/version.yml`, patch +1).

## Pembaruan 1.3.0 — Navigasi mengambang, baca tanpa gangguan, Murottal & Asmaul Husna baru

- **Versi & pembaruan PWA terpasang.** Build menulis `version.json` (tidak pernah di-cache). Aplikasi membandingkannya saat dibuka / kembali ke layar dan memasang versi baru sendiri (`checkForUpdate` di `src/services/offline.js`). Di **Lainnya** ada kartu versi + tombol **Periksa**.
  - Catatan: angka "versi" di *Info aplikasi* Android untuk PWA yang dipasang lewat Chrome (WebAPK) dibuat oleh Chrome, **bukan** versi QuranKu, dan tidak bisa diatur dari situs. Versi yang benar adalah yang tertulis di Lainnya/Tentang. APK (TWA) memakai versi `package.json`.
  - `version.yml`: bila PR sudah menaikkan versi sendiri, angka itu dipakai apa adanya; selain itu patch +1.
- **Navigasi bawah mengambang** dengan tombol tengah bulat terangkat (Quran). Di ponsel, halaman baca tampil tanpa navigasi bawah.
- **Baca tanpa gangguan**: pada mode Mushaf & Halaman, menyentuh teks ayat tidak membuka apa pun; terjemahan & aksi dibuka dengan menyentuh **nomor ayat**.
- **Murottal**: pemutar baru (piringan berputar, riak, ekualiser saat memutar), baris surah aktif ditandai, pengaturan pemutar dilipat.
- **Asmaul Husna**: kartu baru, ayat QS. Al-A'raf 7:180 (diambil dari sumber teks aplikasi), tampilan detail dengan Sebelumnya/Berikutnya/Salin.

## Pembaruan 1.3.1 — Asmaul Husna v2, popup infaq, minimal Rp1.000

- **Asmaul Husna** memakai data v2 (`wnr-code/asmaul_husna` commit `6dad7b4`): makna, faedah/amalan, rujukan ayat (dapat disentuh → membuka ayatnya). Hasil pemeriksaan: 99 nama lengkap; 101 rujukan ayat semuanya menunjuk ayat yang ada; 4 nama (Al-Waajid, Al-Maani', Adh-Dhaarr, An-Naafi') berujukan hadits bilangan Asmaul Husna, bukan ayat. Metadata sumber menyebut penyusunan dibantu AI (Gemini) — makna/faedah belum ditinjau ustaz.
- **Popup infaq** mengikuti protokol skrip resmi penyedia (`?embedId=0&ref=…` + pesan `embed.openModal`). Tidak bisa diuji otomatis (penyedia memblokir bot) → perlu dicoba di HP. Tombol "Buka halaman pembayaran" selalu ada di bawah popup.
- **Nominal minimal Rp1.000** (`INFAQ_UNIT_PRICE = "1000"`); harga unit di akun penyedia harus disamakan.

## 1.3.2

- **Teks bacaan lebih rapat & rapi**: teks Arab pada mode Mushaf/Halaman tidak lagi rata kiri-kanan (yang merenggangkan spasi antarkata di layar sempit) melainkan rata tengah dengan spasi alami; bawaan ukuran font 28px dan tinggi baris 2,1 (pengguna yang masih memakai bawaan lama ikut dipindahkan; tetap bisa diatur lewat tombol Aa).
- **Tandai teks**: tekan lama/pilih kata pada ayat → muncul menu kecil (Salin, Tandai/Hapus tanda, Bookmark, Bagikan, Lainnya). Tanda disimpan di perangkat (`quranku:tanda`), dibulatkan ke kata utuh agar sambungan huruf Arab tidak rusak. Ketuk tanda untuk menghapusnya.
- Audit fitur: semua rute diperiksa pada lebar 360px & 412px (terang/gelap) — tanpa error JavaScript; smoke 25/25, infaq 4/4, fallback 4/4.
- Belum: tanda belum ikut dalam cadangan/pulihkan data; tekan lama di ponsel sungguhan belum diuji (hanya simulasi seleksi di Chromium).

## 1.3.3

- **Pasang aplikasi (PWA) di semua peramban**: sebelumnya kartu "Pasang QuranKu" hanya muncul bila peramban mengirim `beforeinstallprompt` (Chrome/Edge), sehingga di Firefox, Opera, Samsung Internet, Mi Browser, dan peramban dalam aplikasi tidak ada jalan memasang. Sekarang ajakan tampil di Beranda (bisa ditutup, ditawarkan lagi setelah 14 hari) dan kartu di Lainnya selalu ada selama belum terpasang. Bila dialog bawaan tidak tersedia, muncul panduan langkah sesuai peramban + tombol "Buka di Chrome" (`src/services/install.js`).
- Belum diuji di ponsel sungguhan: nama menu tiap peramban dapat berbeda antarversi; tautan `intent://` ke Chrome hanya berlaku di Android.

## 1.3.4

- **Alamat cadangan otomatis**: utama `https://quran.cgs.my.id`, cadangan `https://quran-cgs.appwnr.workers.dev` (Worker yang sama). Bila alamat yang sedang dipakai mati (gagal jaringan/DNS/SSL atau galat Cloudflare 52x/530), permintaan `/api`, `/data`, `/version.json` diulang ke alamat lain (`src/services/failover.js`), dan Service Worker mengambil berkas yang belum tersimpan dari alamat lain (`sw.js`). Setelah beralih, cadangan dipakai 3 menit lalu utama dicoba lagi. Worker memberi CORS hanya untuk dua alamat resmi; berkas statis publik `Access-Control-Allow-Origin: *`.
- Android (TWA): alamat cadangan dijadikan origin tepercaya + tautan aplikasi, jadi tetap layar penuh bila dibuka di sana.
- **Batas**: perangkat yang BELUM PERNAH membuka aplikasi tidak bisa dialihkan otomatis saat domain utama mati (tidak ada kode yang sempat berjalan) — harus membuka alamat cadangan langsung; data lokal (bookmark, pengaturan) terpisah per alamat. APK tetap membuka alamat utama; saat mati ia memakai tampilan tersimpan + data dari cadangan.
- Belum diuji terhadap domain yang benar-benar mati (hanya uji unit); `workers_dev = true` ditetapkan di `wrangler.toml`.

## 1.3.5

- **Lisensi MIT**: berkas `LICENSE`, `package.json` (`license`, `author`, `repository`), bagian Lisensi di README dan di aplikasi (Tentang → Lisensi, dengan tautan kode sumber). MIT hanya untuk kode; konten pihak ketiga mengikuti pemiliknya.
- **Tentang & Sumber Data diperbarui**: ringkasan fitur, pustaka perangkat lunak (Vite, qrcode-generator, Fontsource, Android Browser Helper), layanan (Cloudflare Workers & D1 + alamat cadangan, Web Push, Trakteer), daftar ayat pilihan; keterangan privasi menyebut data adzan otomatis.
- README ditulis ulang mengikuti fitur 1.3.x.

## 1.3.6

- **Infaq: alur diganti** karena popup sematan tetap 404. *Lanjut bayar* kini langsung membuka halaman pembayaran di tab baru dengan jumlah unit yang sama (`/tip?quantity=N`); aplikasi menunggu dan mengonfirmasi otomatis (webhook), lalu menutup tab tersebut. Kode popup/iframe, `embedUrl`, dan izin `frame-src` dihapus.
- Belum diuji terhadap Trakteer sungguhan: apakah jumlah unit benar-benar terisi dan webhook sampai — perlu dicoba di HP.

## 1.3.7

- **Cuplikan tautan media sosial**: tag Open Graph + Twitter Card + JSON-LD di `index.html`, gambar `public/og-image.jpg` (1200×630, dibuat `npm run gen:og`). Berlaku untuk WhatsApp, Facebook, Telegram, X, LinkedIn, dll.
- Batas: aplikasi memakai alamat `#/…`, yang tidak dibaca perayap media sosial — semua tautan (termasuk tautan ayat) menampilkan cuplikan yang sama. Cuplikan per surah/ayat memerlukan alamat tanpa `#` yang dirender Worker (belum dibuat).
- Belum diuji dengan perayap sungguhan (Facebook Sharing Debugger / WhatsApp) — hanya uji unit atas tag dan ukuran gambar.

## 1.3.8 — Infaq dalam popup (tanpa tab baru)

- Halaman Infaq kini menampilkan tombol **INFAQ** (teks, warna `#1A6275`, gambar unit, dan alamat `https://trakteer.id/lanteraku/tip` sama dengan kode sematan Trakteer). Ketuk → popup **INFAQ QURANKU** di atas halaman: pilih nominal → formulir Trakteer dimuat dalam bingkai (`iframe`) dengan `?quantity=N`.
- Tidak ada `window.open()`; halaman & posisi baca tidak berubah. Tombol kembali Android / Esc / X / ketuk latar menutup popup lebih dulu.
- Menutup popup **bukan** bukti bayar: status hanya berubah lewat webhook/sinkronisasi di server. Niat infaq tetap menunggu (30 menit) dan bisa dilanjutkan.
- Skrip `trbtn.min.js` tidak dimuat: ia memakai `document.writeln` (tidak aman dipanggil setelah halaman selesai dimuat pada SPA) dan hanya menghasilkan tautan biasa, tanpa mode popup. Tombol digambar sendiri dengan identitas yang sama.
- CSP: `frame-src` mengizinkan `trakteer.id` (+ subdomain, Midtrans, Xendit); `img-src` mengizinkan `mirror-uploads.trakteer.id`.
- **Belum teruji terhadap Trakteer asli** (sandbox tidak dapat menjangkau trakteer.id). Bila Trakteer mengirim `X-Frame-Options: SAMEORIGIN` / `frame-ancestors`, bingkai akan kosong; pengguna memakai bagian "Formulir tidak tampil atau kosong?" (tautan cadangan), atau aktifkan mode QRIS langsung (lihat di bawah) yang sepenuhnya di dalam aplikasi.

## 1.3.9 — Popup resmi Trakteer + papan donatur dengan ucapan

- Tombol **INFAQ** kini langsung membuka **popup sematan resmi Trakteer** di atas halaman (lapisan penuh berisi `iframe` ke `https://trakteer.id/v1/lanteraku/tip/embed/modal?embedId=0&ref=…`, protokol `embed.openModal` / `embed.modalClosed` seperti `trbtn-overlay.min.js`). Tanpa tab baru, tanpa `window.open`.
- Penyebab kegagalan sebelumnya: halaman tip biasa (`/lanteraku/tip`) menolak dibingkai ("menolak untuk terhubung"), dan jalur sematan lama tanpa `/v1` menampilkan 404. Jalur `/v1/…/tip/embed/modal` memuat formulir (diperiksa dari sisi server 2026-11-15); **tampilan di dalam aplikasi belum diuji pada perangkat nyata**.
- Isian nominal/nama di aplikasi dihapus; semuanya diisi di formulir Trakteer. API `/api/infaq/*` (niat/QRIS) tetap ada di server tetapi tidak lagi dipakai halaman.
- Papan donatur baru: ringkasan total, podium tiga besar, dan "Ucapan & doa donatur" berisi pesan (`supporter_message`) dari webhook. Kolom `donations.message` ditambahkan otomatis (`migrations/0002`). Pesan dibersihkan (tanpa `<>`/karakter kontrol, maks. 280) dan di-escape saat ditampilkan. Donasi lama tidak punya pesan.
- Menutup popup bukan bukti bayar: papan hanya dimuat ulang; data hanya dari webhook.
- CSP `frame-src https:` (penyedia pembayaran dapat berpindah ke gerbang pembayaran lain di dalam bingkai).
- Halaman **Lainnya** disegarkan: kartu identitas, kartu infaq, menu berbentuk ubin berwarna per kelompok.

## 1.3.10 — Akad infaq diperjelas

Halaman Infaq kini memuat kartu "Akad & tujuan infaq" sebelum tombol: pemberian sukarela (tabarru': hibah/sedekah), bukan jual beli/pinjaman/investasi, bukan zakat/wakaf, dana menjadi milik pengelola dan dipakai juga untuk kebutuhan pengelola, ada potongan penyedia pembayaran, papan donatur bukan imbalan, serta pernyataan akad. Teks disusun dari kaidah umum fikih hibah/sedekah; **belum ditinjau ustaz/ahli fikih** — sebaiknya ditinjau.

## 1.3.11 — Akad dalam popup, bantuan saat pembayaran diblokir

- Akad tidak lagi memenuhi halaman: INFAQ → popup "Akad & Tujuan Infaq" → "Bismillah, saya setuju & lanjut" → formulir pembayaran.
- Laporan pengguna: setelah memilih metode, langkah pembayaran "diblokir/blank" di dalam bingkai. Langkah itu sepenuhnya dikendalikan penyedia (halaman pembayarannya menolak dibingkai atau membuka jendela baru yang diblokir peramban) — tidak dapat diperbaiki dari aplikasi. Yang dilakukan: `Permissions-Policy: payment` kini mengizinkan penyedia, dan di lapisan formulir ada tautan "Buka halaman pembayaran" (halaman tip biasa, tab baru) sebagai jalan yang pasti berfungsi. **Belum diuji terhadap penyedia asli.**
