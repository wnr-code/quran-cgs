# Infaq untuk pengembang

Infaq adalah donasi sukarela; tidak ada barang, fitur, atau konten yang dijual. Seluruh alur berjalan di halaman
aplikasi sendiri (`#/infaq`); dana diterima lewat akun Trakteer `lanteraku`.

## Alur

1. Donatur memilih nominal, mengisi nama (opsional) dan pesan, lalu menekan **Lanjut bayar**.
2. Aplikasi memanggil `POST /api/infaq/create`. Worker mencatat "niat infaq" di D1, lalu:
   - **Mode QRIS langsung** (bila secret QRIS langsung terisi dan Trakteer menjawab dengan kode QRIS): Worker meminta
     QRIS ke Trakteer di latar belakang. Aplikasi menggambar kode QR sendiri, bisa diunduh sebagai PNG. Tidak ada tab
     baru dan tidak ada pengalihan.
   - **Mode halaman pembayaran** (cadangan otomatis bila mode di atas belum diatur atau gagal): aplikasi menampilkan
     tombol *Buka halaman pembayaran* yang membuka halaman pembayaran Trakteer dengan nominal, nama, dan pesan sudah terisi.
3. Layar **Menunggu pembayaran**: aplikasi memeriksa `GET /api/infaq/status` secara berkala. Niat bertahan walau
   aplikasi ditutup atau dimuat ulang.
4. Begitu pembayaran tercatat → layar **Terima kasih** dan papan donatur diperbarui. Bila kedaluwarsa → layar gagal.
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

Lalu:

- Di Trakteer, daftarkan URL webhook `https://quran.cgs.my.id/api/trakteer-webhook` dan kirim webhook uji.
- Samakan `INFAQ_UNIT_PRICE` di `wrangler.toml` (sekarang `5000`) dengan harga 1 unit di akun Trakteer Anda. Bila
  berbeda, nominal yang ditampilkan aplikasi tidak sama dengan yang ditagih.
- Tabel D1 dibuat otomatis saat pertama dipakai; tidak perlu migrasi manual.

## Mode QRIS langsung: tidak resmi dan belum terverifikasi

Trakteer tidak menyediakan API resmi untuk membuat pembayaran. Mode ini meniru permintaan yang dikirim situs Trakteer
(`POST https://trakteer.id/pay/xendit/qris`) memakai sesi sebuah akun pendukung. Bentuk permintaan itu disusun dari
pengamatan, **belum pernah diuji terhadap Trakteer sungguhan**, dan bisa salah atau berubah kapan saja.

- Gunakan akun Trakteer **kedua** (akun pendukung), bukan akun kreator, untuk mengambil cookie dan CSRF token.
- Sesi kedaluwarsa; saat itu aplikasi otomatis kembali ke mode halaman pembayaran sampai secret diperbarui.
- Cara ini kemungkinan tidak sesuai ketentuan layanan Trakteer; akun bisa dibatasi.
- Hasil percobaan terakhir (status HTTP, nama kolom jawaban, tanpa rahasia) dapat dilihat:
  `curl -H "X-Webhook-Token: <token>" https://quran.cgs.my.id/api/infaq/diag`

Uji dengan satu transaksi nominal kecil sebelum mengandalkannya.

## Papan donatur

`GET /api/donors`: 20 teratas Harian / Mingguan / Bulanan / Sepanjang waktu (zona WIB, pekan mulai Senin) dan 30
infaq terbaru. Nama digabung tanpa membedakan huruf besar-kecil. Transaksi uji (ID berawalan `test`) disembunyikan.

## Pembatasan

Pembuatan niat infaq dibatasi per alamat IP (disimpan sebagai hash) dan secara keseluruhan, untuk mencegah
penyalahgunaan. Pengguna yang terkena batas diminta menunggu beberapa menit.

## Pengujian

- `npm test` — logika webhook, sinkronisasi Public API, pencocokan, klaim ID transaksi (SQLite lokal).
- `tests/e2e/infaq.mjs` — alur di peramban terhadap `wrangler dev`; jawaban QRIS ditiru.
- Belum diuji: Trakteer sungguhan (webhook, Public API, QRIS langsung) dan D1 produksi.
