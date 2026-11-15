# Deploy ke Cloudflare Pages (gratis)

## 1. Repository GitHub
Kode berada di `wnr-code/quran-cgs`. Gabungkan branch kerja ke `main` (lewat pull request).

## 2. Hubungkan ke Cloudflare Pages
1. Dashboard Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pilih repository `wnr-code/quran-cgs`, branch produksi `main`.
3. Build settings:
   - Framework preset: **None** (atau Vite)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variables (Production dan Preview):
   - `NODE_VERSION` = `22`
   - `VITE_TRAKTEER_USERNAME` = username Trakteer Anda
5. **Save and Deploy**. Folder `functions/` otomatis menjadi Pages Functions.

## 3. Domain khusus
1. Proyek Pages → **Custom domains** → **Set up a custom domain** → `quran.cgs.my.id`.
2. Bila `cgs.my.id` dikelola di Cloudflare, catatan CNAME dibuat otomatis. Bila tidak, tambahkan CNAME `quran` → `<nama-proyek>.pages.dev` di penyedia DNS.
3. HTTPS aktif otomatis setelah sertifikat terbit (biasanya beberapa menit).

## 4. Papan donatur (opsional)
Ikuti [INFAQ.md](INFAQ.md). Tanpa langkah itu aplikasi tetap berjalan; halaman Infaq menampilkan keterangan "belum aktif".

## 5. Uji setelah deploy
| Uji | Cara |
|---|---|
| PWA dapat dipasang | Chrome Android → menu → "Instal aplikasi"; atau DevTools → Application → Manifest (tanpa error) |
| Service worker | DevTools → Application → Service Workers: `sw.js` berstatus *activated* |
| Offline | Buka beberapa surah, aktifkan mode pesawat, muat ulang: beranda, daftar surah, dan surah yang pernah dibuka harus tampil |
| Header keamanan | `curl -I https://quran.cgs.my.id/` menampilkan `content-security-policy` |
| Asset links | `curl https://quran.cgs.my.id/.well-known/assetlinks.json` mengembalikan JSON dengan `content-type: application/json` |
| Proxy API | `curl https://quran.cgs.my.id/api/quran/surat` mengembalikan daftar 114 surah |
| Kebijakan privasi | https://quran.cgs.my.id/privacy.html |

## 6. Hubungkan dengan Android
Setelah memiliki sidik jari SHA-256 kunci signing (lihat [ANDROID.md](ANDROID.md)), isi `public/.well-known/assetlinks.json`, commit, dan tunggu deploy selesai **sebelum** menguji APK. Tanpa itu aplikasi Android tetap terbuka tetapi menampilkan bilah alamat peramban.

## Batas free tier yang relevan
- Pages: 500 build/bulan, permintaan aset statis tidak dibatasi.
- Pages Functions: 100.000 permintaan/hari (dipakai hanya oleh proxy cadangan dan papan donatur; papan donatur di-cache 60 detik).
- D1: 5 GB, 5 juta baris dibaca/hari.

Tidak ada layanan berbayar yang diaktifkan oleh proyek ini.
