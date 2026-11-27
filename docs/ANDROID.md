# Android APK (Capacitor)

QuranKu menggunakan **satu aplikasi web bersama** untuk PWA dan APK Android. APK menjalankan hasil build Vite (`dist/`) di WebView lokal Capacitor; ia tidak memuat situs produksi sebagai UI dan tidak memiliki halaman Compose terpisah. Halaman, navigasi, tema, API, IndexedDB, dan fitur dibagi dengan PWA. Cangkang Android menyediakan tombol kembali, status bar/splash, lokasi atas permintaan, serta jembatan migrasi data lama.

## Fitur dan batasan Android

- UI PWA dibundel ke APK, jadi shell dan berkas yang sudah dibundel tersedia tanpa internet. API jaringan dan konten yang belum tersimpan tetap memerlukan koneksi; bacaan yang tersimpan di IndexedDB/cache bisa dipakai offline.
- Tautan QuranKu memakai URL bersih tanpa tanda #, mis. `https://quran.cgs.my.id/surah/2/255`, dan memakai Android App Links terverifikasi melalui `/.well-known/assetlinks.json`. Filter intent dipisah menjadi tiga `<intent-filter>`: `android:path="/"` untuk beranda, `android:path` satu per rute satu segmen (`/quran`, `/kiblat`, `/infaq`, …), dan `android:pathPrefix` untuk jalur bertingkat (`/surah/`, `/tafsir/`, `/doa/`). Bila digabung dalam satu filter, Android memperlakukannya sebagai perkalian silang.
  **Jangan memakai `pathPattern="/.*/.*"` untuk jalur bertingkat.** `PatternMatcher` Android membuat `.*` hanya cocok dengan **satu karakter**, sehingga `/surah/2/255` tidak pernah cocok dan tautan terlempar ke peramban. `pathPrefix` adalah pilihan yang benar.   Halaman statis seperti `/privacy.html` tidak diklaim siapa pun, jadi tetap terbuka di peramban (kebijakan privasi harus bisa dibaca dari tautan Play Store).
  Di **peramban dalam aplikasi** (WhatsApp, Instagram, Facebook) tautan https tidak diteruskan ke Android, jadi aplikasi tidak pernah terbuka dari ketukan pertama. Untuk itu tersedia `/buka.html?next=/surah/2/255` + `/buka.js`: halaman perantara yang memakai `intent://…;package=id.cgs.quranku;S.browser_fallback_url=<Play Store>;end` sehingga satu ketukan membuka aplikasi, atau Play Store bila belum terpasang. `src/services/app-opener.js` menampilkan bar **Buka di aplikasi QuranKu** di halaman mana pun (termasuk halaman baca yang dituju tautan) saat mendeteksi peramban dalam aplikasi di Android; bar bisa ditutup dan tidak muncul lagi pada sesi itu. Di Android, ajakan **Pasang QuranKu — Gratis di Google Play** (beranda dan halaman Lainnya) langsung membuka Play Store melalui `installTarget()`; dialog pemasangan PWA Chrome sengaja **tidak** dipakai supaya tidak ada dua aplikasi (Play + PWA) dengan data terpisah. Di iOS yang belum punya aplikasi App Store, ajakan itu menampilkan panduan **Tambah ke Layar Utama**, dan di desktop tetap memakai dialog pemasangan PWA. Pengaturan di APK menampilkan versi yang tayang di Play Store (`/api/play/version`, dibaca server dan di-cache 6 jam) beserta tombol **Buka Play Store**.
