// Daftar suara adzan (modul terpisah tanpa ketergantungan agar bisa diuji langsung dari Node).
/** Rekaman adzan dari aladhan.com (Islamic Network) — nama sebagaimana tercantum di https://aladhan.com/play. */
export const ADZAN_VOICES = {
  a9: 'Mishary Rashid Alafasy',
  a4: 'Mishary Rashid Alafasy (Dubai One TV)',
  a7: 'Mishary Rashid Alafasy (versi lain)',
  a1: 'Ahmad al-Nafees',
  a2: 'Hafiz Mustafa Özcan (Turki)',
  a11: 'Mansour Al-Zahrani'
}
const FILES = { a11: 'a11-mansour-al-zahrani' }
export const adzanUrl = (voice) => `https://cdn.aladhan.com/audio/adhans/${FILES[voice] || (ADZAN_VOICES[voice] ? voice : 'a9')}.mp3`

