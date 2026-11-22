# Infaq untuk pengembang

Infaq adalah donasi sukarela; tidak ada barang, fitur, atau konten yang dijual. Seluruh alur berjalan di halaman
aplikasi sendiri (`#/infaq`); dana diterima lewat akun Trakteer `lanteraku`.

## Alur

1. Donatur memilih nominal, mengisi nama (opsional) dan pesan, lalu menekan **Lanjut bayar**.
2. Aplikasi memanggil `POST /api/infaq/create`. Worker mencatat "niat infaq" di D1, lalu:
   - **Mode QRIS langsung** (bila secret QRIS langsung terisi dan Trakteer menjawab dengan kode QRIS): Worker meminta
     QRIS ke Trakteer di latar belakang. Aplikasi menggambar kode QR sendiri, bisa diunduh sebagai PNG. Tidak ada tab
     baru dan tidak ada pengalihan.
   - **Mode halaman pembayaran** (bawaan; dipakai bila mode di atas belum diatur atau gagal): begitu *Lanjut bayar*
     ditekan, halaman pembayaran Trakteer **langsung terbuka di tab baru** dengan jumlah unit yang sama
     (`https://trakteer.id/lanteraku/tip?quantity=N`). Bila peramban memblokir tab baru, tersedia tombol
     *Buka halaman pembayaran*. Setelah infaq terkonfirmasi, tab yang dibuka aplikasi ditutup kembali.
3. Layar **Menunggu pembayaran**: aplikasi memeriksa `GET /api/infaq/status` secara berkala. Niat bertahan walau
   aplikasi ditutup atau dimuat ulang.
4. Begitu pembayaran tercatat → layar **Terima kasih** dan papan kebaikan diperbarui. Bila kedaluwarsa → layar gagal.
5. Bila pembayaran sudah dilakukan tetapi tidak terdeteksi, donatur memasukkan **ID transaksi** dari bukti bayar
   (`POST /api/infaq/claim`); Worker mencocokkannya dengan data yang diterima dari Trakteer.

Pembayaran hanya dianggap berhasil bila ada datanya dari Trakteer (webhook atau Public API). Aplikasi tidak pernah
menandai lunas berdasarkan pengakuan pengguna saja.

## Fungsi webhook dan Public API

| | Webhook | Public API |
|---|---|---|
| Arah | Trakteer → Worker (`POST /api/trakteer-webhook`) | Worker → Trakteer (`GET /supports`) |
| Kapan | Seketika saat ada dukungan baru | Saat donatur menunggu (dibatasi), dan tiap 15 menit lewat cron |
| Kegunaan | Konfirmasi cepat di layar menunggu | Jaring pengaman bila webhook terlewat; mengisi riwayat lama |
| Secret | `TRAKTEER_WEBHOOK_TOKEN` | `TRAKTEER_API_KEY` |

Keduanya menulis ke tabel yang sama; donasi yang sama tidak dihitung dua kali.

## Yang perlu Anda atur

Cloudflare → Worker `quran-cgs` → Settings → Variables and Secrets (jenis **Secret**):

| Secret | Wajib | Isi |
|---|---|---|
| `TRAKTEER_WEBHOOK_TOKEN` | ya | Token webhook dari Trakteer → Integrations → Webhook |
| `TRAKTEER_API_KEY` | disarankan | API key dari Trakteer → Integrations → Public API |
| `TRAKTEER_SESSION` | hanya QRIS langsung | Nilai cookie `trakteer-sess` |
| `TRAKTEER_CSRF_TOKEN` | hanya QRIS langsung | Nilai `<meta name="csrf-token">` dari sesi yang sama |
| `TRAKTEER_CREATOR_ID` | hanya QRIS langsung | ID kreator `lanteraku` |
| `TRAKTEER_UNIT_ID` | hanya QRIS langsung | ID unit dukungan |
| `TRAKTEER_SUPPORTER_ID` | opsional | ID akun pendukung pemilik sesi |
| `TRAKTEER_PAY_PATH` | opsional | Alamat permintaan QRIS bila berbeda, mis. `/pay/midtrans/qris` |

