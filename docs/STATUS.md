# Status fitur — teruji, belum teruji, dan batasan

Terakhir diperbarui: 14 November 2026.

## Pengujian implementasi Capacitor

- `npm test` — **51 lulus, 0 gagal**; mencakup API/Worker, CORS origin eksplisit, perutean API Capacitor, fallback pengingat Android, pemetaan data lama, kalender, Al-Qur'an, doa, infaq, dan database.
- `npm run cap:sync` — berhasil: build produksi Vite dan sinkronisasi ke `android/` selesai; Capacitor menemukan plugin App, Geolocation, Splash Screen, dan Status Bar. Font Arab ikut masuk ke `dist/fonts/`.
- Gradle APK, uji instrumentasi Android, dan emulator belum dijalankan di sandbox ini; workflow Android yang baru belum berjalan. Smoke test Java untuk UI bersama sudah ditambahkan.
- Uji migrasi yang lulus memeriksa pemetaan/validasi cache surah, bukan perpindahan end-to-end dari APK lama pada perangkat.
- Web CI (`ci.yml`) menjalankan `npm test` dan `npm run build`; Android workflow menjalankan tes Gradle dan startup smoke test emulator.

## Teruji terhadap API sungguhan
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
| Deploy Cloudflare (Workers), domain, proxy `/api/quran` | `npm run build` dan `npx --yes wrangler deploy --dry-run` (Wrangler 4.162.0) berhasil; dry-run membaca 177 aset dan tidak melakukan deploy. Namun check `Workers Builds: quran-cgs` pada PR #30 tetap gagal ([build `ca9dcb4c-8e2d-4697-95de-677cbd671fa2`](https://dash.cloudflare.com/880c5e424f64b605d1f118776956fd0b/workers/services/view/quran-cgs/production/builds/ca9dcb4c-8e2d-4697-95de-677cbd671fa2)). GitHub hanya menampilkan ID/script, tanpa anotasi atau alasan. PR tidak mengubah `worker/index.js` atau `wrangler.toml`; penyebab belum dapat dipastikan tanpa log Cloudflare. Deploy produksi/domain tetap belum diverifikasi. |
| Infaq terhadap Trakteer & D1 sungguhan | Alur aplikasi, webhook, sinkronisasi Public API, dan klaim ID transaksi teruji secara lokal (SQLite + `wrangler dev`). Belum pernah dijalankan terhadap Trakteer atau D1 produksi. Mode QRIS langsung tidak resmi dan belum terverifikasi; lihat [INFAQ.md](INFAQ.md). |
| Nominal pada papan donatur | Lihat catatan `price` di [INFAQ.md](INFAQ.md). |
| Notifikasi/adzan dan kompas berbasis sensor | PWA/Web Push perlu validasi pada peramban/perangkat sasaran. Android menampilkan pengingat sebagai toast saat aplikasi terbuka dan dapat memutar adzan foreground; tidak ada notifikasi sistem/alarm saat ditutup. Kiblat memakai bearing koordinat, tanpa sensor kompas. |
| Android APK/AAB | Workflow Capacitor baru menjalankan Gradle build/unit tests dan uji startup pada emulator Android 16, tetapi belum berjalan untuk perubahan ini. `npm run cap:sync` berhasil; Gradle/emulator belum diuji di sandbox dan perangkat fisik belum diuji. Run Compose lama tidak memvalidasi APK Capacitor. Belum ada rilis Play. Lihat [ANDROID.md](ANDROID.md). |
| Instalasi PWA di ponsel, Lighthouse, iOS Safari | Belum diuji. |

