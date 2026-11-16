# Android native (Jetpack Compose)

Sejak versi **1.4.0**, APK bukan lagi Trusted Web Activity (TWA) atau halaman situs di dalam WebView. Beranda, navigasi, daftar surah, pembaca, doa, jadwal, kiblat, tasbih, Asmaul Husna, dan halaman informasi dibuat dengan komponen Android native. Aplikasi tidak memuat `quran.cgs.my.id` sebagai antarmuka. Revisi 1.4.1 menambahkan splash screen Android resmi dan penanganan aman data awal. Uji emulator mereproduksi penyebab aplikasi menutup saat dibuka: Compose tidak dapat merender resource ikon peluncur adaptive XML; pemakaian diganti ke ikon vektor. Uji startup/data offline kini lulus pada Android 16.

## Isi dan batasan versi native

- **Al-Qur'an:** metadata 114 surah tersedia offline dan langsung mengisi daftar sebelum penyegaran data daring selesai. Teks Arab, transliterasi, dan terjemahan Kementerian Agama RI diambil dari EQuran.id ketika surah dibuka pertama kali, divalidasi jumlah/urutan ayatnya, lalu disimpan di perangkat. Bacaan yang sudah tersimpan dapat dibuka offline; surah yang belum pernah dimuat memerlukan internet.
- **Doa:** data Doa Harian, Wudhu, dan Usai Salat dari `src/data/` disalin ke APK setiap build. Bacaan tetap tersedia offline; halaman bacaan punya kontrol Latin/arti dan Bagikan.
- **Jadwal salat:** dihitung di perangkat dari kota yang dipilih pengguna (tidak meminta GPS), memakai zona waktunya (WIB/WITA/WIT atau UTC+3 untuk Makkah/Madinah). Koordinat kota merupakan perkiraan pusat kota. Perhitungan astronomis Kemenag 20°/18°, Asar Syafi'i, ihtiyat dua menit; waktu dapat berbeda beberapa menit dari jadwal resmi. Cocokkan dengan jadwal Kemenag/otoritas setempat.
- **Kiblat:** menampilkan bearing dari koordinat kota; bukan kompas sensor dan tidak menunjukkan arah relatif ke posisi ponsel.
- **Tampilan mushaf:** teks Arab ditata dalam kartu ayat memakai font Arab sistem; belum ada font mushaf Madinah khusus, tata letak per halaman/baris, atau pewarnaan tajwid. Bentuk huruf dan pemenggalan baris masih perlu diperiksa di berbagai perangkat fisik.
- Ada Tasbih Digital dan Asmaul Husna, serta dukungan mode terang/gelap sesuai sistem.
- **Belum dipindahkan dari PWA/web:** murottal/audio, tafsir, bookmark, kalender dan catatan, target tilawah, notifikasi/adzan, infaq, ekspor-impor, serta fitur offline PWA. Fitur tersebut tetap tersedia di situs/PWA.
- Izin Android aplikasi: `INTERNET`. Tidak meminta akun, izin lokasi, atau notifikasi.
- Uji instrumentasi CI membuka beranda dan doa offline pada emulator Android 16 (API 36). Ini membantu menangkap crash saat startup, tetapi **bukan pengganti pengujian di HP fisik**; periksa ukuran layar, aksesibilitas, perilaku OEM, dan Play Console Pre-launch report sebelum rilis publik.

## Build tanpa Android Studio

Workflow GitHub **Android build** berjalan otomatis saat berkas `android/` berubah. Bisa juga dijalankan manual dari **Actions → Android build → Run workflow**. Android Studio tidak diperlukan untuk mengambil hasil build. Sebelum membuat artefak, workflow membangun dan menguji aplikasi di emulator Pixel virtual Android 16 (API 36); kegagalan startup melampirkan logcat untuk diagnosis.

