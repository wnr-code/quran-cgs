# Data Safety, rating konten, dan deklarasi Play Console

Ringkasan ini mengikuti APK Android Capacitor saat ini. Tinjau lagi setiap kali fitur atau alur data berubah; jawaban akhir di Play Console menjadi tanggung jawab pemilik akun developer.

## Data Safety (APK Android)

| Pertanyaan | Jawaban yang disarankan | Alasan |
|---|---|---|
| Apakah aplikasi mengumpulkan atau membagikan data pengguna? | **Ada transmisi opsional saat pengguna memakai pencarian nama lokasi atau infaq** | Koordinat lokasi dikirim langsung dari perangkat ke OpenStreetMap Nominatim hanya saat pengguna meminta nama wilayah; data transaksi infaq dikirim ke Trakteer/mitranya dan server QuranKu. Cocokkan klasifikasi lokasi dan transaksi/donasi dengan definisi Data Safety terbaru. Tidak ada iklan atau pelacak iklan/analitik. |
| Lokasi | Lokasi perkiraan, opsional | `ACCESS_COARSE_LOCATION` diminta setelah tindakan pengguna. Koordinat dipakai lokal untuk jadwal salat/kiblat; saat pengguna meminta pencarian nama wilayah, perangkat mengirim koordinat langsung ke Nominatim. Koordinat tidak dikirim ke server QuranKu oleh APK. APK tidak mendaftar Web Push. |
| Informasi yang dikirim untuk infaq | Nama dan informasi transaksi/pembelian, hanya bila pengguna memilih berinfaq | Nama tampilan dan nominal ditampilkan di papan donatur. Data pembayaran diproses oleh Trakteer dan mitranya; QuranKu tidak menerima nomor kartu/rekening/dompet digital. Lihat kebijakan privasi. |
| Data dienkripsi saat transit | Ya | Koneksi ke API dan layanan pembayaran memakai HTTPS. |
| Pengguna dapat meminta penghapusan | Ya | Data lokal dihapus dari Pengaturan; langganan push web dihapus saat dimatikan (fitur PWA, bukan APK). Penghapusan data papan donatur dapat diminta melalui kontak privasi. |

Untuk formulir Play, tinjau kategori lokasi (untuk permintaan nama wilayah) dan data transaksi/donasi (saat infaq) sesuai definisi Play Console terbaru. Nama publik, nominal, dan ucapan dapat tampil pada papan donatur. Jangan menyatakan “tidak mengumpulkan data apa pun” bila kedua alur opsional tersebut tersedia.

**Catatan khusus PWA:** bila pengguna menyalakan Web Push Adzan di peramban yang mendukung, server QuranKu menyimpan alamat langganan push dan lokasi yang dibulatkan sekitar ±1 km untuk menghitung pemberitahuan. Fitur ini tidak tersedia di APK Capacitor dan bukan alasan untuk menyatakan APK mengirim lokasi.

## Rating konten (kuesioner IARC)

- Kategori: Buku & Referensi / Pendidikan.
- Kekerasan, konten seksual, bahasa kasar, narkoba, judi: Tidak ada.
- Interaksi antar pengguna / berbagi konten buatan pengguna: Tidak ada chat atau pesan antar pengguna. Namun papan donatur menampilkan nama/ucapan yang dikirim pengguna secara publik; jawab kuesioner IARC dengan mempertimbangkan konten publik ini.
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
| Izin Android | `INTERNET`; `ACCESS_COARSE_LOCATION` (opsional, diminta setelah tindakan pengguna; tidak ada lokasi latar); `POST_NOTIFICATIONS` (izin runtime untuk notifikasi); `SCHEDULE_EXACT_ALARM` (akses khusus untuk alarm tepat); `RECEIVE_BOOT_COMPLETED` (memulihkan jadwal setelah reboot) |

## Alur pengujian

1. Internal testing (hingga 100 penguji, tanpa peninjauan panjang).
2. Closed testing (akun pribadi baru: ≥12 penguji selama 14 hari sebelum akses produksi; periksa ketentuan Play Console terkini).
3. Production dengan rilis bertahap.

Belum ada klaim bahwa build ini telah diajukan atau disetujui Google Play. Uji deklarasi dan kebijakan Play Console sebelum rilis.