Keduanya **tidak** boleh muncul di dalam APK: WebView Capacitor memakai penanda `; wv)` yang sama dengan WebView WhatsApp, sehingga
`isNativeShell()` (`src/services/platform.js` — bridge Capacitor atau origin `https://localhost`) dipakai `isInAppBrowser()`,
`attachAppOpener()`, dan `public/buka.js` untuk mematikannya. Di dalam APK, `/buka.html?next=…` langsung dialihkan ke rute tujuan. URL lama berbentuk `/#/surah/2/255` masih dikenali dan dirapikan otomatis ke bentuk bersih. Verifikasi perlu fingerprint SHA-256 sertifikat yang sama dengan APK yang dipasang — yaitu **kunci app signing milik Google** bila Play App Signing aktif, bukan upload key.
- Al-Qur'an, doa, jadwal salat, kiblat, tasbih, bookmark, target, kalender, pencarian, murottal, infaq, dan halaman pengaturan memakai implementasi bersama. Fitur online tetap mengikuti ketersediaan API dan layanan terkait.
- Lokasi bersifat opsional. Aplikasi hanya meminta izin **lokasi perkiraan** (`ACCESS_COARSE_LOCATION`, tanpa `ACCESS_FINE_LOCATION`) setelah pengguna menekan **Gunakan lokasi saya**; pilihan kota dan koordinat manual juga tersedia. Android memproses lokasi di perangkat. Permintaan GPS memakai batas waktu 20 detik dengan cadangan `watchPosition` 20 detik bila GPS masih dingin, lalu memeriksa ulang izin sebelum mencoba sekali lagi; setiap kode error plugin (`OS-PLUG-GLOC-*`) dipetakan ke pesan berbahasa Indonesia berisi langkah lanjutan (izin, layanan lokasi, Play Services, sinyal) yang tampil di kartu lokasi. Manifest menandai perangkat keras lokasi sebagai `required="false"` agar Play Store tidak menyaring perangkat tanpa GPS.
- Android memakai `AlarmManager` dan receiver native untuk menjadwalkan azan, imsak Ramadan, pengingat sebelum salat, tilawah harian, target halaman, dan catatan kalender bertanggal. Jadwal berulang serta alarm kalender dalam jendela bergulir 14 hari dipulihkan setelah reboot/perubahan tanggal, waktu, atau zona waktu; perubahan catatan, pengaturan, dan progres tilawah meminta jadwal dibangun ulang. Notifikasi sistem memerlukan izin notifikasi; alarm tepat memerlukan izin khusus Android 12 ke atas. Jika izin alarm tepat tidak diberikan, Android memakai alarm inexact yang dapat tertunda oleh Doze atau kebijakan OEM; force-stop, pencabutan izin, dan pembatasan baterai perangkat juga dapat menghambat pengiriman. Rekaman azan panjang dapat diputar lewat layanan media foreground dan memerlukan internet. PWA tetap memakai Service Worker/Web Push untuk pemberitahuan salat; pengiriman bergantung pada browser, koneksi, dan layanan push. Pengingat kalender/tilawah PWA hanya berjalan ketika aplikasi/browser aktif.
- Service Worker PWA tidak didaftarkan di Capacitor. Aset web Android diperbarui bersama APK; pembaruan dari halaman Pengaturan hanya berlaku untuk PWA.
- Font Arab Amiri Quran dan Scheherazade New ikut dibundel. Verifikasi bentuk huruf dan pemenggalan baris pada perangkat fisik sebelum rilis.
- Layar pembuka memakai wordmark `public/brand/quranku-logo.png` (768×512, latar transparan) di splash web (`#splash` pada `index.html`) dan splash Android (`@drawable/splash_brand` sebagai `windowSplashScreenAnimatedIcon`). Ikon launcher, ikon notifikasi, ikon PWA, dan materi Play Store tetap diturunkan dari `assets/logo-source.png`; `npm run gen:icons` memisahkan keduanya (`SPLASH_LOGO` vs `LOGO`). Mengganti wordmark splash tidak perlu menaikkan akhiran `-v2` pada ikon.

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

Workflow **Android build** (`.github/workflows/android.yml`) berjalan untuk perubahan Android/aplikasi pada push atau pull request, dan bisa dijalankan manual dari **Actions → Android build → Run workflow**. Ia memasang JDK 21 dan SDK 36, membuat ikon/splash, membangun UI bersama, menjalankan unit test Gradle, menguji APK di emulator Android 12 (API 31) dan Android 16 (API 36), lalu (bila signing diaktifkan) membangun dan memverifikasi APK/AAB release. Workflow web utama (`ci.yml`) menjalankan `npm test` dan `npm run build`.

