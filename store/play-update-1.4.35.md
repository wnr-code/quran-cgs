# Perbarui listing Play Store — QuranKu (id.cgs.quranku)

Ringkasan jawaban: **update deskripsi listing tidak wajib dan bukan yang mendesak.**
Yang mendesak adalah **Data safety** (ada pernyataan yang bertentangan dengan praktik aplikasi) dan **screenshot** (masih versi lama).
Isi berkas ini disalin langsung dari repo supaya konsisten dengan aplikasi versi 1.4.35.

---

## 0. Urutan prioritas

| # | Item | Status di Play (17 Nov 2026) | Tindakan | Risiko bila dibiarkan |
|---|---|---|---|---|
| 1 | **Data safety** | "Tidak ada data dikumpulkan" + "Tidak ada data dibagikan" | **Perbaiki sekarang** (lihat bagian 3) | Tinggi — bertentangan dengan perilaku aplikasi & penanda "Membagikan Lokasi" dari Play |
| 2 | **Screenshot** | Versi 1.3.x: ada isian nominal, "Nama (tampil di papan donatur)", podium nama+nominal | **Ganti** setelah build 1.4.35 diunggah | Sedang — calon pengguna melihat fitur yang sudah tidak ada |
| 3 | **Build baru** | Terakhir update 17 Nov 2026 | Unggah AAB 1.4.35 dari GitHub Actions | Sedang — pengguna belum menerima Papan Kebaikan anonim & animasi doa |
| 4 | **Nama aplikasi** | `QuranKu-Ofline` (kemungkinan typo "Offline") | Ganti (opsional, tapi disarankan) | Rendah — hanya kualitas kesan pertama |
| 5 | **Deskripsi** | Versi pendek, ada typo "Bisa Ofline." | Tempel versi baru (bagian 2) | Rendah — tidak melanggar kebijakan |

Catatan: menambah fitur (Papan Kebaikan, animasi) **tidak** mewajibkan perubahan deskripsi. Play hanya meninjau deskripsi bila ada keluhan, klaim berlebihan, atau kata kunci yang menyesatkan.

---

## 1. Nama & deskripsi singkat

**Nama aplikasi** (26/30 karakter):

```
QuranKu - Al-Quran Digital
```

Alternatif bila ingin tetap menonjolkan offline (24/30):

```
QuranKu - Al-Qur'an Offline
```

> Jangan lagi memakai "Ofline" (salah eja). Nama di Play Console bisa diubah tanpa rilis baru.

**Deskripsi singkat** (68/80 karakter):

```
Al-Qur'an, murottal, doa, Tahlil & jadwal salat. Gratis tanpa iklan.
```

---

## 2. Deskripsi lengkap (3.072/4.000 karakter)

Tempel apa adanya ke Play Console → **Grow → Store presence → Main store listing → Deskripsi lengkap**.