Lalu:

- Di Trakteer, daftarkan URL webhook `https://quran.cgs.my.id/api/trakteer-webhook` dan kirim webhook uji.
- Samakan `INFAQ_UNIT_PRICE` di `wrangler.toml` (sekarang `1000` = nominal minimal infaq) dengan harga 1 unit di akun Trakteer Anda. Bila
  berbeda, nominal yang ditampilkan aplikasi tidak sama dengan yang ditagih.
- Tabel D1 dibuat otomatis saat pertama dipakai; tidak perlu migrasi manual.

## Mode QRIS langsung: tidak resmi dan belum terverifikasi

Trakteer tidak menyediakan API resmi untuk membuat pembayaran. Mode ini meniru permintaan yang dikirim situs Trakteer
(`POST https://trakteer.id/pay/midtrans/qris`, lalu `/pay/xendit/qris` bila alamat pertama tidak ada) memakai sesi
sebuah akun pendukung. Bila jawabannya hanya berisi alamat halaman checkout, Worker mengambil halaman itu dan
mencari kode QRIS di dalamnya. Bentuk permintaan itu disusun dari
pengamatan, **belum pernah diuji terhadap Trakteer sungguhan**, dan bisa salah atau berubah kapan saja.

- Gunakan akun Trakteer **kedua** (akun pendukung), bukan akun kreator, untuk mengambil cookie dan CSRF token.
- Sesi kedaluwarsa; saat itu aplikasi otomatis kembali ke mode popup sampai secret diperbarui.
- Cara ini kemungkinan tidak sesuai ketentuan layanan Trakteer; akun bisa dibatasi.
- Hasil percobaan terakhir (status HTTP, nama kolom jawaban, tanpa rahasia) dapat dilihat:
  `curl -H "X-Webhook-Token: <token>" https://quran.cgs.my.id/api/infaq/diag`

Uji dengan satu transaksi nominal kecil sebelum mengandalkannya.

## Papan Kebaikan (anonim)

`GET /api/donors`: hitungan kebaikan tercatat + jumlah doa, dan 30 doa/ucapan terbaru (hanya yang punya pesan).
Nama donatur dan nominal **tidak dikirim ke publik** demi menjaga keikhlasan & privasi; kolom `name`/`amount`
tetap disimpan di D1 untuk pencocokan niat infaq di sisi server. Transaksi uji (ID berawalan `test`) disembunyikan.
Pesan diambil dari `supporter_message` (webhook) dan `support_message` (Public API `/supports`); keduanya dibersihkan
(tanpa `<>`/karakter kontrol, maks. 280) dan di-escape saat ditampilkan. Field webhook lain (`supporter_avatar`,
`media`, `unit_icon`, `net_amount`) sengaja diabaikan: avatar = privasi, media = relevansi/keamanan, `net_amount` = keuangan internal.

## Pembatasan

Pembuatan niat infaq dibatasi per alamat IP (disimpan sebagai hash) dan secara keseluruhan, untuk mencegah
penyalahgunaan. Pengguna yang terkena batas diminta menunggu beberapa menit.

## Pengujian

- `npm test` — logika webhook, sinkronisasi Public API, pencocokan, klaim ID transaksi (SQLite lokal).
- `tests/e2e/infaq.mjs` — alur di peramban terhadap `wrangler dev`; jawaban QRIS ditiru.
- Belum diuji: Trakteer sungguhan (webhook, Public API, QRIS langsung) dan D1 produksi.

## Halaman pembayaran langsung (pembaruan 1.3.6)

Popup sematan (`…/tip/embed/modal`) dihapus karena tetap menampilkan 404 di akun ini. Gantinya, halaman pembayaran
dibuka langsung dengan parameter `?quantity=N` sehingga jumlah unit di Trakteer sama dengan pilihan di aplikasi.
Konfirmasi tetap otomatis lewat webhook / Public API; pencocokan memakai nominal (dan nama bila ada beberapa infaq
bernominal sama yang sedang menunggu). Karena itu donatur tidak boleh mengubah jumlah unit di halaman pembayaran.

