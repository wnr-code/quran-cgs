# Android native (Jetpack Compose)

Sejak versi **1.4.0**, APK bukan lagi Trusted Web Activity (TWA) atau halaman situs di dalam WebView. Beranda, navigasi, daftar surah, pembaca, doa, jadwal, kiblat, tasbih, Asmaul Husna, dan halaman informasi dibuat dengan komponen Android native. Aplikasi tidak memuat `quran.cgs.my.id` sebagai antarmuka.

## Isi dan batasan versi native

- **Al-Qur'an:** metadata 114 surah tersedia offline. Teks Arab, transliterasi, dan terjemahan Kementerian Agama RI diambil langsung dari EQuran.id ketika surah dibuka pertama kali, lalu disimpan di perangkat. Bacaan yang sudah tersimpan dapat dibuka offline; surah yang belum pernah dimuat memerlukan internet.
- **Doa:** data Doa Harian, Wudhu, dan Usai Salat dari `src/data/` disalin ke APK setiap build. Bacaan tetap tersedia offline; halaman bacaan punya kontrol Latin/arti dan Bagikan.
- **Jadwal salat:** dihitung di perangkat dari kota yang dipilih pengguna (tidak meminta GPS). Koordinat kota merupakan perkiraan pusat kota. Perhitungan astronomis Kemenag 20°/18°, Asar Syafi'i, ihtiyat dua menit; waktu dapat berbeda beberapa menit dari jadwal resmi. Cocokkan dengan jadwal Kemenag/otoritas setempat.
- **Kiblat:** menampilkan bearing dari koordinat kota; bukan kompas sensor dan tidak menunjukkan arah relatif ke posisi ponsel.
- Ada Tasbih Digital dan Asmaul Husna, serta dukungan mode terang/gelap sesuai sistem.
- **Belum dipindahkan dari PWA/web:** murottal/audio, tafsir, bookmark, kalender dan catatan, target tilawah, notifikasi/adzan, infaq, ekspor-impor, serta fitur offline PWA. Fitur tersebut tetap tersedia di situs/PWA.
- Izin Android aplikasi: `INTERNET`. Tidak meminta akun, izin lokasi, atau notifikasi.
- Antarmuka baru ini sudah disusun untuk Android, tetapi belum diuji di perangkat fisik; ukuran layar, aksesibilitas, dan perilaku beberapa versi Android perlu diuji sebelum rilis publik.

## Build tanpa Android Studio

Workflow GitHub **Android build** berjalan otomatis saat berkas `android/` berubah. Bisa juga dijalankan manual dari **Actions → Android build → Run workflow**. Android Studio tidak diperlukan untuk mengambil hasil build.

1. Buka run workflow yang selesai dengan status **success**.
2. Di bagian **Artifacts**, unduh `QuranKu-APK-untuk-dipasang` dan ekstrak zip.
3. Tanpa secret kunci rilis, nama APK berakhiran `-uji.apk`: itu APK debug, bertanda tangan kunci debug sementara. Versi rilis bertanda tangan, bila secret sudah disiapkan, berakhiran `.apk` tanpa `-uji`.
4. `quranku-play-store-aab` hanya untuk Play Console dan bukan berkas yang diketuk untuk instalasi langsung.

APK menggunakan package `id.cgs.quranku`, minSdk 23, targetSdk 35. Nama versinya mengikuti `package.json`; `versionCode` CI dinaikkan berdasarkan nomor build.

### Play Protect dan pemasangan dari luar Play Store

Play Protect dapat memperingatkan atau memblokir APK yang diunduh dari luar Google Play, terutama APK debug/berkunci pengembang yang belum dikenal. Peringatan itu **tidak membuktikan** APK aman maupun berbahaya; build CI hanya memeriksa format paket dan tanda tangan, bukan melakukan sertifikasi Google. Jangan mematikan Play Protect untuk mengatasi peringatan. Untuk distribusi umum, gunakan APK rilis dengan kunci tetap dan jalur distribusi resmi (misalnya Google Play); tetap ikuti hasil pemeriksaan Google.

Kalau Android menyebut paket tidak valid, pastikan zip diekstrak dahulu dan pilih satu-satunya berkas `QuranKu-…apk`. Jika versi terpasang dibuat dari build debug lain, tanda tangan sementaranya mungkin berbeda: instalasi pembaruan dapat ditolak. Menghapus aplikasi lama lalu memasang yang baru dapat menghilangkan data lokal lama, termasuk cache bacaan dan hitungan tasbih.

## Menyiapkan kunci rilis tetap

Kunci harus dibuat dan disimpan oleh pemilik aplikasi. **Jangan kirim kunci, kata sandi, atau berkas keystore lewat chat; jangan commit ke repository.** Buat sekali di komputer yang memiliki JDK:

```bash
keytool -genkeypair -v -keystore quranku-upload.jks -alias quranku -keyalg RSA -keysize 2048 -validity 10000
```

Simpan `quranku-upload.jks` dan kata sandinya di tempat aman. Encode berkas untuk GitHub Actions, misalnya di Linux:

```bash
base64 -w0 quranku-upload.jks
```

Di GitHub → **Settings → Secrets and variables → Actions**, simpan hasil dan informasi kunci sebagai Actions secrets berikut:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS` (misalnya `quranku`)
- `ANDROID_KEY_PASSWORD`

Jalankan kembali workflow. Bila keempat nilai valid, CI menandatangani APK dan AAB release dengan kunci yang sama. Simpan cadangan kunci: kehilangan kunci dapat mencegah pembaruan APK yang dipasang langsung. Google Play memakai Play App Signing jika aplikasi diterbitkan di Play; ikuti instruksi Play Console untuk kunci upload.

## Build lokal (opsional)

Perlu JDK 17, Android SDK 36, dan Gradle 8.11.1:

```bash
cd android
gradle :app:assembleDebug
gradle :app:assembleRelease :app:bundleRelease
```

Tanpa kunci rilis yang sesuai, gunakan debug APK untuk tes saja. Contoh lokal ada di `android/keystore.properties.example`; `android/keystore.properties` diabaikan Git.

## Pemasangan dan laporan masalah

Untuk mencoba di perangkat sendiri, unduh artefak dari GitHub Actions, ekstrak, lalu pasang APK debug. Saat Android meminta izin memasang aplikasi dari sumber tersebut, putuskan sendiri apakah Anda memercayai sumber berkasnya. Jika gagal, kirim tangkapan layar pesan lengkap, nama APK, model perangkat, dan versi Android. Jangan kirim keystore atau kata sandi.
