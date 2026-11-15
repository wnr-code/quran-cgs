# Android (Trusted Web Activity) → Google Play

Folder `android/` adalah proyek Gradle TWA yang memakai pustaka resmi `androidbrowserhelper` (sama dengan keluaran Bubblewrap). `android/twa-manifest.json` disertakan bila Anda lebih suka membuat ulang proyek dengan Bubblewrap.

> **Status (15 Nov 2026):** proyek berhasil di-build di GitHub Actions (workflow *Android build*, run 43659285280): APK debug, APK release, dan AAB release dihasilkan sebagai artefak `quranku-android`. Build itu **tanpa kunci signing** (secrets belum diisi), sehingga APK/AAB release belum bertanda tangan dan belum bisa diunggah ke Play. Belum ada APK yang dipasang atau diuji di perangkat, dan belum ada yang diajukan ke Google Play.

- Package: `id.cgs.quranku` · minSdk 23 · **targetSdk 36** · compileSdk 36 · versi 1.0.0 (versionCode 1)
- Izin: `INTERNET`, `POST_NOTIFICATIONS`. Lokasi tidak diminta di tingkat aplikasi; izin lokasi ditangani Chrome per situs saat pengguna menekan "Gunakan lokasi saya".

## 1. Buat kunci upload (sekali, simpan di luar repository)
```bash
keytool -genkeypair -v -keystore quranku-upload.jks -alias quranku -keyalg RSA -keysize 2048 -validity 10000
```
Cadangkan berkas `.jks` dan sandinya di tempat aman. `.gitignore` sudah menolak `*.jks`, `*.keystore`, dan `keystore.properties`. **Jangan pernah meng-commit kunci.**

## 2. Build
### Cara A — GitHub Actions (tanpa memasang apa pun)
1. Repository → Settings → Secrets and variables → Actions, tambahkan:
   `ANDROID_KEYSTORE_BASE64` (`base64 -w0 quranku-upload.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`quranku`), `ANDROID_KEY_PASSWORD`.
2. Tab **Actions → Android build → Run workflow** (workflow juga berjalan otomatis setiap ada perubahan di `android/`).
3. Unduh artefak `quranku-android`: `app-debug.apk` (uji), `app-release.apk`, `app-release.aab` (Play).

### Cara B — Android Studio / Gradle lokal
1. Buka folder `android/` di Android Studio (JDK 17, Android SDK 36).
2. Salin `keystore.properties.example` → `keystore.properties`, isi.
3. `gradle :app:assembleDebug` (APK uji) dan `gradle :app:bundleRelease` (AAB).

### Cara C — Bubblewrap
```bash
npm i -g @bubblewrap/cli
cd android && bubblewrap update && bubblewrap build
```

## 3. Digital Asset Links (menghilangkan bilah alamat)
1. Ambil sidik jari SHA-256:
   - Kunci upload: `keytool -list -v -keystore quranku-upload.jks -alias quranku`
   - **Kunci Play App Signing** (yang dipakai pengguna Play Store): Play Console → Test and release → Setup → **App signing** → *SHA-256 certificate fingerprint*.
2. Masukkan **keduanya** ke `public/.well-known/assetlinks.json` (array `sha256_cert_fingerprints`), menggantikan teks `GANTI_DENGAN_...`.
3. Commit, tunggu deploy Cloudflare, lalu periksa `https://quran.cgs.my.id/.well-known/assetlinks.json`.
4. Pasang ulang aplikasi. Bila bilah alamat masih muncul: hapus data Chrome, periksa sidik jari, dan uji di
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://quran.cgs.my.id&relation=delegate_permission/common.handle_all_urls`.

## 4. Uji APK
```bash
adb install app-debug.apk
```
Periksa: splash, tanpa bilah alamat (setelah asset links benar), tombol kembali, mode membaca, audio di latar, offline, notifikasi, pintasan ikon.
Catatan: APK debug ditandatangani kunci debug, jadi bilah alamat akan tampil kecuali sidik jari kunci debug ikut dimasukkan sementara.

## 5. Google Play Console
1. Buat aplikasi: nama **QuranKu**, bahasa Indonesia, Aplikasi, Gratis; kategori **Buku & Referensi**.
2. Isi listing dari `store/listing-id.md`; unggah `store/graphics/icon-512.png`, `store/graphics/feature-graphic-1024x500.png`, dan screenshot.
3. App content: kebijakan privasi `https://quran.cgs.my.id/privacy.html`; Data Safety dan rating konten mengikuti `store/data-safety.md`; iklan: tidak ada.
4. **Internal testing** → unggah AAB → tambahkan penguji → uji lewat tautan opt-in.
5. **Closed testing**. Akun developer pribadi yang dibuat setelah 13 Nov 2023 wajib menjalankan closed test dengan minimal 12 penguji selama 14 hari berturut-turut sebelum boleh mengajukan produksi (periksa syarat terbaru di Play Console).
6. **Production** → rilis bertahap.

Setiap rilis baru: naikkan `versionCode` (dan `versionName`) di `android/app/build.gradle`. Perubahan konten web tidak memerlukan rilis Android baru.

## Infaq dan kebijakan pembayaran Play
Tombol infaq membuka Trakteer di peramban dan tidak membuka fitur atau konten apa pun di aplikasi. Kebijakan Pembayaran Google Play mengatur donasi secara ketat, dan penerimaannya bergantung pada peninjauan Google. Bila rilis ditolak karena hal ini, sembunyikan menu Infaq pada versi Android (deteksi `document.referrer` yang diawali `android-app://id.cgs.quranku`) dan pertahankan di versi web.

## Mode layar penuh
TWA dikonfigurasi `standalone` (bilah status tetap tampil, berwarna hijau tua). Mode membaca menyembunyikan navigasi aplikasi dan mencoba Fullscreen API bila diizinkan. Aplikasi tidak mengklaim layar penuh sistem saat UI sistem masih terlihat.