## Belum dikerjakan / berbeda dari spesifikasi
- **Data lokal cadangan terakhir** (`/data/`, dari paket `quran-json`) hanya berisi **teks Arab** — tanpa terjemahan, transliterasi, audio, dan tafsir (terjemahan paket itu tidak dipublikasikan karena hak redistribusinya tidak jelas). Berkas tersedia dari aset aplikasi; APK membundelnya, sedangkan PWA mengandalkan cache Service Worker untuk akses offline.
- **Notifikasi:** PWA dapat memakai Web Push setelah izin diberikan; saat tertutup bunyi mengikuti nada sistem dan adzan diputar setelah pemberitahuan diketuk. Android Capacitor tidak meminta izin notifikasi sistem atau menjalankan alarm saat ditutup; pengingat muncul sebagai toast dalam aplikasi dan adzan foreground hanya saat QuranKu terbuka.
- **Hari besar Islam pada kalender** dihitung dari kalender Umm al-Qura dan dapat berbeda 1–2 hari dari ketetapan pemerintah RI; tersedia koreksi ±2 hari di pengaturan.
- **Jadwal salat:** PWA dan APK memakai kalkulasi JavaScript lokal yang sama dan zona waktu perangkat. Keduanya memakai koordinat kota perkiraan dan dapat berbeda beberapa menit dari jadwal resmi Kemenag; cocokkan dengan otoritas setempat.
- **Nomor halaman** mengikuti mushaf Madinah 604 halaman dari metadata `quran-meta`, bukan dari API. Navigasi per halaman melompat ke ayat pertama halaman; tata letak baris demi baris seperti mushaf cetak tidak tersedia.
- **Pencarian kata** hanya mencakup surah yang sudah tersimpan di perangkat.
- **Mode imersif:** PWA tab mencoba Fullscreen API bila didukung; PWA terpasang dan APK Capacitor menyembunyikan UI browser melalui mode standalone tetapi tidak meminta immersive Android khusus.
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
  - **Batasan platform web:** saat PWA tertutup, yang berbunyi adalah nada notifikasi perangkat, bukan rekaman adzan; adzan diputar setelah pemberitahuan diketuk. Fitur adzan belum tersedia pada antarmuka Android native 1.4.0.
  - **Imsak** (Subuh − 10 mnt) dan **Tarhim** (Subuh − 15 mnt): pemberitahuan, hanya bulan Ramadan (kalender Umm al-Qura + koreksi hari pengguna). Belum ada rekaman tarhim dari sumber tepercaya, jadi tanpa audio.
  - Suara adzan: `cdn.aladhan.com` (6 rekaman yang tercantum di aladhan.com/play), diperiksa oleh `tests/live/adzan.mjs`.
- **Kompas kiblat** baru: piringan SVG berderajat, penanda Ka'bah, pusat derajat, cahaya & getar saat tepat kiblat, kartu statistik.
- **Versi naik otomatis** tiap merge ke `main` (`.github/workflows/version.yml`, patch +1).

## Pembaruan 1.3.0 — Navigasi mengambang, baca tanpa gangguan, Murottal & Asmaul Husna baru

- **Versi & pembaruan PWA terpasang.** Build menulis `version.json` (tidak pernah di-cache). Aplikasi membandingkannya saat dibuka / kembali ke layar dan memasang versi baru sendiri (`checkForUpdate` di `src/services/offline.js`). Di **Lainnya** ada kartu versi + tombol **Periksa**.
  - Catatan: angka "versi" di *Info aplikasi* Android untuk PWA yang dipasang lewat Chrome (WebAPK) dibuat oleh Chrome, **bukan** versi QuranKu, dan tidak bisa diatur dari situs. Versi web ada di Lainnya/Tentang; APK native memakai versi `package.json`.
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
- Android TWA lama (hingga 1.3.x): alamat cadangan dijadikan origin tepercaya + tautan aplikasi. Mulai 1.4.0 APK tidak lagi memakai TWA; lihat bagian Android native.
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

## 1.3.12 — Popup formulir tanpa elemen penghalang

Tombol X milik aplikasi hanya tampil selama formulir memuat (formulir penyedia punya tombol tutup sendiri) dan pita "Pembayaran tidak muncul…" dihapus karena menutupi tombol penyedia. Laporan pengguna: yang terblokir di dalam bingkai hanya dompet digital (GoPay, ShopeePay); QRIS/VA berjalan. Catatan + tautan halaman pembayaran dipindah ke halaman Infaq.

## 1.3.13 — Teks berjalan di atas formulir

Pita tipis berisi teks berjalan (petunjuk bila pembayaran blank; ketuk untuk membuka halaman pembayaran) berada di atas bingkai formulir — bingkai dimulai di bawah pita sehingga tidak ada yang tertutup.

