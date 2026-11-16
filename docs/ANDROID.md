# Android APK (Capacitor)

QuranKu menggunakan **satu aplikasi web bersama** untuk PWA dan APK Android. APK menjalankan hasil build Vite (`dist/`) di WebView lokal Capacitor; ia tidak memuat situs produksi sebagai UI dan tidak memiliki halaman Compose terpisah. Halaman, navigasi, tema, API, IndexedDB, dan fitur dibagi dengan PWA. Cangkang Android menyediakan tombol kembali, status bar/splash, lokasi atas permintaan, serta jembatan migrasi data lama.

## Fitur dan batasan Android

- UI PWA dibundel ke APK, jadi shell dan berkas yang sudah dibundel tersedia tanpa internet. API jaringan dan konten yang belum tersimpan tetap memerlukan koneksi; bacaan yang tersimpan di IndexedDB/cache bisa dipakai offline.
- Al-Qur'an, doa, jadwal salat, kiblat, tasbih, bookmark, target, kalender, pencarian, murottal, infaq, dan halaman pengaturan memakai implementasi bersama. Fitur online tetap mengikuti ketersediaan API dan layanan terkait.
- Lokasi bersifat opsional. Aplikasi hanya meminta izin **lokasi perkiraan** setelah pengguna menekan **Gunakan lokasi saya**; pilihan kota dan koordinat manual juga tersedia. Android memproses lokasi di perangkat.
- Pengingat yang jatuh tempo saat APK terbuka tampil sebagai pesan di dalam aplikasi; suara adzan dapat diputar selama aplikasi berjalan. APK tidak mendaftarkan Web Push, alarm latar, atau notifikasi sistem. Pengingat/adzan tidak dijamin muncul setelah aplikasi ditutup. Web Push di PWA/peramban tetap mengikuti perilaku web.
- Service Worker PWA tidak didaftarkan di Capacitor. Aset web Android diperbarui bersama APK; pembaruan dari halaman Pengaturan hanya berlaku untuk PWA.
- Font Arab Amiri Quran dan Scheherazade New ikut dibundel. Verifikasi bentuk huruf dan pemenggalan baris pada perangkat fisik sebelum rilis.

## Migrasi data dari APK Compose lama

Package Android tetap `id.cgs.quranku`, sehingga Android dapat mempertahankan data privat lama ketika APK baru dipasang sebagai **pembaruan** dengan tanda tangan yang sama. Pada peluncuran pertama, jembatan native membaca preferensi `quranku_native` dan file `files/quran/surah-*.json` dari APK lama. Data yang dapat dipindahkan:

- posisi baca terakhir (`last_surah`, `last_ayah`);
- kota, bila namanya cocok dengan daftar kota QuranKu sekarang;
- hitungan dan target tasbih;
- cache surah yang lolos pemetaan format dan validasi ayat bersama.

Preferensi kecil dipulihkan setelah router mulai; cache surah diimpor di latar belakang. Cache lama tidak dihapus setelah berhasil dipindahkan. **Jangan menghapus instalasi APK lama sebelum mencoba memperbarui aplikasi**: uninstall menghapus preferensi dan cache privat itu. Android juga menolak pembaruan bila sertifikat penandatangan berbeda. Jika demikian dan data lokal penting, jangan uninstall dulu; gunakan build yang ditandatangani dengan kunci lama atau cadangan Android. Menu **Pengaturan → Hapus semua data saya** menghapus data bersama serta sisa preferensi/cache Compose lama.

## Persyaratan build

- Node.js 22 dan npm.
- JDK 21 (Capacitor 8 / plugin geolocation menggunakan Java 21).
- Android SDK Platform 36 dan Build Tools 36.0.0.
- Gradle Wrapper 8.14.3 dan Android Gradle Plugin 8.13.0 sudah tercatat di proyek.

### Build dan jalankan secara lokal

Dari root repository:

```bash
npm ci
npm run gen:icons       # diperlukan setelah sumber ikon/splash diubah
npm run cap:sync        # build web ke dist/ lalu salin ke android/app/src/main/assets/public
npm run cap:open        # buka proyek di Android Studio (opsional)
```

Atau build APK debug langsung melalui Gradle Wrapper:

```bash
cd android
./gradlew :app:assembleDebug
# Dengan perangkat/emulator aktif:
./gradlew :app:installDebug
```

