// Data contoh untuk screenshot Play Store. Dipakai HANYA oleh scripts/gen-play-shots-app.mjs.
//
// Mengapa tidak memakai API asli: sandbox pembuat screenshot tidak boleh bergantung pada jaringan,
// dan EQuran.id bisa berubah/limit. Mengapa tidak memakai /data/ lokal: tampilan lokal hanya berisi
// teks Arab (tanpa terjemahan/latin) dan memunculkan banner "Sumber cadangan", yang terlihat seperti
// peringatan di listing Play Store.
//
// Teks Arab SELALU dari public/data (data asli paket quran-json lewat gen-local.mjs).
// Teks terjemahan di bawah ini hanya untuk ayat yang terlihat di screenshot, memakai terjemahan
// Kemenag RI. Ayat lain memakai contoh umum agar tata letak tetap realistis.
import { readFileSync } from 'node:fs'

const ARAB = JSON.parse(readFileSync(new URL('../public/data/surah-list.json', import.meta.url), 'utf8'))
const META = JSON.parse(readFileSync(new URL('../src/data/quran-meta.json', import.meta.url), 'utf8'))

/** Terjemahan & transliterasi untuk surah pendek yang difoto (1 dan 112). */
const DETAIL = {
  1: {
    latin: [
      'Bismillāhir-raḥmānir-raḥīm',
      'Al-ḥamdu lillāhi rabbil-‘ālamīn',
      'Ar-raḥmānir-raḥīm',
      'Māliki yaumid-dīn',
      'Iyyāka na‘budu wa iyyāka nasta‘īn',
      'Ihdinaṣ-ṣirāṭal-mustaqīm',
      'Ṣirāṭal-lażīna an‘amta ‘alaihim gairil-magḍūbi ‘alaihim wa laḍ-ḍāllīn'
    ],
    id: [
      'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.',
      'Segala puji bagi Allah, Tuhan seluruh alam,',
      'Yang Maha Pengasih, Maha Penyayang,',
      'Pemilik hari pembalasan.',
      'Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami mohon pertolongan.',
      'Tunjukilah kami jalan yang lurus,',
      '(yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat.'
    ]
  },
  112: {
    latin: [
      'Qul huwallāhu aḥad',
      'Allāhuṣ-ṣamad',
      'Lam yalid wa lam yūlad',
      'Wa lam yakul lahū kufuwan aḥad'
    ],
    id: [
      'Katakanlah (Muhammad), “Dialah Allah, Yang Maha Esa.”',
      'Allah tempat meminta segala sesuatu.',
      '(Allah) tidak beranak dan tidak pula diperanakkan.',
      'Dan tidak ada sesuatu yang setara dengan Dia.'
    ]
  }
}

/**
 * Terjemahan untuk ayat tertentu yang muncul di luar halaman baca — mis. QS. 7:180 sebagai
 * pembuka halaman Asmaul Husna, dan QS. 2:261 sebagai "mutiara doa" di halaman Infaq.
 * Kunci memakai nomor ayat, bukan indeks array.
 */
const AYAT = {
  '7:180':
    'Dan Allah memiliki Asmaul Husna (nama-nama yang terbaik), maka bermohonlah kepada-Nya dengan menyebutnya dan tinggalkanlah orang-orang yang menyalahartikan nama-nama-Nya. Mereka kelak akan mendapat balasan terhadap apa yang telah mereka kerjakan.',
  '2:261':
    'Perumpamaan orang yang menginfakkan hartanya di jalan Allah seperti sebutir biji yang menumbuhkan tujuh tangkai, pada setiap tangkai ada seratus biji. Allah melipatgandakan bagi siapa yang Dia kehendaki, dan Allah Mahaluas, Maha Mengetahui.',
  '2:153': 'Wahai orang-orang yang beriman! Mohonlah pertolongan (kepada Allah) dengan sabar dan salat. Sungguh, Allah beserta orang-orang yang sabar.',
  '13:28': 'Ingatlah, hanya dengan mengingat Allah hati menjadi tenang.'
}