- `QuranKu-APK-untuk-dipasang`: selalu memuat APK debug untuk uji; bila seluruh secret upload key terisi dan valid, artefak yang sama juga memuat APK release bertanda tangan.
- `quranku-play-store-aab-signed`: AAB release **bertanda tangan** dengan upload key, nama berkas `QuranKu-<versi>-<versionCode>.aab` (mis. `QuranKu-1.4.39-2250.aab`), hanya dibuat bila seluruh secret tersedia dan tanda tangannya lolos verifikasi. Dapat diunggah ke Play Console saat Play App Signing aktif; workflow hanya menyimpan artefak GitHub dan tidak menerbitkan ke Play.
- Bila tidak ada upload-key secret yang dikonfigurasi, workflow hanya menghasilkan APK debug. **AAB unsigned tidak dibuat.** Bila konfigurasi hanya sebagian atau tidak valid, workflow gagal alih-alih mengunggah release yang tidak bertanda tangan.
- Uji instrumentasi membuka Activity dan memastikan beranda bersama serta salam awal dirender. Ini bukan uji semua fitur dan bukan pengganti uji ponsel fisik, pemeriksaan aksesibilitas, atau Play Console Pre-launch report.

### Memasang APK uji di ponsel

Artefak `QuranKu-APK-untuk-dipasang` memuat dua APK yang tidak bisa saling menggantikan. `QuranKu-<versi>.apk` ditandatangani upload key dan bisa dipasang menimpa aplikasi dari Play **hanya bila** sidik jari SHA-256 sertifikatnya sama dengan *App signing key certificate* di Play Console (Test and release → Setup → App signing). `QuranKu-<versi>-uji.apk` ditandatangani kunci debug dan **selalu** ditolak bila aplikasi bernama paket sama sudah terpasang — pesan Android: "Aplikasi tidak diinstal karena paket ini bentrok dengan paket yang sudah ada" (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). Itu perilaku normal sistem, bukan bug. Bila APK release juga ditolak, sertifikat aplikasi terpasang berbeda dari upload key — biasanya karena Play App Signing aktif dan Google memegang app-signing key. Pada kondisi itu gunakan *Internal testing* agar Play yang memperbarui aplikasi tanpa kehilangan data, atau cadangkan data lalu copot aplikasi sebelum memasang APK manual. Untuk memeriksa sertifikat yang diunduh dari Play Console (Test and release → Setup → App signing → **Download sertifikat** pada *Kunci klasik*), jalankan `npm run cert:fp -- <berkas.der|berkas.pem>`; skrip ini mencetak sidik jari SHA-256 dalam format yang sama dengan Play Console dan langsung menyebut cocok atau beda dengan `assetlinks.json`. Halaman Play Console hanya menampilkan app signing key, jadi sertifikat yang diunduh dari sana adalah app-signing key — bukan upload key. Jangan aktifkan **Upgrade kunci penandatanganan aplikasi** atau kunci post-quantum untuk rilis biasa: mengganti app signing key mengharuskan pengguna memasang ulang aplikasi.

Ringkasan workflow (Actions → run → Summary) mencetak tabel dua sidik jari: **upload key** (yang menandatangani APK/AAB) dan nilai di `public/.well-known/assetlinks.json`. Bandingkan yang pertama dengan *Upload key certificate* dan yang kedua dengan *App signing key certificate* di Play Console → Test and release → Setup → App signing. Workflow memberi peringatan anotasi bila keduanya berbeda; itu normal saat Play App Signing aktif, tetapi berarti APK manual hanya bisa dipasang setelah aplikasi dicopot.

