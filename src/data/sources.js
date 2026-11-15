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
        note: 'Hanya teks Arab: tanpa terjemahan, transliterasi, audio, dan tafsir.',
        license: 'CC BY 4.0',
        url: 'https://github.com/risan/quran-json',
        host: 'github.com/risan/quran-json'
      },
      {
        name: 'Ayat pilihan & doa dari Al-Qur\'an',
        use: 'Daftar rujukan ayat (nomor surah:ayat) untuk “Ayat hari ini” dan tab doa Qur\'ani, disusun untuk aplikasi ini. Teks ayatnya tetap diambil dari sumber Al-Qur\'an di atas.'
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
        name: 'NU Online (islam.nu.or.id)',
        role: 'Doa sebelum berwudhu',
        use: 'Enam bacaan sebelum berwudhu (ta‘awudz, basmalah, dua tahmid, ta‘awudz dari was-was setan, dua kalimat syahadat): teks Arab, Latin, dan arti. Disimpan di aplikasi sehingga dapat dibuka offline.',
        note: 'Disalin apa adanya dari artikel “Doa Sebelum Berwudhu” (Alhafiz Kurniawan, 14 Desember 2020), yang mengutip Kitab Hasyiyatus Syarqawi karya Syekh Abdullah As-Syarqawi halaman 52.',
        url: 'https://islam.nu.or.id/doa/doa-sebelum-berwudhu-M7e7B',
        host: 'islam.nu.or.id'
      },
      {
        name: 'fitrahive/dua-dhikr',
        role: 'Doa sesudah wudhu & wirid setelah salat',
        use: 'Bacaan sesudah wudhu dan dzikir setelah salat wajib: teks Arab, Latin, terjemahan, keterangan, dan rujukan hadis. Disimpan di aplikasi sehingga dapat dibuka offline.',
        note: 'Disalin apa adanya (lisensi MIT). Setiap bacaan mencantumkan rujukan riwayatnya (mis. HR. Muslim, HR. al-Bukhari).',
        url: 'https://github.com/fitrahive/dua-dhikr',
        host: 'github.com/fitrahive/dua-dhikr'
      },
      {
        name: 'EQuran.id API Doa',
        use: 'Doa harian: teks Arab, Latin, terjemahan, dan rujukan. Bila layanan tidak tersedia, halaman doa menampilkan keterangan (tidak ada doa buatan).',
        url: 'https://equran.id',
        host: 'equran.id'
      },
      {
        name: 'wnr-code/asmaul_husna',
        use: '99 Asmaul Husna (data versi 2): tulisan Arab, Latin, arti, makna, faedah/amalan, dan rujukan ayat.',
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
        name: 'Ikon dan ornamen',
        use: 'Logo, ikon garis, dan ornamen geometris dibuat khusus untuk QuranKu.'
      }
    ]
  },
  {
    group: 'Pustaka perangkat lunak',
    icon: 'grid',
    items: [
      { name: 'Vite', use: 'Alat build aplikasi web.', license: 'MIT', url: 'https://vite.dev', host: 'vite.dev' },
      { name: 'qrcode-generator (Kazuhiko Arase)', use: 'Menggambar kode QR pembayaran di halaman infaq, langsung di perangkat.', license: 'MIT', url: 'https://github.com/kazuhikoarase/qrcode-generator', host: 'github.com/kazuhikoarase/qrcode-generator' },
      { name: 'Fontsource', use: 'Paket berkas font Amiri Quran dan Scheherazade New yang disalin ke aplikasi saat build.', url: 'https://fontsource.org', host: 'fontsource.org' },
      { name: 'Android Browser Helper (Google)', use: 'Pembungkus Trusted Web Activity untuk aplikasi Android.', license: 'Apache 2.0', url: 'https://github.com/GoogleChrome/android-browser-helper', host: 'github.com/GoogleChrome/android-browser-helper' }
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
        use: 'Pemberitahuan adzan, imsak, dan tarhim saat aplikasi tertutup dikirim lewat layanan push milik peramban Anda (mis. Google FCM, Mozilla, Apple).',
        note: 'Hanya dipakai bila Anda menyalakan Adzan otomatis. Yang disimpan di server: alamat langganan push, koordinat lokasi salat (dibulatkan ±1 km), dan pilihan waktu.'
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