/** Ayat contoh bergiliran untuk surah panjang agar halaman tidak tampak kosong. */
const POOL = [
  {
    latin: 'Żālikal-kitābu lā raiba fīh, hudal lil-muttaqīn',
    id: 'Kitab (Al-Qur’an) ini tidak ada keraguan padanya; petunjuk bagi mereka yang bertakwa,'
  },
  {
    latin: 'Allażīna yu’minūna bil-gaibi wa yuqīmūnaṣ-ṣalāta wa mimmā razaqnāhum yunfiqūn',
    id: 'yaitu mereka yang beriman kepada yang gaib, melaksanakan salat, dan menginfakkan sebagian rezeki yang Kami berikan kepada mereka,'
  },
  {
    latin: 'Wal-lażīna yu’minūna bimā unzila ilaika wa mā unzila min qablika wa bil-ākhirati hum yūqinūn',
    id: 'dan mereka yang beriman kepada (Al-Qur’an) yang diturunkan kepadamu (Muhammad) dan kepada (kitab-kitab) yang diturunkan sebelummu, serta mereka yakin akan adanya (kehidupan) akhirat.'
  },
  {
    latin: 'Ulā’ika ‘alā hudam mir rabbihim wa ulā’ika humul-mufliḥūn',
    id: 'Mereka itulah yang mendapat petunjuk dari Tuhannya dan mereka itulah orang-orang yang beruntung.'
  }
]

function verses(n, count) {
  const known = DETAIL[n]
  return Array.from({ length: count }, (_, i) => {
    const verseNo = i + 1
    return {
      nomorAyat: verseNo,
      teksArab: '', // diisi surahDetail() dari data Arab asli
      teksLatin: known?.latin?.[i] ?? POOL[i % POOL.length].latin,
      teksIndonesia: known?.id?.[i] ?? AYAT[`${n}:${verseNo}`]?.id ?? AYAT[`${n}:${verseNo}`] ?? POOL[i % POOL.length].id,
      audio: {}
    }
  })
}

/** Respons EQuran.id tiruan untuk satu surah: { code: 200, data: {...} }. */
export function surahDetail(n) {
  const meta = ARAB.find((s) => s.id === Number(n))
  if (!meta) return null
  const arab = JSON.parse(readFileSync(new URL(`../public/data/surah/${n}.json`, import.meta.url), 'utf8'))
  const ayat = verses(n, meta.total_verses).map((a, i) => ({ ...a, teksArab: arab.verses[i]?.text || '' }))
  return {
    code: 200,
    data: {
      nomor: meta.id,
      nama: meta.name,
      namaLatin: meta.transliteration,
      jumlahAyat: meta.total_verses,
      tempatTurun: meta.type === 'medinan' ? 'Madinah' : 'Mekah',
      arti: meta.translation,
      deskripsi: '',
      audioFull: {},
      ayat
    }
  }
}

export function surahList() {
  return {
    code: 200,
    data: ARAB.map((s) => ({
      nomor: s.id,
      nama: s.name,
      namaLatin: s.transliteration,
      jumlahAyat: s.total_verses,
      tempatTurun: s.type === 'medinan' ? 'Madinah' : 'Mekah',
      arti: s.translation,
      deskripsi: '',
      audioFull: {}
    }))
  }
}

export function tafsir(n) {
  const meta = META.ayahCounts[Number(n) - 1] || 0
  return {
    code: 200,
    data: {
      nomor: Number(n),
      namaLatin: ARAB.find((s) => s.id === Number(n))?.transliteration || '',
      tafsir: Array.from({ length: meta }, (_, i) => ({
        ayat: i + 1,
        teks: 'Penjelasan ayat ini menerangkan kandungan makna dan pelajaran yang dapat diambil, sebagaimana diuraikan dalam kitab tafsir ringkas.'
      }))
    }
  }
}