**Hasil terbaru untuk kode aplikasi:** [Android build run 89](https://github.com/wnr-code/quran-cgs/actions/runs/44012564187) pada commit `092afa714a1ea65b9b4255611c61060bb35d7b6e` berhasil menjalankan tes Gradle, smoke test emulator API 31 dan 36, serta build/verifikasi tanda tangan APK dan AAB release. Run tersebut mengunggah kedua artefak di atas ke GitHub Actions; artefak hanya tersedia dari halaman run dan tidak disertakan di repository. Validasi jarak jauh ini terpisah dari validasi lokal; mesin lokal tanpa JDK/Android SDK tidak menjalankan Gradle.

Package `id.cgs.quranku`, `minSdk 24`, `compileSdk 36`, dan `targetSdk 36`. Nama versi mengikuti `package.json`. CI mengambil `versionCode` dari nomor run workflow; build lokal memakai 320 sebagai nilai awal, di atas kode CI Compose lama 310. Untuk rilis Play, pastikan versi kode lebih besar dari versi yang pernah diunggah.

## Penandatanganan release

### Google Play App Signing (disarankan)

Play App Signing perlu diaktifkan di Play Console—pengaturan ini tidak dapat dinyalakan oleh Gradle atau repositori. Untuk aplikasi baru, pilih agar Google membuat dan menyimpan **app-signing key**. Google memakai kunci itu untuk menandatangani APK yang diterima pengguna. Namun AAB yang diunggah tetap harus ditandatangani dengan **upload key**. Keystore pada bagian ini adalah upload key untuk Play, bukan app-signing key milik Google.

Buat/upload key sekali untuk aplikasi baru dan daftarkan sertifikatnya saat mengikuti proses Play Console. Jika aplikasi sudah pernah diunggah, jangan membuat kunci baru sembarangan: gunakan upload key yang terdaftar atau minta reset upload key di Play Console. Jika upload key hilang, upload key dapat direset; app-signing key yang dikelola Google tetap digunakan untuk pembaruan aplikasi.

Jangan commit keystore atau password. Contoh konfigurasi ada di `android/keystore.properties.example`; salin menjadi `android/keystore.properties` (diabaikan Git) dan isi nilai milik pemilik aplikasi. `storeFile` yang relatif dihitung dari direktori `android/`. Alternatifnya, berikan variabel lingkungan berikut saat menjalankan Gradle:

- `QURANKU_KEYSTORE_FILE`
- `QURANKU_KEYSTORE_PASSWORD`
- `QURANKU_KEY_ALIAS`
- `QURANKU_KEY_PASSWORD`

Agar tidak perlu memilih JKS secara manual setiap rilis, simpan upload keystore yang sudah terdaftar dan nilainya sebagai GitHub Actions Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Workflow memakai key tersebut untuk menandatangani APK/AAB release dan mengunggah AAB bertanda tangan sebagai artefak `quranku-play-store-aab-signed`. Tanpa seluruh secret, build release dilewati dan hanya APK debug yang tersedia (tidak ada AAB unsigned). Simpan juga salinan terenkripsi keystore secara aman; jangan bagikan password atau isi keystore di chat/repository.

## API dan CORS Android

Di Capacitor, origin aplikasi adalah `https://localhost`. Pemanggilan same-app `/api/*` diarahkan dari WebView ke origin resmi QuranKu, sedangkan aset `/data/*` dan resource lokal tetap dibaca dari bundle. Worker hanya menambahkan header CORS untuk origin yang terdaftar secara eksplisit, termasuk `https://localhost`; bukan wildcard. PWA dan origin resmi tetap menggunakan jalur yang sama seperti sebelumnya. Perubahan URL API Android harus mempertahankan allowlist sempit ini.

## Izin dan privasi

Manifest Android meminta `INTERNET`, `ACCESS_COARSE_LOCATION`, izin notifikasi/alarm yang diperlukan, serta `WRITE_EXTERNAL_STORAGE` yang dibatasi `android:maxSdkVersion="28"` untuk menyimpan gambar di Android 9 ke bawah. Lokasi hanya diminta atas tindakan pengguna; APK tidak menggunakan lokasi latar atau Web Push. Tombol unduh gambar pada APK menyimpan berkas ke `Pictures/QuranKu` lewat MediaStore (tanpa izin pada Android 10 ke atas) dan baru menampilkan pesan berhasil setelah penyimpanan selesai; PWA tetap memakai unduhan peramban. Semua alarm native (salat/imsak, tilawah/target, dan catatan kalender) dihitung atau disimpan di perangkat dalam jendela bergulir 14 hari. Pengirimannya bergantung pada izin notifikasi/alarm, Doze, force-stop, dan kebijakan perangkat. Preferensi, posisi baca, bookmark, catatan, dan cache lokal tetap berada di perangkat. Jika pengguna mengirim infaq, data transaksi yang diperlukan dikirim ke layanan QuranKu/Trakteer seperti dijelaskan di [kebijakan privasi](../public/privacy.html) dan [panduan Data Safety](../store/data-safety.md).
