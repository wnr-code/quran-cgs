# Infaq pengembang (Trakteer) + papan donatur

Alur: pengguna menekan tombol Infaq → halaman Trakteer Anda terbuka → setelah pembayaran, Trakteer memanggil webhook → Pages Function menyimpan ke D1 → halaman Infaq menampilkan nama donatur dan Top Donatur Harian / Mingguan / Bulanan.

## 1. Tombol infaq
Isi variabel lingkungan `VITE_TRAKTEER_USERNAME` (mis. `namaanda` untuk `trakteer.id/namaanda`) lalu deploy ulang.

## 2. Database D1
1. Cloudflare → **Storage & Databases → D1** → **Create** → nama `quranku`.
2. Buka tab **Console**, tempel isi `migrations/0001_donations.sql`, jalankan.
   (Atau: `npx wrangler d1 execute quranku --remote --file migrations/0001_donations.sql`.)
3. Proyek Pages → **Settings → Bindings → Add → D1 database**: variable name **`DB`**, database `quranku`.

## 3. Token webhook
1. Trakteer → **Integrations → Webhook**: aktifkan, URL
   `https://quran.cgs.my.id/api/trakteer-webhook`
2. Salin **Webhook Token** dari halaman tersebut.
3. Proyek Pages → **Settings → Variables and Secrets → Add**: tipe **Secret**, nama **`TRAKTEER_WEBHOOK_TOKEN`**, nilai token tadi.
4. Deploy ulang (binding dan secret baru berlaku pada deployment berikutnya).

## 4. Uji
- Tekan **Kirim Tes Webhook** di Trakteer: harus berstatus sukses (200). Transaksi tes disimpan dengan `is_test = 1` dan **tidak** ditampilkan.
- `curl https://quran.cgs.my.id/api/donors` harus mengembalikan JSON (`daily`, `weekly`, `monthly`, `all`, `latest`).
- Lakukan satu transaksi nyata bernominal kecil dan pastikan nominal di papan donatur sama dengan nominal transaksi.

> **Perlu Anda verifikasi:** kode mengasumsikan kolom `price` pada payload Trakteer adalah total nominal transaksi. Asumsi ini belum diuji dengan transaksi sungguhan. Jika nominal yang tampil ternyata harga per unit, ubah `parseDonation` di `functions/api/trakteer-webhook.js` menjadi `price * quantity`.

## Yang disimpan
ID transaksi, nama tampilan donatur, nama unit, jumlah unit, nominal, waktu. Email dan pesan dukungan **tidak** disimpan. Periode dihitung dalam WIB; minggu dimulai hari Senin. Donatur digabung berdasarkan nama tampilan (tanpa membedakan huruf besar/kecil).

Menghapus entri: D1 Console → `DELETE FROM donations WHERE transaction_id = '...'`.
