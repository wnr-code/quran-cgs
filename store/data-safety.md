# Data Safety, rating konten, dan deklarasi Play Console

Ringkasan ini mengikuti APK Android Capacitor saat ini. Tinjau lagi setiap kali fitur atau alur data berubah; jawaban akhir di Play Console menjadi tanggung jawab pemilik akun developer.

## Data Safety (APK Android)

| Pertanyaan | Jawaban yang disarankan | Alasan |
|---|---|---|
| Apakah aplikasi mengumpulkan atau membagikan data pengguna? | **Ya, saat pengguna memakai infaq** | Nama tampilan, nominal, dan informasi transaksi dikirim untuk membuat/mencatat permintaan pembayaran. Tidak ada iklan atau pelacakan. |
| Lokasi | Tidak dikirim dari APK | Izin lokasi perkiraan diminta hanya jika pengguna menekan “Gunakan lokasi saya”; koordinat diproses dan disimpan di perangkat untuk jadwal salat/kiblat. APK tidak mendaftar Web Push. |
| Informasi yang dikirim untuk infaq | Nama dan informasi transaksi/pembelian, hanya bila pengguna memilih berinfaq | Nama tampilan dan nominal ditampilkan di papan donatur. Data pembayaran diproses oleh Trakteer dan mitranya; QuranKu tidak menerima nomor kartu/rekening/dompet digital. Lihat kebijakan privasi. |
| Data dienkripsi saat transit | Ya | Koneksi ke API dan layanan pembayaran memakai HTTPS. |
| Pengguna dapat meminta penghapusan | Ya | Data lokal dihapus dari Pengaturan; langganan push web dihapus saat dimatikan (fitur PWA, bukan APK). Penghapusan data papan donatur dapat diminta melalui kontak privasi. |

Untuk formulir Play, deklarasikan kategori data transaksi yang memang dikirim saat infaq; klasifikasi kategori dan tujuan akhir perlu dicocokkan dengan pertanyaan Play Console terbaru. Nama publik dan nominal ditampilkan pada papan donatur. Jangan menyatakan “tidak mengumpulkan data apa pun” selama alur infaq aktif.

**Catatan khusus PWA:** bila pengguna menyalakan Web Push Adzan di peramban yang mendukung, server QuranKu menyimpan alamat langganan push dan lokasi yang dibulatkan sekitar ±1 km untuk menghitung pemberitahuan. Fitur ini tidak tersedia di APK Capacitor dan bukan alasan untuk menyatakan APK mengirim lokasi.

## Rating konten (kuesioner IARC)

- Kategori: Buku & Referensi / Pendidikan.
- Kekerasan, konten seksual, bahasa kasar, narkoba, judi: Tidak ada.
- Interaksi antar pengguna / berbagi konten buatan pengguna: Tidak (nama donatur berupa teks pendek yang disanitasi; cek kembali kuesioner).
- Berbagi lokasi dengan pengguna lain: Tidak.
- Pembelian digital: Tidak; infaq sukarela bukan pembelian konten digital.
- Perkiraan hasil: Semua umur / 3+. Rating final ditetapkan oleh kuesioner.

## Deklarasi lain

| Deklarasi | Jawaban |
|---|---|
| Iklan | Tidak mengandung iklan |
| Target usia | 13 tahun ke atas disarankan (menghindari persyaratan tambahan program Keluarga) |
| Akses aplikasi | Fitur tersedia tanpa login; infaq opsional |
| Aplikasi berita / kesehatan / keuangan / pemerintah | Bukan |
| Izin Android | `INTERNET` dan `ACCESS_COARSE_LOCATION` (opsional, diminta setelah tindakan pengguna); tidak meminta `POST_NOTIFICATIONS` |

## Alur pengujian

1. Internal testing (hingga 100 penguji, tanpa peninjauan panjang).
2. Closed testing (akun pribadi baru: ≥12 penguji selama 14 hari sebelum akses produksi; periksa ketentuan Play Console terkini).
3. Production dengan rilis bertahap.

Belum ada klaim bahwa build ini telah diajukan atau disetujui Google Play. Uji deklarasi dan kebijakan Play Console sebelum rilis.
