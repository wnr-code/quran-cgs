# Perbarui listing Play Store — QuranKu (id.cgs.quranku)

Ringkasan jawaban: **update deskripsi listing tidak wajib dan bukan yang mendesak.**
Yang mendesak adalah **Data safety** (ada pernyataan yang bertentangan dengan praktik aplikasi) dan **screenshot** (masih versi lama).
Isi berkas ini disalin langsung dari repo supaya konsisten dengan aplikasi versi 1.4.38.

---

## 0. Urutan prioritas

| # | Item | Status di Play (17 Nov 2026) | Tindakan | Risiko bila dibiarkan |
|---|---|---|---|---|
| 1 | **Data safety** | "Tidak ada data dikumpulkan" + "Tidak ada data dibagikan" | **Perbaiki sekarang** (lihat bagian 3) | Tinggi — bertentangan dengan perilaku aplikasi & penanda "Membagikan Lokasi" dari Play |
| 2 | **Screenshot** | Versi 1.3.x: ada isian nominal, "Nama (tampil di papan donatur)", podium nama+nominal | **Ganti** setelah build 1.4.38 diunggah | Sedang — calon pengguna melihat fitur yang sudah tidak ada |
| 3 | **Build baru** | Terakhir update 17 Nov 2026 | Unggah AAB 1.4.38 dari GitHub Actions | Sedang — pengguna belum menerima Papan Kebaikan anonim & animasi doa |
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
npm run build
npm run gen:shots   # → store/screenshots/10-infaq.png, 13-infaq-akad.png, 14-infaq-papan.png
```

`puppeteer-core` sudah tercatat sebagai devDependency, jadi `npm ci` cukup. Skrip `scripts/gen-play-screenshots.mjs` menjalankan `dist/` dengan `/api/donors` tiruan (tanpa wrangler/D1) dan mengambil screenshot ukuran 824×1830. Skrip mencari Chrome secara otomatis (Chrome, Chromium, Edge, Brave di lokasi standar; macOS/Windows/Linux). Bila tidak ditemukan: pasang Chrome, jalankan `npx @puppeteer/browsers install chrome@stable`, atau set `CHROME_PATH`.

> Catatan: unduhan Chromium memerlukan akses ke `storage.googleapis.com`, yang diblokir di sandbox pengembangan otomatis. Jalankan perintah ini di komputer/CI yang punya Chrome.

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

## 5. Catatan rilis untuk versi 1.4.38

Tempel ke Play Console → **Release → What's new** (420/500 karakter):

```
Papan Kebaikan kini anonim: nama dan nominal tidak ditampilkan. Yang dibagikan hanya doa & ucapan, tanpa nama.
Doa muncul dengan animasi halus; doa terbaru disorot singkat. Animasi otomatis nonaktif bila "kurangi gerakan" diaktifkan.
Akad infaq diperjelas: penerima, penggunaan dana, dan hak Anda. Akad cukup dibaca sekali dan bisa dibatalkan kapan saja.
Perbaikan: doa yang dikirim lewat formulir kini selalu tersimpan.
```

## 6. Yang TIDAK perlu diubah

- **Kategori** (Buku & Referensi) — sudah tepat.
- **Rating konten** (Semua Umur) — sesuai; Papan Kebaikan tidak menambah konten baru yang perlu dinilai ulang (tetap tanpa nama, tanpa nominal).
- **Kebijakan privasi** — sudah diperbarui di repo (bagian "Infaq dan papan kebaikan"), otomatis dipakai listing karena URL-nya menunjuk ke `quran.cgs.my.id/privacy.html`.
- **Ikon & feature graphic** — tidak berubah.

---

## 7. Mengunggah versi baru (langkah per langkah)

### 7.1 Unduh AAB yang sudah ditandatangani

1. Buka repo → **Actions** → workflow **Android build**.
2. Pilih run terbaru **pada `main`** (jangan run dari branch PR — nomor versinya lebih kecil dan bisa bentrok).
3. Unduh artifact **`quranku-play-store-aab-signed`**.
4. Ekstrak. Nama berkasnya kini memuat versi dan kode versi, mis. **`QuranKu-1.4.39-2250.aab`**. Cocokkan angkanya dengan ringkasan run.

> **Jangan pakai berkas bernama `app-release.aab` dari folder Unduhan.** Nama itu berasal dari unduhan run lama; mengunggahnya membuat Play menolak dengan *"Kode versi 1880 sudah digunakan"* (1880 = run #188). Artefak lama tetap bisa diunduh dan berkas di dalamnya tetap bernama `app-release.aab`, sehingga tidak ada cara membedakannya tanpa membuka ringkasan run asalnya. Selalu unduh ulang dari run yang benar.

Artifact ini hanya muncul bila keempat secret upload key sudah diatur di GitHub:

| Secret | Isi |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | keystore upload key dalam base64 |
| `ANDROID_KEYSTORE_PASSWORD` | password keystore |
| `ANDROID_KEY_ALIAS` | alias kunci |
| `ANDROID_KEY_PASSWORD` | password kunci |

Bila belum, workflow hanya menghasilkan APK debug (tidak bisa dipakai untuk Play).

### 7.2 Unggah ke Play Console

**Status: sudah dilakukan pada 22 November 2026.** AAB versi 1.4.38 berhasil diunggah ke **Internal testing** dan diterima Play tanpa penolakan tanda tangan. Ini membuktikan keempat secret upload key di GitHub memang cocok dengan upload key yang terdaftar di Play Console — tidak perlu reset upload key.

Langkah yang dipakai (untuk rilis berikutnya):

1. **Play Console → QuranKu → Testing → Internal testing** (lebih aman untuk percobaan pertama) atau **Production**.
2. **Create new release** → unggah `.aab`.
3. Isi **What's new** dengan teks di bagian 5.
4. **Review release** → pastikan tidak ada error → **Start rollout**.

Setelah rilis diterima, **jangan unggah AAB dengan `versionCode` lebih kecil** — Play akan menolak. `versionCode` dihitung dari nomor run workflow (`github.run_number * 10`), jadi selalu naik selama build dari workflow.

> **Catatan 22 November 2026:** AAB 1.4.38 yang sudah diunggah dibuat dari commit `4863179` (run #202), **sebelum** URL bersih ditambahkan — dan manifest-nya hanya mengklaim halaman beranda, sehingga tautan `https://quran.cgs.my.id/surah/2/255` dari WhatsApp pasti terbuka di peramban, bukan di aplikasi. Build **1.4.39** (run ≥ 223) memperbaiki itu: routing URL bersih, filter App Links lengkap (`android:path` per rute satu segmen + `android:pathPrefix` untuk `/surah/`, `/tafsir/`, `/doa/`), serta banner "Buka di aplikasi" yang memakai `intent://` untuk peramban dalam aplikasi seperti WhatsApp. `versionCode` build baru = nomor run × 10 sehingga selalu lebih besar dari 2020 dan aman diunggah sebagai pembaruan.