1. Buka run workflow yang selesai dengan status **success**.
2. Di bagian **Artifacts**, unduh `QuranKu-APK-untuk-dipasang` dan ekstrak zip.
3. Tanpa secret kunci rilis, nama APK berakhiran `-uji.apk`: itu APK debug, bertanda tangan kunci debug sementara. Versi rilis bertanda tangan, bila secret sudah disiapkan, berakhiran `.apk` tanpa `-uji`.
4. `quranku-play-store-aab` dibuat hanya bila keystore dan seluruh password/alias signing tersedia; berkas itu untuk Play Console, bukan untuk instalasi langsung. Tanpa kunci, workflow memberi label `quranku-aab-unsigned-build` untuk verifikasi proses build saja—AAB tanpa tanda tangan **tidak bisa diunggah ke Play Console**.

APK menggunakan package `id.cgs.quranku`, minSdk 23, compileSdk 36, targetSdk 36. Nama versinya mengikuti `package.json`; `versionCode` CI dinaikkan berdasarkan nomor build.

### Splash screen native

Aplikasi memakai Jetpack `core-splashscreen` dan theme XML `Theme.QuranKu.Splash`, bukan layar splash Compose yang ditumpuk di atas splash sistem. Ikon buku vektor QuranKu tampil di latar hijau (atau hijau gelap pada mode malam), lalu transisi ke theme Compose setelah aset offline awal selesai dibaca. Pemanggilan `installSplashScreen()` berada sebelum `super.onCreate()` sesuai [panduan resmi Android](https://developer.android.com/develop/ui/views/launch/splash-screen). Splash tidak menunggu permintaan jaringan.

### Target API dan pemeriksaan Play Store

Sejak **31 Agustus 2026**, Google Play mensyaratkan aplikasi baru dan pembaruan aplikasi ponsel/tablet menargetkan Android 16 (API 36) atau lebih tinggi. Proyek ini sekarang memakai `targetSdk 36`; lihat [ketentuan resmi target API](https://developer.android.com/google/play/requirements/target-sdk) dan [perubahan perilaku Android 16](https://developer.android.com/about/versions/16/behavior-changes-16). Edge-to-edge sudah diaktifkan dan layar memakai padding system bar; tetap tinjau kembali perilaku predictive back serta tampilan layar lebar.

Uji emulator CI hanya memverifikasi proses build, pembukaan UI, dan aset offline dasar. Uji itu **tidak menjamin lolos peninjauan Google Play**. Sebelum produksi, tanda tangani AAB dengan kunci upload yang benar, lengkapi deklarasi/metadata Play Console, lalu periksa Pre-launch report dan lakukan uji internal pada perangkat fisik.

### Play Protect dan pemasangan dari luar Play Store

Play Protect dapat memperingatkan atau memblokir APK yang diunduh dari luar Google Play, terutama APK debug/berkunci pengembang yang belum dikenal. Peringatan itu **tidak membuktikan** APK aman maupun berbahaya; build CI hanya memeriksa format paket, tanda tangan, dan smoke test emulator, bukan melakukan sertifikasi Google. Jangan mematikan Play Protect untuk mengatasi peringatan. Untuk distribusi umum, gunakan APK/AAB rilis dengan kunci tetap dan jalur distribusi resmi (misalnya Google Play); tetap ikuti hasil pemeriksaan Google.

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

Perlu JDK 17, Android SDK/Build Tools 36, Android Gradle Plugin 8.13.2, dan Gradle 8.13:

```bash
cd android
gradle :app:assembleDebug
gradle :app:assembleRelease :app:bundleRelease
```

Tanpa kunci rilis yang sesuai, gunakan debug APK untuk tes saja. Contoh lokal ada di `android/keystore.properties.example`; `android/keystore.properties` diabaikan Git.

## Pemasangan dan laporan masalah

Untuk mencoba di perangkat sendiri, unduh artefak dari GitHub Actions, ekstrak, lalu pasang APK debug. Saat Android meminta izin memasang aplikasi dari sumber tersebut, putuskan sendiri apakah Anda memercayai sumber berkasnya. Jika gagal, kirim tangkapan layar pesan lengkap, nama APK, model perangkat, dan versi Android. Jangan kirim keystore atau kata sandi.
