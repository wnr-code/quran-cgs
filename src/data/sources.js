// Daftar seluruh sumber data, pustaka, dan aset yang dipakai QuranKu (ditampilkan di halaman Tentang).
export const SOURCES = [
  {
    group: "Al-Qur'an",
    icon: 'book',
    items: [
      {
        name: 'EQuran.id API v2',
        role: 'Sumber utama',
        use: 'Teks Arab, transliterasi, terjemahan Indonesia, tafsir, deskripsi surah, dan audio murottal 6 qari.',
        note: 'Terjemahan dan tafsir Kementerian Agama RI sebagaimana disajikan EQuran.id.',
        url: 'https://equran.id/apidev/v2',
        host: 'equran.id'
      },
      {
        name: 'mp3quran.net',
        role: 'Murottal tambahan',
        use: 'Audio surah penuh untuk qari tambahan di halaman Murottal (riwayat Hafs). Diputar langsung dari server mp3quran.net.',
        note: 'Daftar qari disusun dari qori-alquran-json (wnr-code), yang bersumber dari surahquran.com. Hanya qari dengan 114 surah lengkap dan alamat yang lolos pemeriksaan yang dipakai.',
        url: 'https://github.com/wnr-code/qori-alquran-json',
        host: 'github.com/wnr-code/qori-alquran-json'
      },
      {
        name: 'Al Quran Cloud API',
        role: 'Cadangan',
        use: 'Dipakai bila sumber utama gagal: teks quran-uthmani (Tanzil), terjemahan id.indonesian, transliterasi en.transliteration, tafsir id.jalalayn, audio Mishary Alafasy.',
        note: 'Ditandai di halaman baca sebagai edisi berbeda; tidak dicampur dengan sumber utama. Audio cadangan diputar dari cdn.islamic.network.',
        url: 'https://alquran.cloud/api',
        host: 'alquran.cloud'
      },
      {
        name: 'quran-json (Risan Bagja Pradana)',
        role: 'Cadangan terakhir',
        use: 'Salinan teks Arab rasm Utsmani (dari Ensiklopedia Al-Qur\'an, QuranEnc) di server QuranKu sendiri, dipakai bila kedua API gagal.',
        note: 'Hanya teks Arab yang dibundel. LICENSE.txt repositori menyebut CC BY-SA 4.0, sedangkan metadata paket npm menyebut CC BY 4.0; QuranKu memakai label CC BY-SA 4.0 yang lebih ketat. Terjemahan dan transliterasi paket tidak disertakan.',
        license: 'CC BY-SA 4.0',
        url: 'https://github.com/risan/quran-json',
        host: 'github.com/risan/quran-json'
      },
      {
        name: 'Ayat pilihan, doa dari Al-Qur\'an & penyemangat beranda',
        use: 'Daftar rujukan ayat (nomor surah:ayat) untuk “Ayat hari ini” dan tab doa Qur\'ani, disusun untuk aplikasi ini; teks ayatnya tetap diambil dari sumber Al-Qur\'an di atas. Kalimat penyemangat kecil di beranda adalah potongan terjemahan ayat (dengan rujukan surah:ayat), bukan kata-kata karangan.'
      },
      {
        name: 'quran-meta',
        role: 'Metadata',
        use: 'Pembagian 30 juz, 604 halaman mushaf Madinah (riwayat Hafs), dan 15 ayat sajdah.',
        note: 'Nomor halaman hanya berasal dari metadata ini.',
        license: 'MIT',
        url: 'https://github.com/quran-center/quran-meta',
        host: 'github.com/quran-center/quran-meta'
      }
    ]
  },
  {
    group: 'Doa & Asmaul Husna',
    icon: 'hands',
    items: [
      {
        name: 'AlAdhan.com (Islamic Network)',
        role: 'Suara adzan',
        use: 'Rekaman adzan yang diputar pada fitur Adzan otomatis (Mishary Rashid Alafasy, Ahmad al-Nafees, Hafiz Mustafa Özcan, Mansour Al-Zahrani). Diputar langsung dari cdn.aladhan.com.',
        note: 'Daftar rekaman dan nama muazin mengikuti halaman resmi aladhan.com/play.',
        url: 'https://aladhan.com/play',
        host: 'aladhan.com'
      },
      {
        name: 'Quran NU Online (quran.nu.or.id)',
        role: 'Doa harian, wudhu, wirid & doa usai salat',
        use: 'Teks Arab, Latin, dan arti untuk enam kategori doa harian yang telah dihimpun di QuranKu, doa wudhu, serta bacaan usai salat fardu. Konten disimpan di aplikasi agar dapat dibuka offline.',
        note: 'Katalog Quran NU Online memuat 16 kategori doa. QuranKu saat ini mencakup enam kategori harian, doa wudhu, dan bacaan usai salat; kategori lainnya belum diintegrasikan. Judul dan pemisahan bagian tertentu disusun QuranKu agar mudah dibaca.',
        url: 'https://quran.nu.or.id/doa',
        host: 'quran.nu.or.id'
      },
      {
        name: 'Quran NU Online — Tahlil & Doa Arwah',
        role: 'Rangkaian versi lengkap',
        use: 'Bacaan Tahlil dan Doa Arwah Arab, Latin, dan terjemah dari halaman khusus Quran NU Online; ditampilkan di aplikasi dan tersedia offline.',
        note: 'Halaman sumber menyediakan pilihan Ringkas dan Lengkap. QuranKu menggunakan susunan Lengkap; judul dan pemenggalan bacaan disusun agar nyaman dibaca, dan sebagian terjemahan diringkas. Silakan cocokkan dengan halaman sumber bila ingin meninjau detail.',
        url: 'https://quran.nu.or.id/tahlil',
        host: 'quran.nu.or.id/tahlil'
      },
      {
        name: 'wnr-code/asmaul_husna',
        use: '99 Asmaul Husna (data versi 2.0.0): tulisan Arab, Latin, arti, makna, faedah/amalan, dan rujukan ayat.',
        license: 'MIT',
        url: 'https://github.com/wnr-code/asmaul_husna',
        host: 'github.com/wnr-code/asmaul_husna'
      }
    ]
  },
  {
    group: 'Waktu & arah',
    icon: 'clock',
    items: [
      {
        name: 'adhan-js (Batoul Apps)',
        use: 'Hisab jadwal salat di perangkat. Parameter: Subuh 20°, Isya 18°, ihtiyat 2 menit, Asar mazhab Syafii; Imsak = Subuh − 10 menit.',
        note: 'Dapat berbeda 1–2 menit dari jadwal resmi Kemenag RI.',
        license: 'MIT',
        url: 'https://github.com/batoulapps/adhan-js',
        host: 'github.com/batoulapps/adhan-js'
      },
      {
        name: 'OpenStreetMap Nominatim',
        use: 'Mencari nama kota, kecamatan, atau wilayah dari koordinat GPS saat pengguna menekan “Gunakan lokasi saya”.',
        note: 'Koordinat dikirim langsung dari perangkat ke Nominatim, bukan ke server QuranKu; layanan dapat menerima alamat IP dan informasi teknis permintaan. Atribusi data: © OpenStreetMap contributors.',
        license: 'Data OpenStreetMap: ODbL 1.0',
        url: 'https://nominatim.openstreetmap.org',
        host: 'nominatim.openstreetmap.org'
      },
      {
        name: 'Kalender Umm al-Qura (Intl)',
        use: 'Tanggal Hijriah dari kalender bawaan peramban/perangkat, dengan koreksi manual ±2 hari.',
        note: 'Awal bulan dapat berbeda dari ketetapan pemerintah RI.'
      },
      {
        name: 'Perhitungan arah kiblat',
        use: 'Rumus lingkaran besar menuju Ka\'bah (21,4225° LU, 39,8262° BT), dihitung di perangkat.'
      },
      {
        name: 'Daftar kota',
        use: 'Koordinat perkiraan pusat 40 kota di Indonesia, disusun untuk aplikasi ini. Dapat diganti GPS atau koordinat manual.'
      }
    ]
  },
  {
    group: 'Font & tampilan',
    icon: 'type',
    items: [
      {
        name: 'Amiri Quran',
        use: 'Font utama teks Al-Qur\'an (disajikan dari aplikasi, tersedia offline).',
        license: 'SIL Open Font License 1.1',
        url: 'https://github.com/aliftype/amiri',
        host: 'github.com/aliftype/amiri'
      },
      {
        name: 'Scheherazade New (SIL)',
        use: 'Font Arab alternatif.',
        license: 'SIL Open Font License 1.1',
        url: 'https://software.sil.org/scheherazade/',
        host: 'software.sil.org/scheherazade'
      },
      {
        name: 'Font Awesome Free 6.7.2',
        use: 'Ikon font di beranda (ucapan sesuai waktu), halaman Doa, Asmaul Husna, dan lembar Bagikan. Hanya ikon yang dipakai yang disertakan (subset), disajikan dari aplikasi.',
        license: 'Ikon CC BY 4.0, font SIL OFL 1.1',
        url: 'https://fontawesome.com',
        host: 'fontawesome.com',
        logo: '/brand-logos/fontawesome.svg'
      },
      {
        name: 'Ikon garis dan ornamen',
        use: 'Logo, ikon garis (SVG), dan ornamen geometris dibuat khusus untuk QuranKu.'
      }
    ]
  },
  {
    group: 'Pustaka perangkat lunak',
    icon: 'grid',
    items: [
      { name: 'Vite', use: 'Alat build aplikasi web.', license: 'MIT', url: 'https://vite.dev', host: 'vite.dev', logo: '/brand-logos/vite.svg' },
      { name: 'qrcode-generator (Kazuhiko Arase)', use: 'Menggambar kode QR pembayaran di halaman infaq, langsung di perangkat.', license: 'MIT', url: 'https://github.com/kazuhikoarase/qrcode-generator', host: 'github.com/kazuhikoarase/qrcode-generator' },
      { name: 'Fontsource', use: 'Paket berkas font Amiri Quran dan Scheherazade New yang disalin ke aplikasi saat build.', url: 'https://fontsource.org', host: 'fontsource.org', logo: '/brand-logos/fontsource.svg' },
      { name: 'Capacitor 8 (Ionic)', use: 'Cangkang Android tipis untuk menjalankan UI web bersama dan mengakses tombol kembali, status bar, splash screen, serta lokasi opsional.', license: 'MIT', url: 'https://github.com/ionic-team/capacitor', host: 'github.com/ionic-team/capacitor', logo: '/brand-logos/capacitor.svg' },
      { name: 'Logo merek (Simple Icons)', use: 'Bentuk logo Vite, Font Awesome, dan Capacitor di daftar ini berasal dari Simple Icons. Logo hanya untuk identifikasi; merek dagang tetap milik masing-masing pemilik.', license: 'CC0 1.0', url: 'https://simpleicons.org', host: 'simpleicons.org' }
    ]
  },
  {
    group: 'Layanan',
    icon: 'grid',
    items: [
      {
        name: 'Cloudflare Workers & D1',
        use: 'Hosting aplikasi, proxy cadangan API, penjadwal pemberitahuan adzan, serta penyimpanan papan donatur dan langganan pemberitahuan.',
        note: 'Alamat utama quran.cgs.my.id; alamat cadangan quran-cgs.appwnr.workers.dev dipakai otomatis bila alamat utama tidak dapat dijangkau.',
        url: 'https://workers.cloudflare.com',
        host: 'workers.cloudflare.com'
      },
      {
        name: 'Web Push (layanan pemberitahuan peramban)',
        use: 'Pada PWA/peramban yang mendukung, pemberitahuan adzan, imsak, dan tarhim saat aplikasi tertutup dikirim lewat layanan push peramban Anda (mis. Google FCM, Mozilla, Apple).',
        note: 'Hanya dipakai bila Anda menyalakan Adzan otomatis berbasis Web Push. Server menyimpan alamat langganan dan kunci enkripsi, lokasi yang dibulatkan sekitar ±1 km, nama wilayah, zona waktu, metode/koreksi tanggal, dan pilihan waktu; permintaan penghapusan dikirim saat fitur dimatikan. APK Android Capacitor tidak mendaftar Web Push.'
      },
      {
        name: 'Trakteer',
        use: 'Pemrosesan pembayaran infaq (QRIS/e-wallet). Hanya dipakai di halaman Infaq.',
        note: 'Pembayaran berlangsung di halaman Trakteer; QuranKu tidak menerima atau menyimpan data kartu/rekening.',
        url: 'https://trakteer.id',
        host: 'trakteer.id'
      }
    ]
  }
]