### 7.2.1 Checklist uji setelah terpasang dari Internal testing

Pasang lewat tautan *Internal testing* di Play (bukan APK manual) supaya data lama tetap ada.

| Yang diuji | Cara | Hasil yang benar |
|---|---|---|
| Pembaruan tanpa copot | Buka Play → perbarui QuranKu | Aplikasi tetap ada, bookmark & catatan utuh |
| Akad infaq sekali | Infaq → baca akad → setujui → tutup → tekan Infaq lagi | Akad tidak muncul lagi, langsung ke formulir |
| Akad bisa dibatalkan | Infaq → status akad → "Batalkan persetujuan" | Akad muncul lagi saat Infaq berikutnya |
| Akad tampil ulang bila teks berubah | (otomatis, tidak bisa diuji manual) | Versi teks di-hash; teks baru = akad tampil lagi |
| Papan Kebaikan anonim | Infaq → kirim doa → lihat Papan Kebaikan | Hanya doa + tanggal, **tanpa nama dan tanpa nominal** |
| Doa selalu tersimpan | Kirim doa lewat formulir | Doa langsung muncul di papan |
| Animasi & kurangi gerakan | Nyalakan "kurangi gerakan" di pengaturan | Doa tidak beranimasi, tetap terbaca |
| App Links | Ketuk `https://quran.cgs.my.id/surah/2/255` dari WhatsApp | Terbuka di aplikasi, bukan di Chrome |
| Buka di aplikasi (cadangan) | Bila tautan tetap terbuka di peramban WhatsApp, ketuk banner **Buka di aplikasi** di beranda | Aplikasi QuranKu terbuka di halaman yang sama — tanpa bergantung pada App Links |