Halaman penyedia dilindungi pemeriksaan bot, sehingga **tidak dapat diuji otomatis** dari CI — mohon dicoba di HP.

Nominal minimal: **Rp1.000** (`INFAQ_UNIT_PRICE = "1000"`). Harga 1 unit di akun penyedia **harus** juga Rp1.000,
kalau tidak jumlah yang dibayar tidak akan cocok dengan yang dipilih di aplikasi.

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

## 1.4.34 — Papan Kebaikan anonim (tanpa nama & nominal)

- Papan donatur lama (podium tiga besar + daftar nominal per periode) diganti **Papan Kebaikan**: statistik **Kebaikan tercatat** (jumlah transaksi) dan **Doa & ucapan** (jumlah entri berpesan), lalu dinding “Mutiara Doa & Ucapan” berisi doa/ucapan terbaru dengan atribusi **Hamba Allah** + tanggal. Nominal dan nama tidak lagi diminta, disusun peringkat, atau ditampilkan.
- `mapSupport` kini memetakan `supporter_message` (webhook), `support_message` (Public API), atau `message`, sehingga doa dari jalur sinkronisasi tidak lagi hilang.
- Endpoint `/api/donors` hanya mengirim `totals.count`, `totals.doaCount`, dan 30 `doa { message, at }`. `periodStarts` dipertahankan agar uji periode WIB tetap berjalan, tetapi papan publik tidak lagi memakainya.
- Alasan: menjaga keikhlasan (tidak ada perlombaan nominal) dan privasi (nama donatur tidak tersimpan di cache/CDN publik), sesuai pilihan pemilik aplikasi.
- Teks akad, kebijakan privasi, README, STATUS, materi Play Store (Data Safety & deskripsi), dan halaman Tentang/Lainnya/Sumber Data diselaraskan dengan anonimitas ini.
- Kelas CSS dinding doa di-*scope* ke `.infaq-page` (`.doa-item`, `.doa-msg`, `.doa-meta`, `.doa-ayat`) agar tidak bentrok dengan komponen akordeon `.doa` di halaman Doa Harian.
- Uji regresi baru di `tests/unit.test.mjs` memastikan halaman/klien API tidak pernah merender `name`/`amount`/podium dan kelas `.doa-item` tetap di-scope ke `.infaq-page`.
- **Tangkapan layar Play Store `store/screenshots/14-infaq-papan.png` (dan `10-infaq.png`) masih versi lama** (papan donatur bernama & bernominal / isian nominal di aplikasi). Perlu dibuat ulang dengan `SHOTS_DIR=store/screenshots node tests/e2e/infaq.mjs` pada mesin yang punya peramban + `wrangler dev`.

## 1.4.35 — Animasi dinding doa (halus, bukan teks berjalan)

- Doa muncul bertahap saat papan dirender (`doa-in`: opacity + naik 8px, 0,5 dtk, jeda 55 ms per kartu, maksimal 6 kartu). Sekali jalan per render; tidak ada animasi berulang.
- Doa yang benar-benar baru sejak muat sebelumnya mendapat sorotan emas singkat (`doa-glow`, 2,4 dtk) lewat kelas `.is-new`. Sorotan hanya sekali: state `seenLatest` di halaman menyimpan waktu doa terbaru yang sudah pernah tampil. Muat pertama tidak menyorot apa pun.
- **Sengaja tidak memakai** marquee/teks berjalan atau auto-scroll: doa jadi sulit dibaca, terkesan seperti iklan, merebut kendali gulir dari pengguna, dan boros GPU/baterai di HP kelas bawah.
- `@media (prefers-reduced-motion: reduce)` mematikan kedua animasi. Test `tests/unit.test.mjs` menjaga agar blok dinding doa tidak pernah memakai `infinite`/`animation-play-state` dan aturan reduced-motion tetap ada.
