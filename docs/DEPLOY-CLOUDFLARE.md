# Deploy ke Cloudflare (gratis)

Proyek ini di-deploy sebagai **Cloudflare Worker dengan aset statis**. Semua pengaturan ada di `wrangler.toml`:
perintah `npx wrangler deploy` otomatis menjalankan `npm run build`, mengunggah folder `dist/`, dan memasang
`worker/index.js` yang melayani `/api/*` (proxy cadangan EQuran, webhook Trakteer, papan kebaikan).

## 1. Hubungkan repository
1. Dashboard Cloudflare → **Workers & Pages** → Worker **`quran-cgs`** → **Settings → Builds** → hubungkan ke GitHub `wnr-code/quran-cgs`, branch `main`.
2. Pengaturan build:
   - Build command: **kosongkan** (build dijalankan oleh `wrangler.toml`)
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
3. Setiap push ke `main` akan men-deploy otomatis. Untuk memicu ulang secara manual: tab **Deployments → Retry / Deploy**.

Nama Worker di dashboard harus sama dengan `name` di `wrangler.toml` (`quran-cgs`).

## 2. Domain khusus
Worker → **Settings → Domains & Routes → Add → Custom domain** → `quran.cgs.my.id`. HTTPS aktif otomatis.

## 3. Papan kebaikan
Ikuti [INFAQ.md](INFAQ.md): isi secret infaq dan daftarkan webhook. Tabel D1 dibuat otomatis. Binding D1 `DB` sudah ada di `wrangler.toml`.

## 4. Uji setelah deploy
| Uji | Cara |
|---|---|
| Aplikasi tampil | Buka https://quran.cgs.my.id — harus tampil beranda QuranKu, bukan "Hello world" |
| PWA dapat dipasang | Chrome Android → menu → "Instal aplikasi" |
| Service worker | DevTools → Application → Service Workers: `sw.js` *activated* |
| Offline | Buka beberapa surah, aktifkan mode pesawat, muat ulang |
| Header keamanan | `curl -I https://quran.cgs.my.id/` menampilkan `content-security-policy` |
| Asset links | `curl https://quran.cgs.my.id/.well-known/assetlinks.json` |
| Proxy API | `curl https://quran.cgs.my.id/api/quran/surat` mengembalikan 114 surah |
| Papan kebaikan | `curl https://quran.cgs.my.id/api/donors` mengembalikan JSON |
| Kebijakan privasi | https://quran.cgs.my.id/privacy.html |

## 5. Hubungkan dengan Android
Setelah memiliki sidik jari SHA-256 kunci signing (lihat [ANDROID.md](ANDROID.md)), isi `public/.well-known/assetlinks.json`, push ke `main`, dan tunggu deploy selesai sebelum menguji APK.

## Batas free tier
- Permintaan aset statis: gratis dan tidak dibatasi.
- Worker (`/api/*` saja): 100.000 permintaan/hari.
- D1: 5 GB, 5 juta baris dibaca/hari.

Tidak ada layanan berbayar yang diaktifkan oleh proyek ini.
