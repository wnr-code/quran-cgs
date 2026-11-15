# Data Safety, rating konten, dan deklarasi Play Console

Jawaban di bawah mencerminkan perilaku kode saat ini. Tinjau kembali bila fitur berubah. Keputusan akhir ada pada Anda sebagai pemilik akun developer.

## Data Safety
| Pertanyaan | Jawaban | Alasan |
|---|---|---|
| Apakah aplikasi mengumpulkan atau membagikan data pengguna? | **Tidak** | Bookmark, catatan, progres, pengaturan, dan lokasi hanya disimpan di perangkat dan tidak dikirim ke server pengembang. |
| Lokasi | Tidak dikumpulkan | Diproses hanya di perangkat untuk menghitung jadwal salat dan kiblat (pemrosesan di perangkat tidak termasuk "dikumpulkan" menurut definisi Play). |
| Data dienkripsi saat transit | Ya | Seluruh koneksi HTTPS. |
| Pengguna dapat meminta penghapusan data | Ya | Pengaturan → Hapus semua data saya; atau hapus data aplikasi. |

Catatan infaq: pembayaran terjadi di situs Trakteer (di luar aplikasi) dan tunduk pada kebijakan Trakteer. Nama tampilan dan nominal yang dikirim Trakteer ditampilkan di papan donatur. Bila Anda menilai hal ini sebagai pengumpulan data melalui aplikasi, deklarasikan **Info pribadi → Nama** dan **Info keuangan → Riwayat pembelian**, tujuan *Fungsi aplikasi*, opsional. Kebijakan privasi sudah menjelaskan hal ini.

## Rating konten (kuesioner IARC)
- Kategori: Referensi, Berita, atau Pendidikan
- Kekerasan, konten seksual, bahasa kasar, narkoba, judi: Tidak ada
- Interaksi antar pengguna / berbagi konten buatan pengguna: Tidak (nama donatur adalah teks pendek yang disanitasi; pertimbangkan sendiri)
- Berbagi lokasi dengan pengguna lain: Tidak
- Pembelian digital: Tidak
Perkiraan hasil: Semua umur / 3+. Rating final ditetapkan oleh kuesioner.

## Deklarasi lain
| Deklarasi | Jawaban |
|---|---|
| Iklan | Tidak mengandung iklan |
| Target usia | 13 tahun ke atas disarankan (menghindari persyaratan tambahan program Keluarga) |
| Akses aplikasi | Semua fitur tersedia tanpa login |
| Aplikasi berita / kesehatan / keuangan / pemerintah | Bukan |
| Izin sensitif | Tidak ada (hanya INTERNET dan POST_NOTIFICATIONS) |

## Alur pengujian
1. Internal testing (hingga 100 penguji, tanpa peninjauan panjang).
2. Closed testing (akun pribadi baru: ≥12 penguji selama 14 hari sebelum akses produksi).
3. Production dengan rilis bertahap.

Belum ada build yang diajukan atau ditinjau Google; kelulusan tidak dapat dijanjikan.
