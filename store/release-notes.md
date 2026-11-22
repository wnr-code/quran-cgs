# Catatan rilis Play Store — QuranKu

Teks untuk **Play Console → Test and release → Rilis → "Apa yang baru"** (What's new).
Batas resmi: **500 karakter per bahasa**. Satu catatan per rilis; rilis berikutnya menimpa yang lama,
jadi catatan ini hanya perlu memuat perubahan sejak versi yang sedang dipakai pengguna.

## 1.4.44 — 22 November 2026 (untuk rilis yang akan datang)

```
Tautan quran.cgs.my.id dari WhatsApp kini terbuka langsung di aplikasi, tepat pada surah, ayat, atau jadwal salat yang dituju. Alamat halaman juga lebih bersih tanpa tanda #.
?adzan= pada tautan benar-benar memutar adzan, dan posisi bacaan terakhir dilanjutkan.
Pintasan ikon aplikasi membuka halaman yang benar.
Perbaikan: Kelola Offline normal, tidak ada halaman kosong pada tautan rusak, notifikasi membuka halaman yang tepat.
```

**429/500 karakter.** Aman bila Play menghitung spasi/baris baru (sebagian penghitung melakukannya).

Perubahan di 1.4.44 hanya dokumen (deskripsi listing & catatan rilis) serta skrip screenshot —
tidak ada perubahan yang terlihat pengguna, jadi isi catatan rilis tidak berubah dari draf 1.4.43.

### Mengapa kalimatnya begitu

Pengguna yang memasang dari Play **masih di 1.4.38** (AAB run #202, commit `4863179`). Yang menekan
"Perbarui" akan melompati 1.4.39–1.4.43 sekaligus, jadi semua perubahan sejak 1.4.38 harus tercakup —
bukan hanya yang terakhir. Urutannya sengaja: keluhan paling nyata (tautan WhatsApp) di baris pertama,
lalu perbaikan, karena hanya ~2 baris pertama yang tampil sebelum pengguna menekan "Selengkapnya".

| Yang ditulis | Yang berubah | Bukti |
|---|---|---|
| Tautan WhatsApp terbuka di halaman yang dituju | Filter App Links: `android:path` per rute + `pathPrefix` untuk `/surah/`, `/tafsir/`, `/doa/`; `pathPattern` dibuang | `android/app/src/main/AndroidManifest.xml`; PR #66 |
| Alamat tanpa `#` | Router History API + Worker redirect jalur lama (`/surat`, `/jadwal`, `/doa`) | `src/router.js`, `worker/index.js`; commit `73fa3c4` |
| `?adzan=` memutar adzan | Query dipertahankan `appLinkRoute`; dibaca juga pada `qk:route`, bukan hanya saat start | `src/services/app-links.js`, `src/services/adzan.js`; commit `4486801` |
| Posisi bacaan dilanjutkan | `?resume=` tidak lagi terbuang bersama query | sama |
| Pintasan ikon aplikasi | `manifest.webmanifest` memakai `/lanjut`, `/quran`, `/murottal`, `/salat` | `public/manifest.webmanifest` |
| Kelola Offline normal | `offline.html` → `offline-fallback.html` (aset statis dilayani sebelum Worker) | PR #70 |
| Tidak ada halaman kosong | `decodeParam()` menangkap `decodeURIComponent` yang melempar | `src/router.js` |
| Notifikasi membuka halaman tepat | `sw.js` memakai URL bersih + `?adzan=<waktu>` | `sw.js` |

### Yang sengaja TIDAK ditulis

- **Poster ayat & 22 tema** — sudah ada di 1.4.38, bukan barang baru bagi pengguna.
- **"Performa lebih cepat", "perbaikan bug umum"** — tidak terukur dan tidak membantu keputusan memperbarui.
- **Angka versi** ("versi 1.4.43") — Play sudah menampilkannya sendiri di baris atas.
- **Ajakan memberi rating/ulasan** — dilarang di What's new.

## 1.4.38 — 17 November 2026 (sudah ditayangkan)

```
Papan Kebaikan kini anonim: nama dan nominal tidak ditampilkan. Yang dibagikan hanya doa & ucapan, tanpa nama.
Doa muncul dengan animasi halus; doa terbaru disorot singkat. Animasi otomatis nonaktif bila "kurangi gerakan" diaktifkan.
Akad infaq diperjelas: penerima, penggunaan dana, dan hak Anda. Akad cukup dibaca sekali dan bisa dibatalkan kapan saja.
Perbaikan: doa yang dikirim lewat formulir kini selalu tersimpan.
```

Dipertahankan sebagai arsip. Bila rilis 1.4.43 baru diunggah sekarang, catatan 1.4.38 tidak akan
pernah dilihat pengguna — Play hanya menampilkan What's new milik build yang sedang diunduh.

## Cara memakai

1. Play Console → **Test and release** → pilih jalur (Internal/Closed/Production) → **Create new release**.
2. Unggah AAB dari GitHub Actions (run Android terbaru, berkas `QuranKu-<versi>-<run>0.aab`).
3. Pada kolom **Apa yang baru**, tempel blok kode di atas — tanpa tanda kutip pembungkus.
4. Nama rilis boleh diisi bebas, mis. `1.4.43 — tautan & offline`.
5. **Review release** → pastikan tidak ada error → **Start rollout**.

> Catatan: What's new bisa diubah **sebelum** rilis diterbitkan. Setelah rilis tayang, teks tidak
> bisa diubah lagi untuk build itu — perbaikannya hanya lewat rilis berikutnya.

## Batas & aturan Play yang mudah terlanggar

| Aturan | Batas | Status berkas ini |
|---|---|---|
| Panjang What's new | 500 karakter/bahasa | 429 ✓ |
| Jumlah baris | 5 baris disarankan | 5 ✓ |
| Dilarang | promosi & ajakan bertindak dari Google: minta rating/ulasan, "unduh sekarang", "perbarui sekarang", janji hadiah | tidak ada ✓ |
| Boleh | menyebut aplikasi lain sebagai konteks ("tautan dari WhatsApp" membantu pengguna mengenali masalah yang diperbaiki) | disebut 1× ✓ |
| Dilarang | klaim fitur yang belum ada di build itu | semua ada di build ≥ run #238 ✓ |
| Wajib | per bahasa yang dipakai listing | listing hanya bahasa Indonesia |