### Webhook 401 (1.3.13)

`401 unauthorized` saat "Send Webhook Test" berarti nilai secret `TRAKTEER_WEBHOOK_TOKEN` di Worker tidak sama dengan Webhook Token di dasbor Trakteer (bila secret belum ada, jawabannya 503 `not_configured`). Perbandingan kini mengabaikan spasi/baris baru/tanda kutip di tepi, dan jawaban 401 memuat `hint`. Perbaikan: Cloudflare → Workers → quran-cgs → Settings → Variables and Secrets → `TRAKTEER_WEBHOOK_TOKEN` = token dari Trakteer → Deploy. Setelah 3 kegagalan Trakteer mematikan webhook otomatis: aktifkan lagi.

## 1.3.14 — Kalender: rincian tanggal, catatan & pengingat

- Ketuk tanggal → lembar rincian: tanggal Masehi/Hijriah, keterangan hari besar (`ISLAMIC_DAYS[].desc`), amalan terkait (puasa Senin/Kamis, Ayyamul Bidh, tasyrik, Ramadan, Jumat).
- Catatan pribadi per tanggal (tambah/ubah/hapus, maks. 20 × 300 karakter) di `localStorage` `quranku:kalender` — tidak dikirim ke server dan tidak ikut cadangan.
- Pengingat opsional (jam): notifikasi lokal lewat `startReminderLoop`; hanya muncul selama aplikasi terbuka/berjalan di latar, atau saat dibuka pada hari itu setelah jamnya lewat. Tidak ada push server.
- Tanda titik di sel (hari besar/catatan/pengingat), daftar "Catatan bulan ini" dan "Hari besar terdekat".
- Keterangan hari besar disusun dari pengetahuan umum; **belum ditinjau ustaz**.
- Uji: `tests/calendar.test.mjs`, `tests/e2e/calendar.mjs`.

## 1.3.15 — Kalender: tanggal merah & pasaran Jawa

- Pasaran (Legi, Pahing, Pon, Wage, Kliwon) dihitung dari siklus 5 hari; acuan uji: 17-8-1945 Jumat Legi, 6-6-1901 Kamis Pon, 1-1-1970 Kamis Wage, 14-2-2024 Rabu Legi (`src/utils/javanese.js`).
- Libur nasional 2026 & 2027 dari SKB 3 Menteri, cuti bersama 2027 (`src/data/libur-nasional.js`). Cuti bersama 2026 tidak dimuat. Tahun lain: perkiraan (tanggal tetap, Paskah hitungan, hari besar Islam menurut kalender aplikasi), tanpa Imlek/Nyepi/Waisak — **perlu diperbarui tiap SKB baru terbit**.
- Minggu & libur nasional berwarna merah; cuti bersama jingga.

## 1.3.16 — Doa sebelum berwudhu dari NU Online

- Enam bacaan sebelum berwudhu (ta‘awudz, basmalah, dua tahmid, ta‘awudz dari was-was setan, dua kalimat syahadat) disalin apa adanya dari <https://islam.nu.or.id/doa/doa-sebelum-berwudhu-M7e7B> (Alhafiz Kurniawan, 14-12-2020; mengutip Hasyiyatus Syarqawi hlm. 52). Menggantikan entri "Bismillāh" dari fitrahive/dua-dhikr.
- Doa sesudah berwudhu dan wirid setelah salat tetap dari fitrahive/dua-dhikr.
- Data di `src/data/dzikir.json` (`from: "nu"`, `sourceNU`); atribusi di halaman Doa Wudhu dan Tentang → Sumber data.

## 1.3.17 — Doa Harian: tata letak & wirid dari NU Online