### 7.2.2 Bila tautan dari WhatsApp tetap membuka peramban

Tiga sebab yang mungkin, berurutan dari yang paling sering:

| Sebab | Cara memastikan | Tindakan |
|---|---|---|
| Aplikasi di ponsel masih 1.4.38 (AAB run #202) | Tentang → versi tertulis 1.4.38 | Perbarui lewat Play (Internal testing), lalu ulangi. Manifest 1.4.38 hanya mengklaim beranda. |
| Filter lama `pathPattern="/.*/.*"` | — | Sudah diganti `pathPrefix` pada 1.4.39; `PatternMatcher` Android hanya membuat `.*` cocok satu karakter, jadi pola lama tidak pernah cocok dengan `/surah/2/255`. |
| WhatsApp membuka tautan di peramban dalam aplikasinya | Alamat bar tetap di dalam WhatsApp | Ketuk banner **Buka di aplikasi** di beranda (memakai `intent://`), atau menu ⋮ → **Buka di peramban**, lalu ulangi |

Verifikasi App Links setelah pembaruan terpasang: **Play Console → Test and release → App Links** (atau `adb shell pm get-app-links id.cgs.quranku`) harus menampilkan `verified` untuk `quran.cgs.my.id`. `assetlinks.json` sudah berisi kunci app signing Google (`56:45:F6:…:03:66`), jadi tidak perlu diubah.

### 7.3 Perbarui materi listing

| Item | Rujukan |
|---|---|
| Deskripsi lengkap | dokumen ini bagian 2 |
| Deskripsi singkat | bagian 1 |
| **Data safety** | bagian 3 — **wajib**, lihat peringatan di bawah |
| Screenshot Infaq | `npm run gen:shots` (bagian 4) |

### 7.4 Menguji APK di ponsel yang sudah memasang QuranKu dari Play

Artefak `QuranKu-APK-untuk-dipasang` berisi **dua** APK. Keduanya tidak bisa saling menggantikan:

| Berkas | Tanda tangan | Bisa dipasang menimpa aplikasi dari Play? |
|---|---|---|
| `QuranKu-<versi>.apk` | upload key (sama dengan AAB) | Ya — bila Play App Signing memakai upload key ini |
| `QuranKu-<versi>-uji.apk` | kunci **debug** bawaan Android | **Tidak pernah** |

Memasang APK debug menghasilkan pesan **"Aplikasi tidak diinstal karena paket ini bentrok dengan paket yang sudah ada"** (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). Itu bukan bug, melainkan perlindungan Android: aplikasi dengan nama paket sama (`id.cgs.quranku`) wajib memakai sertifikat yang sama.

### Bukti untuk kasus ini

Dua sidik jari yang tercatat di repository memang **berbeda**:

| Sumber | SHA-256 |
|---|---|
| Upload key yang menandatangani APK/AAB release (dari GitHub Secrets, tercetak di ringkasan workflow) | `18:A6:5D:42:52:3D:17:11:3D:83:CF:FB:1B:F3:F1:B6:0B:39:43:80:BB:99:BA:40:B7:09:BE:A4:4E:DC:4A:6E` |
| `public/.well-known/assetlinks.json` (kunci aplikasi yang sudah terpasang dari Play) | `56:45:F6:54:3C:D6:9E:43:30:B3:92:1C:91:C4:03:9C:50:3E:9A:5F:F9:23:CE:DF:43:BE:08:51:1B:DE:03:66` |

Karena berbeda, APK release pun **tidak akan bisa dipasang menimpa** aplikasi dari Play. Ini bukan salah pilih berkas: Play App Signing aktif, sehingga Google menandatangani ulang APK sebelum dikirim ke pengguna dengan kunci milik Google.

Halaman **Penandatanganan aplikasi** di Play Console hanya menampilkan **kunci app signing Google** ("Sedang digunakan"), bukan upload key. Artinya `56:45:F6:…` di `assetlinks.json` adalah kunci Google, dan `18:A6:5D:…` di GitHub Secrets adalah upload key milik Anda. Dua kunci berbeda untuk dua tugas berbeda — itu normal.

> **Jangan sentuh "Upgrade kunci penandatanganan aplikasi"** (di layar Anda muncul sebagai *Dapat mengupgrade lagi mulai 16 November 2027*). Mengganti kunci app signing membuat aplikasi yang sudah terpasang **tidak bisa menerima pembaruan** dalam jangka panjang, dan memaksa setiap pengguna memasang ulang. Kunci post-quantum (beta) juga tidak perlu diaktifkan untuk rilis ini.

**Sudah terjawab:** AAB 1.4.38 berhasil diunggah ke Internal testing (22 November 2026), jadi upload key di GitHub Secrets memang sama dengan yang terdaftar di Play Console. Bagian ini disimpan sebagai rujukan bila suatu saat upload key direset.

Tabel di bawah tetap berguna untuk satu hal: memahami mengapa APK manual tidak bisa menimpa aplikasi dari Play. Halaman **Penandatanganan aplikasi** hanya menampilkan app signing key, jadi bandingkan *App signing key certificate* dengan `56:45:F6:…` hanya bila App Links bermasalah.

**Jangan bandingkan dengan kunci post-quantum.** Bila suatu saat App Links bermasalah, yang dibandingkan hanya:

| Yang dibaca | Nilai yang diharapkan | Arti bila cocok |
|---|---|---|
| *App signing key certificate* (Kunci klasik) | `56:45:F6:…:03:66` | App Links sehat — inilah kunci yang menandatangani APK di ponsel pengguna |
| *Upload key certificate* | `18:A6:5D:…:4A:6E` | Terbukti cocok: AAB 1.4.38 diterima Play |

Bila *App signing key certificate* **tidak** sama dengan `56:45:F6:…`, perbarui `public/.well-known/assetlinks.json` dengan nilai dari Play Console — kalau tidak, tautan `quran.cgs.my.id` tidak akan terbuka di aplikasi. Cara menghitung sidik jari sertifikat yang diunduh: `npm run cert:fp -- <berkas>`.

Langkah bila aplikasi di ponsel ditandatangani kunci berbeda dari APK release:

- **Paling aman:** jangan pasang APK manual. Pakai jalur 7.2 (Internal testing) — Play yang memperbarui aplikasi, data pengguna tetap utuh.
- **Bila tetap ingin APK manual:** cadangkan dulu lewat aplikasi (**Lainnya → Pengaturan → Ekspor cadangan**), lalu copot QuranKu dan pasang APK release. Data lokal (bookmark, catatan, riwayat, progres tilawah) **hilang** bila tidak dicadangkan.

Sidik jari app-signing key juga dipakai App Links di `public/.well-known/assetlinks.json`; keduanya harus berisi nilai yang sama dengan sertifikat APK yang benar-benar terpasang di ponsel pengguna.

### 7.5 Peringatan Data safety

Listing saat ini menyatakan **"Tidak ada data dikumpulkan"** & **"Tidak ada data dibagikan"**, padahal aplikasi mengirim koordinat ke OpenStreetMap Nominatim saat Anda menekan "Gunakan lokasi saya", dan mengirim data transaksi ke Trakteer serta server QuranKu saat berinfaq. Play sendiri sudah menampilkan badge **"Membagikan Lokasi"** di listing.

Mengunggah versi baru **tidak** otomatis memperbaiki ini; formulir Data safety harus diperbarui terpisah di **Policy → App content → Data safety**. Rincian jawaban ada di bagian 3 dokumen ini.

### 7.5 Setelah rilis

- Versi build memakai `QURANKU_VERSION_CODE = github.run_number * 10`, jadi selalu naik di setiap run.
- Cek **Android vitals** beberapa hari setelah rilis.
- Perbarui `store/screenshots/` dan commit bila sudah memakai berkas baru.