```
QuranKu adalah aplikasi Al-Qur'an digital berbahasa Indonesia: gratis, tanpa iklan, tanpa akun, dan kode aplikasinya sumber terbuka. Baca, dengarkan murottal, dan kelola ibadah harian dalam satu aplikasi.

BACA AL-QUR'AN
• 114 surah dan 30 juz, dengan teks Arab, transliterasi Latin, serta terjemahan bahasa Indonesia.
• Pilih mode Terjemahan per ayat, Mushaf mengalir, atau Halaman mengikuti Mushaf Madinah.
• Atur ukuran huruf, jarak baris, lebar bacaan, warna, tema, dan tampilan angka Arab/Latin.
• Lanjutkan dari posisi bacaan terakhir; tandai kata, simpan bookmark dan catatan, lihat riwayat, serta ekspor/pulihkan cadangan.
• Buka tafsir per ayat dan cari surah, ayat (misalnya 2:255), juz, halaman, atau kata dalam terjemahan.

MUROTTAL
• 31 pilihan qari; 6 qari menyediakan audio per ayat.
• Putar per ayat atau satu surah, ulangi bacaan, dan atur kecepatan.
• Unduh audio surah pilihan untuk didengarkan offline.

TARGET TILAWAH
• Atur target harian berdasarkan halaman, juz, khatam 30 hari, atau target kustom.
• Lihat progres dan statistik harian, mingguan, bulanan, serta hari beruntun.
• Aktifkan pengingat tilawah dan pengingat saat target belum tercapai.

JADWAL SALAT & IBADAH
• Jadwal salat berdasarkan lokasi yang Anda pilih, dengan notifikasi azan dan pengingat sebelum salat.
• Jadwal imsak dan buka puasa; notifikasi imsak dan tarhim tersedia pada Ramadan.
• Arah kiblat dan kalender Hijriah, termasuk hari besar, catatan, serta pengingat pribadi pada tanggal pilihan.
• Tasbih digital.

DOA & ZIKIR
• Doa harian berdasarkan kategori, doa wudhu, serta wirid dan doa usai salat.
• Tahlil & Doa Arwah versi Lengkap dalam 28 langkah.
• Asmaul Husna: 99 nama beserta arti, makna, faedah, dan rujukan ayat.

INFAQ (OPSIONAL)
Infaq sukarela untuk pengembangan aplikasi; tanpa iklan dan tanpa konten berbayar. Nama dan nominal tidak pernah ditampilkan ke publik. Yang dibagikan di Papan Kebaikan hanya doa/ucapan yang Anda tulis sendiri, tanpa nama.

OFFLINE & NOTIFIKASI
Surah yang dibuka tersimpan di perangkat. Dari Kelola Offline, pilih surah atau unduh teks seluruh 114 surah; tafsir dan audio pilihan juga dapat disimpan. Unduhan pertama memerlukan internet. Kotak masuk lokal menyimpan pengumuman, pembaruan aplikasi, dan riwayat pengingat.

PRIVASI
Tanpa akun, iklan, pelacak iklan, atau analitik. Bookmark, catatan, progres, dan pengaturan tersimpan di perangkat. Jika Anda memilih Gunakan lokasi saya untuk mencari nama wilayah, koordinat dikirim langsung ke OpenStreetMap Nominatim, bukan ke server QuranKu. Infaq bersifat sukarela; formulir/pembayaran ditangani Trakteer dan mitranya. Server QuranKu menyimpan catatan transaksi, tetapi nama dan nominal tidak ditampilkan di publik; hanya doa/ucapan yang Anda kirim yang dibagikan anonim di Papan Kebaikan. Lihat kebijakan privasi untuk rinciannya.

Di Android, alarm dan pengingat dijadwalkan di perangkat. Notifikasi memerlukan izin; akses alarm tepat khusus Android 12 ke atas dapat diminta. Penghemat baterai, force-stop, atau kebijakan perangkat dapat menunda pengiriman. Streaming murottal dan rekaman azan memerlukan internet; audio hanya tersedia offline setelah diunduh.

Sumber data: EQuran.id dan Al Quran Cloud (teks, terjemahan, tafsir, dan audio); Quran NU Online (doa, wirid, dan Tahlil); mp3quran.net (murottal tambahan).
```

> Deskripsi ini **tidak** membanggakan angka unduhan, bukan klaim medis/agama yang berlebihan, dan tidak memuat kata kunci yang menyesatkan — tiga hal yang paling sering memicu peninjauan ulang.

---

## 3. Data safety — WAJIB diperbaiki

Play Console → **Policy → App content → Data safety**.

Saat ini listing menyatakan **"Tidak ada data yang dikumpulkan"** dan **"Tidak ada data yang dibagikan"**, sementara halaman aplikasi yang sama menampilkan badge **"Membagikan Lokasi"**. Artinya Play sudah mendeteksi perbedaan ini.

Jawaban yang sesuai dengan `store/data-safety.md` di repo:

| Pertanyaan | Jawaban |
|---|---|
| Apakah aplikasi mengumpulkan atau membagikan data pengguna? | **Ya, ada transmisi opsional** |
| Jenis data — **Lokasi** | **Lokasi perkiraan** — dikumpulkan? *Tidak disimpan di server QuranKu*; dibagikan? **Ya** (ke OpenStreetMap Nominatim saat Anda menekan "Gunakan lokasi saya"). Tujuan: **Fungsionalitas aplikasi**. Opsional: **Ya**. |
| Jenis data — **Info keuangan / riwayat pembelian** | **Info transaksi pembelian** — dibagikan ke Trakteer & mitra pembayarannya; diterima server QuranKu untuk status infaq. Tujuan: **Fungsionalitas aplikasi**. Opsional: **Ya**. |
| Jenis data — **Konten yang dibuat pengguna** | **Pesan/ucapan** (doa di Papan Kebaikan) — dibagikan publik **tanpa nama**. Opsional: **Ya**. |
| Data dienkripsi saat transit | **Ya** |
| Pengguna dapat meminta penghapusan data | **Ya** — data lokal dihapus dari Pengaturan; permintaan penghapusan Papan Kebaikan lewat kontak privasi |
| Apakah ada iklan/pelacak | **Tidak** |

Yang **tidak** perlu dicentang: nama, email, nomor telepon, kontak, kalender, foto, audio (aplikasi tidak mengumpulkannya), dan lokasi **tepat** (yang dikirim hanya koordinat saat pengguna memintanya — jika ragu, pilih *lokasi perkiraan*).

> Ini bukan nasihat hukum. Jawaban akhir tetap tanggung jawab pemilik akun; `store/data-safety.md` di repo adalah rujukan isinya.

---

## 4. Screenshot

Play meminta **2–8 screenshot**, sisi 320–3840 px, rasio maksimum 2:1, PNG/JPEG.

Screenshot yang sekarang terpasang (17 Nov 2026) berasal dari versi 1.3.x — masih menampilkan isian nominal dan nama donatur, plus podium. Bila ingin memperbarui, jalankan di komputer yang punya Chrome:

```bash
npm ci
npm i -D puppeteer-core          # sekali saja
npm run build
npm run gen:shots                # → store/screenshots/10-infaq.png, 13-infaq-akad.png, 14-infaq-papan.png
```

Skrip `scripts/gen-play-screenshots.mjs` menjalankan `dist/` dengan `/api/donors` tiruan (tanpa wrangler/D1) dan mengambil screenshot ukuran 824×1830. Bila Chrome tidak ditemukan, set `CHROME_PATH` atau jalankan `npx @puppeteer/browsers install chrome@stable`.

Untuk screenshot di luar halaman Infaq, berkas lama masih akurat kecuali yang menampilkan UI yang berubah. Untuk screenshot di luar halaman Infaq, berkas lama masih akurat kecuali yang menampilkan UI berubah.

**Rekomendasi urutan 8 screenshot** untuk listing:

1. Beranda (salam + jadwal salat berikutnya)
2. Mushaf / mode Halaman
3. Murottal per ayat
4. Doa harian
5. Jadwal salat
6. Kalender Hijriah
7. Papan Kebaikan (anonim) — **baru**
8. Lainnya / Sumber Data

---

## 5. Catatan rilis untuk versi 1.4.35

Tempel ke Play Console → **Release → What's new** (maks. 500 karakter):

```
Papan Kebaikan kini anonim: nama dan nominal tidak lagi ditampilkan. Yang dibagikan hanya doa & ucapan, tanpa nama.
Doa muncul dengan animasi halus, dan doa terbaru disorot singkat. Animasi otomatis nonaktif bila Anda mengaktifkan "kurangi gerakan" di perangkat.
Perbaikan: doa yang dikirim lewat formulir kini selalu tersimpan walau pembayaran terkonfirmasi lewat jalur cadangan.
```

---

## 6. Yang TIDAK perlu diubah

- **Kategori** (Buku & Referensi) — sudah tepat.
- **Rating konten** (Semua Umur) — sesuai; Papan Kebaikan tidak menambah konten baru yang perlu dinilai ulang (tetap tanpa nama, tanpa nominal).
- **Kebijakan privasi** — sudah diperbarui di repo (bagian "Infaq dan papan kebaikan"), otomatis dipakai listing karena URL-nya menunjuk ke `quran.cgs.my.id/privacy.html`.
- **Ikon & feature graphic** — tidak berubah.