- Tata letak kartu doa/zikir dirapikan: judul tidak lagi terjepit label "Dibaca Nx" (dulu melebar keluar layar di tab Wirid Salat), teks Arab dalam panel sendiri, catatan dan sumber terpisah di kaki kartu, empat tab muat tanpa terpotong pada lebar ≥ 360 px.
- Wirid setelah salat diganti dengan susunan 13 langkah dari <https://islam.nu.or.id/shalat/susunan-bacaan-wirid-sesudah-shalat-lima-waktu-aLgk4> (Mahbib Khoiron, 2-7-2017; susunan KH Muhammad bin Abdullah Faqih, Langitan). Teks Arab disalin apa adanya.
- Artikel NU hanya memuat teks Arab. **Latin dan arti zikir disusun QuranKu, belum ditinjau ustaz**; ayat Al-Qur'an (Ayat Kursi, Al-Baqarah 285–286, Ali Imran) diberi tautan ke mushaf, tanpa Latin/arti di kartu.
- Doa sesudah wudhu masih dari fitrahive/dua-dhikr; doa sehari-hari masih dari EQuran.id.

## 1.3.18 — Doa: lafaz saja, ukuran Arab, bagikan, ikon font

- Bilah tampilan di halaman Doa (semua tab): tombol **Arti** dan **Latin** (tampil/sembunyi) serta **Arab: Normal/Besar/Lebih besar**. Pilihan disimpan di `localStorage` `quranku:doa-tampilan`.
- Tombol **Bagikan** di tiap doa → lembar pilihan WhatsApp, Telegram, Facebook, X, "Lainnya" (menu bagikan bawaan perangkat bila tersedia), dan Salin teks. Teks berisi judul, Arab, Latin, arti, sumber, dan tautan `…/#/doa/<tab>` (`src/utils/doa-share.js`). Facebook hanya menerima tautan, sehingga teks ikut disalin.
- Tab Al-Qur'an kini juga punya tombol Salin.
- Ikon font: subset Font Awesome Free 6.7.2 (13 glif, ±2,5 KB) di `public/fonts/qk-icons-*.woff2`, lisensi di `public/fonts/LICENSE-fontawesome-free.txt`. Dipakai di halaman Doa; bagian lain aplikasi masih memakai ikon SVG.
- Tautan media sosial tidak dapat diuji sampai terkirim dari sandbox; hanya bentuk URL yang diuji.

## 1.3.19 — Doa penutup wirid salat dari Quran NU Online

- Langkah 13 wirid setelah salat kini berisi doa usai salat fardu (dua kartu: pujian & shalawat; permohonan) dari <https://quran.nu.or.id/doa/doa-shalat> bagian "Doa Usai Shalat Fardhu" — Arab, Latin, dan arti dari NU.
- Teks Arab disalin apa adanya dari halaman NU (bukan dari transkripsi tangkapan layar). Perbaikan salah ketik yang dilakukan: Latin "wa âlihi sayyidinâ" → "wa âli sayyidinâ", "Allâḫumma" → "Allâhumma", "sayyidinâ Muḫammadun" → "sayyidunâ Muḫammadun", "raḫmatikâ" → "raḫmatika", "ḫasanatanwa" → "ḫasanatan wa", "‘adzaban-nâri" → "‘adzâban-nâri"; kalimat Latin "Wa na‘ûdzu bika min syarri …" yang tidak ada di halaman NU ditambahkan mengikuti teks Arabnya; arti "jimat ampunanmu" → "ketetapan ampunan-Mu".
- Halaman yang sama memuat wirid lengkap versi NU dengan Latin dan arti (susunannya berbeda dari artikel Langitan yang dipakai di langkah 1–12) — kandidat pengganti Latin/arti buatan QuranKu.

## 1.3.20 — Doa wudhu & wirid/doa usai salat seluruhnya dari Quran NU Online

