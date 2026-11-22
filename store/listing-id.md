# Listing Google Play — Bahasa Indonesia

**Nama aplikasi (maks. 30):** QuranKu - Al-Quran Digital

**Deskripsi singkat (maks. 80):**
Al-Qur'an, murottal, doa, Tahlil & jadwal salat. Gratis tanpa iklan.

**Deskripsi lengkap (maks. 4000):**

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

POSTER AYAT & BERBAGI
• Buat poster 9:16 (720 × 1280) dari ayat, doa, atau Asmaul Husna — pilih dari 22 tema, lalu simpan sebagai PNG/JPG atau bagikan ke Status WhatsApp.
• Bagikan teks ayat atau doa beserta tautan halaman yang bisa langsung dibuka penerima, atau salin ke papan klip.

DOA & ZIKIR
• Doa harian berdasarkan kategori, doa wudhu, serta wirid dan doa usai salat.
• Tahlil & Doa Arwah versi Lengkap: 29 bacaan berurutan, dari Tawassul hingga doa penutup.
• Asmaul Husna: 99 nama beserta arti, makna, faedah, dan rujukan ayat.

OFFLINE & NOTIFIKASI
Surah yang dibuka tersimpan di perangkat. Dari Kelola Offline, pilih surah atau unduh teks seluruh 114 surah; tafsir dan audio pilihan juga dapat disimpan. Unduhan pertama memerlukan internet. Kotak masuk lokal menyimpan pengumuman, pembaruan aplikasi, dan riwayat pengingat.

PRIVASI
Tanpa akun, iklan, pelacak iklan, atau analitik. Bookmark, catatan, progres, dan pengaturan tersimpan di perangkat. Jika Anda memilih Gunakan lokasi saya untuk mencari nama wilayah, koordinat dikirim langsung ke OpenStreetMap Nominatim, bukan ke server QuranKu. Infaq bersifat sukarela; formulir/pembayaran ditangani Trakteer dan mitranya. Server QuranKu menyimpan catatan transaksi, tetapi nama dan nominal tidak ditampilkan di publik; hanya doa/ucapan yang Anda kirim yang dibagikan anonim di Papan Kebaikan. Lihat kebijakan privasi untuk rinciannya.

Di Android, alarm dan pengingat dijadwalkan di perangkat. Notifikasi memerlukan izin; akses alarm tepat khusus Android 12 ke atas dapat diminta. Penghemat baterai, force-stop, atau kebijakan perangkat dapat menunda pengiriman. Streaming murottal dan rekaman azan memerlukan internet; audio hanya tersedia offline setelah diunduh.

Sumber data: EQuran.id dan Al Quran Cloud (teks, terjemahan, tafsir, dan audio); Quran NU Online (doa, wirid, dan Tahlil); mp3quran.net (murottal tambahan).

**Kategori:** Buku & Referensi
**Tag:** Al-Qur'an, Islam, Murottal, Jadwal Salat
**Kebijakan privasi:** https://quran.cgs.my.id/privacy.html
**Situs:** https://quran.cgs.my.id

## Screenshot

Delapan berkas di `store/screenshots/`, semuanya **1080 × 1920** piksel (9:16, rasio 1,78) — di dalam batas
Play (sisi 320–3840 px, rasio maksimum 2:1, PNG tanpa transparansi, maksimum 8 berkas per jenis perangkat).

| # | Berkas | Isi |
|---|---|---|
| 1 | `01-beranda.png` | Beranda: salam, tanggal Hijriah, progres tilawah, pintasan |
| 2 | `02-daftar-surah.png` | Daftar 114 surah + surah populer |
| 3 | `03-mushaf.png` | Al-Fatihah, teks Arab rasm Utsmani |
| 4 | `04-surah-albaqarah.png` | Mushaf Madinah halaman 2, teks rapat |
| 5 | `05-doa.png` | Doa & Dzikir: kategori, tab, filter tampilan |
| 6 | `06-jadwal-salat.png` | Jadwal salat Tasikmalaya, imsak & buka puasa |
| 7 | `07-asmaul-husna.png` | 99 nama Allah dengan kartu arti |
| 8 | `08-offline.png` | Kelola Offline: penyimpanan, unduh surah |

**Urutan ini disengaja**: Play hanya menampilkan ~2 gambar pertama tanpa digeser, jadi Beranda
(siapa aplikasi ini) dan daftar surah (isi utamanya) ditaruh paling depan.

Cara membuat ulang:

```bash
npm ci
npm run build
npm run gen:shots:app          # butuh Chromium; set CHROME_PATH bila tidak di lokasi standar
TZ=Asia/Jakarta npm run gen:shots:app   # penting: tanpa TZ, jam salat tampil dalam UTC
```

> **Waktu di screenshot.** Jadwal salat dihitung lokal memakai `getHours()`, jadi hasilnya mengikuti zona
> waktu perangkat yang menjalankan skrip. Di mesin UTC, Subuh tampil 20:57 — angka yang salah untuk pembaca
> Indonesia. Selalu jalankan dengan `TZ=Asia/Jakarta` (atau zona Indonesia lain yang sesuai).

Data screenshot berasal dari `scripts/play-shots-fixture.mjs`: teks Arab asli dari `public/data/`
(paket `quran-json`), terjemahan contoh untuk beberapa ayat, dan tanpa jaringan sama sekali.

## Catatan penulisan deskripsi

- **Setiap angka harus bisa dicek ke kode.** Pernah tertulis "Tahlil 28 langkah" padahal `src/data/tahlil.json` berisi **29** bacaan. Angka lain yang aman dikutip: 114 surah, 30 juz, 99 Asmaul Husna, 31 qari (6 per ayat + 25 surah penuh), 22 tema poster, poster 720 × 1280 (9:16).
- **Jangan menyebut fitur yang belum ada.** Play menghapus listing yang deskripsinya menjanjikan fitur tidak nyata. Sebelum menambah klaim, buka kodenya: rute ada di `src/app.js`, data di `src/data/`, teks fitur di `src/pages/`.
- **Jangan pernah menulis "tidak mengumpulkan data apa pun"** — lihat `store/data-safety.md`; ada transmisi opsional (nama wilayah ke Nominatim, infaq, Web Push di PWA).
- **Kata kunci alami, tanpa penumpukan.** Sebut istilah yang benar-benar dicari orang: Al-Qur'an, murottal/qari, tafsir, jadwal salat, azan/adzan, kiblat, doa harian, Tahlil, Asmaul Husna, offline. Jangan mengulang satu kata kunci berkali-kali; itu alasan umum listing ditolak.
- **Deskripsi singkat (80 karakter)** muncul di hasil pencarian — bagian awal harus memuat manfaat, bukan nama fitur internal.

## Aset
| Aset | Berkas |
|---|---|
| Ikon 512×512 | `store/graphics/icon-512.png` |
| Feature graphic 1024×500 | `store/quranku-playstore-feature-graphic-1024x500.png` |
| Screenshot ponsel | `store/screenshots/*.png` — **8 berkas, 1080×1920 (9:16), siap unggah.** Dibuat `npm run gen:shots:app` dari UI asli; lihat `store/screenshots-lama/` untuk arsip versi lama. |