Hasil APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`. Jangan menjalankan `cap sync` tanpa build web terbaru; `npm run cap:sync` sudah melakukan keduanya secara berurutan.

Untuk memeriksa web/PWA secara terpisah, jalankan `npm test` dan `npm run build` dari root. Pengembangan PWA tetap melalui `npm run dev`; proses Android tidak mengubah perilaku browser.

## Android CI dan artefak

Workflow **Android build** (`.github/workflows/android.yml`) berjalan untuk perubahan Android/aplikasi pada push atau pull request, dan bisa dijalankan manual dari **Actions → Android build → Run workflow**. Ia memasang JDK 21 dan SDK 36, membuat ikon/splash, membangun UI bersama, menjalankan unit test Gradle, menguji APK di emulator Android 12 (API 31) dan Android 16 (API 36), lalu membangun APK/AAB release. Workflow web utama (`ci.yml`) menjalankan `npm test` dan `npm run build`.

- `QuranKu-APK-untuk-dipasang`: APK debug untuk uji; bila signing secret tersedia, juga menyertakan APK release bertanda tangan.
- `quranku-play-store-aab`: dibuat hanya jika seluruh secret signing tersedia; AAB untuk Play Console.
- `quranku-aab-unsigned-build`: AAB tanpa tanda tangan untuk validasi build saja—**tidak dapat diunggah ke Play Console**.
- Uji instrumentasi membuka Activity dan memastikan beranda bersama serta salam awal dirender. Ini bukan uji semua fitur dan bukan pengganti uji ponsel fisik, pemeriksaan aksesibilitas, atau Play Console Pre-launch report.

Package `id.cgs.quranku`, `minSdk 24`, `compileSdk 36`, dan `targetSdk 36`. Nama versi mengikuti `package.json`. CI mengambil `versionCode` dari nomor run workflow; build lokal memakai 320 sebagai nilai awal, di atas kode CI Compose lama 310. Untuk rilis Play, pastikan versi kode lebih besar dari versi yang pernah diunggah.

## Penandatanganan release

Jangan commit keystore atau password. Contoh konfigurasi ada di `android/keystore.properties.example`; salin menjadi `android/keystore.properties` (diabaikan Git) dan isi nilai milik pemilik aplikasi. `storeFile` yang relatif dihitung dari direktori `android/`. Alternatifnya, berikan variabel lingkungan berikut saat menjalankan Gradle:

- `QURANKU_KEYSTORE_FILE`
- `QURANKU_KEYSTORE_PASSWORD`
- `QURANKU_KEY_ALIAS`
- `QURANKU_KEY_PASSWORD`

Untuk CI GitHub Actions, simpan empat secret berikut pada repository: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Workflow memakai keystore yang sama untuk APK dan AAB release. Tanpa keempat nilai, hasil release tidak ditandatangani. Simpan salinan kunci secara aman; kehilangan kunci dapat mencegah pembaruan APK yang didistribusikan langsung. Untuk Google Play, ikuti konfigurasi Play App Signing dan kunci upload di Play Console.

## API dan CORS Android

Di Capacitor, origin aplikasi adalah `https://localhost`. Pemanggilan same-app `/api/*` diarahkan dari WebView ke origin resmi QuranKu, sedangkan aset `/data/*` dan resource lokal tetap dibaca dari bundle. Worker hanya menambahkan header CORS untuk origin yang terdaftar secara eksplisit, termasuk `https://localhost`; bukan wildcard. PWA dan origin resmi tetap menggunakan jalur yang sama seperti sebelumnya. Perubahan URL API Android harus mempertahankan allowlist sempit ini.

## Izin dan privasi

Manifest Android meminta `INTERNET` dan `ACCESS_COARSE_LOCATION`. Lokasi hanya diminta atas tindakan pengguna; APK tidak meminta `POST_NOTIFICATIONS`, tidak menggunakan lokasi latar, dan tidak mendaftarkan push. Preferensi, posisi baca, bookmark, dan cache lokal tetap berada di perangkat. Jika pengguna mengirim infaq, data transaksi yang diperlukan dikirim ke layanan QuranKu/Trakteer seperti dijelaskan di [kebijakan privasi](../public/privacy.html) dan [panduan Data Safety](../store/data-safety.md).