- **Tahap 1 dari migrasi ke <https://quran.nu.or.id/doa>** (16 kategori, 180 bacaan). Yang sudah dimuat: "Doa Wudhu" (11 bacaan → 17 kartu) dan "Doa Shalat" bacaan 1/20 "Doa Usai Shalat Fardhu" (wirid 13 langkah + doa). Arab, Latin, dan arti dari NU; Latin/arti buatan QuranKu dan data fitrahive/dua-dhikr serta artikel islam.nu.or.id (Langitan, Hasyiyatus Syarqawi) tidak dipakai lagi.
- **Belum dimigrasikan:** 19 bacaan lain di "Doa Shalat" dan 14 kategori lain (Keseharian, Rezeki, Tolak Bala, Kesehatan, Perjalanan, Ilmu, Waktu Tertentu, Kualitas Diri, Pernikahan, Hamil & Persalinan, Doa para Nabi, Baca Al-Qur'an, Haji & Umrah, Kematian). Tab "Sehari-hari" masih dari EQuran.id; tab "Al-Qur'an" masih dari data mushaf aplikasi.
- Halaman NU tidak memberi judul untuk tiap potongan bacaan; judul kartu (mis. "Saat berkumur", "Tahlil") dan pembagian bagian (Sebelum/Saat/Setelah wudhu; Wirid/Doa) disusun QuranKu berdasarkan isi dan urutan halaman.
- Perbaikan salah ketik terhadap halaman NU: Latin istighfar ("ash ḫâbil-huquq" → "ashḫâbil-ḫuqûqi", "walijami`il" → "wa lijamî‘il", ditambah "minhum"), arti istighfar ("sahabat-sahabat yang aku masih memiliki hak atasku" → "orang-orang yang memiliki hak atasku"), Latin Al-Fatihah ("mustqîm" → "mustaqîm"), Latin Ayat Kursi (ditambah "Allâhu" di awal), Latin "lâ ilâha illâhu wahdahu" → "illallâhu", arti "milikinya" → "milik-Nya"; penanda "×٣ / 3x / 33x" dipindah ke label "Dibaca N×"; tasbih/tahmid/takbir dipecah jadi tiga kartu agar penghitung berfungsi. Teks Arab tidak diubah.
- UI: judul bagian **Wirid** / **Doa** (warna berbeda, garis tepi kartu, label jenis di tiap kartu), tombol centang "sudah dibaca", bilah progres + "Ulangi"; penghitung yang penuh otomatis menandai kartu. Tanda hanya bertahan selama aplikasi terbuka. Tab "Wirid Salat" → "Usai Salat".
- Jadwal salat dari Lembaga Falakiyah NU: **belum dikerjakan** (belum ditemukan sumber data/API resminya).

## 1.3.21 — Doa harian per kategori (Quran NU Online), bagikan Asmaul Husna, beranda

- **Doa harian** kini dari Quran NU Online, tersimpan di aplikasi (offline) dan disusun per kategori seperti sumbernya: Keseharian 19, Rezeki 9, Tolak Bala 13, Kesehatan 5, Perjalanan 7, Ilmu 9 (62 doa). Salinan mentah di `scripts/nu-doa/*.txt`, diubah ke `src/data/doa-nu.json` dengan `node scripts/build-nu-doa.mjs` (menolak slug ganda). Judul doa dari sitemap quran.nu.or.id; batas antar-doa untuk kategori yang jumlah bloknya ≠ jumlah doa (Rezeki, Perjalanan, Ilmu) dicek ke halaman tiap doa.
- Doa harian dari EQuran.id **dibuang** (`src/api/doa-api.js`, `API.equranDoa`) supaya tidak ada doa ganda dari dua sumber.
- **Belum dimigrasikan (8 kategori):** Waktu Tertentu 12, Kualitas Diri 10, Pernikahan & Rumah Tangga 10, Hamil & Persalinan 7, Doa para Nabi di Al-Qur'an 14, Baca Al-Qur'an 7, Doa Shalat (19 sisanya), Haji & Umrah 21, Kematian 6. "Sumber & keterangan" tiap doa (rujukan kitab) juga belum disalin.
- **Teks doa harian tidak dikoreksi** (permintaan pemilik, 1.3.22): Arab, Latin, dan arti persis seperti halaman NU, termasuk yang tampak salah ketik (mis. "kependudukan", "anugerahmu-Mu"). Yang berbeda hanya teknis: tanda kutip pembungkus arti dan karakter tak terlihat dibuang, bacaan dua baris dijadikan satu baris.
- Sumber hanya di kaki halaman (`.src-foot`) dengan keterangan singkat; tidak lagi di tiap kartu.
- Asmaul Husna: tombol **Bagikan** (WhatsApp, Telegram, Facebook, X, Lainnya, Salin) lewat `src/components/share-sheet.js` yang dipakai bersama halaman Doa.
- Beranda: salam bertulisan Arab, ikon font sesuai waktu (pagi/siang/sore/malam), penyemangat acak dari `src/data/mutiara.js` — potongan terjemahan ayat dengan rujukan, **belum dicocokkan kata per kata dengan terjemahan Kemenag**.
- Halaman Tentang: entri EQuran doa dihapus, Font Awesome Free ditambahkan (sebelumnya tidak tercantum), entri NU diperbarui.
- Jadwal salat Lembaga Falakiyah NU: belum dikerjakan.

## 1.3.23 — Semua teks doa persis seperti Quran NU Online; sumber di README & Tentang diperbarui

- Koreksi QuranKu pada wirid/doa usai salat (1.3.19–1.3.20) **dibatalkan** setelah dicocokkan ulang dengan halaman `doa-shalat/doa-usai-shalat-fardhu`: Latin dan arti kembali seperti NU (termasuk "mustqîm", "illâhu wahdahu", "milikinya", "jimat ampunanmu", "âlihi sayyidinâ", dan kalimat "wa na‘ûdzu bika…" yang tidak ada di Latin NU). Catatan koreksi di bagian 1.3.19/1.3.20 di atas tidak berlaku lagi.
- Yang tetap berbeda dari halaman NU (teknis, bukan kata): tanda ‘ain yang di NU ditulis dengan backtick ditulis ‘; penanda "×٣ / 3x / 33x" dipindah ke label "Dibaca N×"; tasbih/tahmid/takbir tiga kartu; tanda kutip pembungkus arti dibuang.
- Doa wudhu tidak dicocokkan ulang pada putaran ini (sejak awal disalin tanpa koreksi).
- README (tabel Sumber data, daftar fitur), halaman Tentang, kebijakan privasi, dan teks listing: doa EQuran.id & fitrahive/dua-dhikr dihapus, Quran NU Online dan Font Awesome ditambahkan.
- Versi di "Info aplikasi" Android untuk PWA (WebAPK) ditentukan Chrome, bukan aplikasi; versi sebenarnya ada di Lainnya → kartu versi. Produksi saat pemeriksaan: 1.3.20 (PR #26 belum di-merge).

## 1.3.24 — Layar pembuka (splash) dan tema kustom

- **Layar pembuka** ditulis langsung di `index.html` (HTML + CSS sebaris, `public/splash.js` untuk ucapan sesuai waktu): logo dengan cincin berdenyut, salam bertulisan Arab + Latin, titik pemuat, lalu memudar ketika halaman pertama siap (`hideSplash` di `src/app.js`). Di aplikasi terpasang ditahan ±1,4 detik agar salam terbaca; di peramban ±0,5 detik. Bila aplikasi gagal dimuat, CSS menutupnya sendiri setelah 8 detik. Menghormati "kurangi gerakan".
- Layar pembuka **bawaan sistem** (ikon + warna latar sebelum halaman dimuat, dari `manifest.webmanifest`) tidak dapat dianimasikan atau diberi tulisan; layar kustom tampil tepat setelahnya dengan warna latar yang sama.
- **Tema kustom** (Pengaturan → Tema → Kustom): 8 palet siap pakai + tiga warna pilihan (utama, aksen, latar). Variabel lain diturunkan di `src/utils/theme.js`; terang/gelap dikenali dari warna latar, warna utama digeser bila kontrasnya < 3. Disimpan di `settings.customTheme`, ikut ekspor/impor cadangan; variabel jadi disimpan di `quranku:theme-vars` supaya `public/theme-init.js` memasangnya sebelum render pertama.
- Batasan tema kustom: halaman baca Al-Qur'an memakai preset sendiri ("Aa"); beberapa hiasan berwarna tetap (garis emas ornamen, halaman kiblat/infaq) tidak ikut berubah. Diuji di Chromium desktop (390 px), belum di HP.

## 1.3.25 — Halaman Sumber Data terpisah

- Rute baru `#/sumber` (`src/pages/sources.js`): ucapan terima kasih kepada seluruh sumber, lalu daftar sumber. Alamat sumber ditulis sebagai teks dengan tombol **Salin** (bukan tautan aktif); hanya alamat `github.com` yang tetap tautan aktif.
- Halaman Tentang tidak lagi memuat daftar sumber, hanya ringkasan + tombol ke Sumber Data. Menu Lainnya dan Pengaturan punya entri "Sumber Data" sendiri.
- Nama sumber di footer halaman doa dan Asmaul Husna kini menuju `#/sumber`, tidak lagi membuka situs sumber.

## 1.4.0 — Antarmuka Android native

- APK Android dialihkan dari TWA ke aplikasi **Jetpack Compose**: tidak memuat situs dalam WebView dan tidak bergantung pada Chrome Custom Tabs. Beranda, tab bawah, Qur'an, doa, jadwal, kiblat, tasbih, Asmaul Husna, Tentang, dan Sumber Data memiliki tampilan Android tersendiri.
- Daftar surah (114/6236) dibundel dari metadata `quran-meta` (MIT). Teks Arab, Latin, dan terjemahan Kemenag dimuat dari EQuran.id dan dicache lokal per surah; bacaan yang belum pernah dibuka memerlukan internet.
- Data doa Quran NU Online, dzikir Wudhu/Usai Salat, dan Asmaul Husna disalin dari `src/data/` saat Gradle membangun APK; bisa dibaca offline.
- Jadwal salat dihitung lokal dengan model astronomis Kemenag 20°/18°, ihtiyat 2 menit, Asar Syafi'i; koordinat pusat kota bersifat perkiraan. Tampilkan catatan agar pengguna mencocokkan jadwal resmi.
- Kiblat menunjukkan bearing dari kota, **tanpa sensor kompas**. Tidak meminta GPS. Tasbih disimpan di preferensi lokal.
- **Belum dipindahkan ke APK native:** murottal/audio, tafsir, bookmark, kalender/catatan, target, adzan/pengingat, infaq, dan fitur offline PWA. Tetap ada di versi web/PWA.
- Build awal berhasil sebagai APK uji `QuranKu-1.4.0-uji.apk` (debug, satu tanda tangan sementara); APK release belum ditandatangani dengan kunci pemilik aplikasi.

## 1.4.1 — Stabilitas startup, Android 16, dan UI header

- Penanganan startup mengisolasi kegagalan pembacaan data offline agar aplikasi tetap menampilkan antarmuka dan memberi opsi coba lagi; preferensi lokal bertipe lama/rusak memakai nilai aman.
- Splash screen APK memakai Jetpack SplashScreen API dengan ikon vektor buku QuranKu dan warna latar yang mengikuti mode terang/gelap.
- Target SDK dan pengujian diarahkan ke Android 16 / API 36, sesuai batas pengiriman update Google Play yang berlaku sejak 31 Agustus 2026. CI menambahkan tes instrumentasi launch/asset pada emulator Android 16; ini belum menggantikan uji HP fisik atau Play Console Pre-launch report.
- Header beranda web dan native memisahkan salam Arab, salam waktu, dan tanggal dengan hierarki serta jarak yang lebih rapi; header tab dan halaman native memakai pola gradien/ornamen yang konsisten.
- Akar crash startup terkonfirmasi di emulator: Compose `painterResource()` diberi ikon peluncur adaptive XML (`R.mipmap.ic_launcher`), yang tidak didukung dan melempar `IllegalArgumentException`. Beranda dan Tentang kini memakai ikon buku `VectorDrawable` yang didukung.
- Uji instrumentasi `freshLaunchRendersHomeGreeting` serta `bundledContentLoadsAndPrayerDoaTabOpens` lulus pada emulator Pixel Android 16 / API 36; workflow [43796748819](https://github.com/wnr-code/quran-cgs/actions/runs/43796748819) juga membangun APK debug dan AAB validasi tanpa tanda tangan (tidak untuk unggah Play).
- Ini belum menggantikan uji HP fisik, Play Console Pre-launch report, penandatanganan dengan kunci upload pemilik, atau keputusan Google Play; belum ada klaim lulus Play Store.
