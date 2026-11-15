// Pengaturan pengguna (localStorage — sinkron agar tema diterapkan sebelum render pertama).
import { emit } from '../utils/helpers.js'
import { setNumeralMode } from '../utils/arabic-numbers.js'

const KEY = 'quranku:settings'

export const READER_DEFAULTS = {
  mode: 'continuous', // 'continuous' (mushaf mengalir) | 'focus' (per ayat + terjemahan) | 'page' (per halaman, geser ke samping)
  preset: 'ivory', // 'classic' | 'ivory' | 'dark' | 'night'
  fontSize: 28,
  lineHeight: 2.1,
  gap: 18, // jarak antar blok/ayat (px)
  width: 760, // lebar area bacaan (px)
  margin: 20, // margin kiri-kanan (px)
  translationSize: 16,
  showTranslation: true,
  showLatin: true,
  customBg: '',
  customText: ''
}

export const DEFAULTS = {
  theme: 'auto', // 'auto' | 'light' | 'dark'
  numerals: 'arabic', // 'arabic' | 'latin'
  arabicFont: 'amiri', // 'amiri' | 'scheherazade'
  hijriAdjust: 0,
  reader: { ...READER_DEFAULTS },
  audio: { qari: '05', autoPlay: true, repeat: 'none', rate: 1, volume: 1 },
  goal: { type: 'p2', pages: 2 },
  reminders: { tilawah: false, tilawahTime: '18:30', goal: false, prayer: false },
  // Adzan otomatis: suara adzan saat aplikasi terbuka + pemberitahuan push saat tertutup. Imsak & tarhim hanya Ramadan.
  adzan: { enabled: false, sound: true, voice: 'a9', subuh: true, zuhur: true, asar: true, magrib: true, isya: true, imsak: true, tarhim: true },
  location: null, // { lat, lng, name }
  prayerMethod: 'kemenag'
}

function load() {
  let saved = {}
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {}
  const s = { ...DEFAULTS, ...saved }
  for (const k of ['reader', 'audio', 'goal', 'reminders', 'adzan']) s[k] = { ...DEFAULTS[k], ...(saved[k] || {}) }
  // 1.3.2: bawaan lama (30px / 2,4) terasa renggang — pindahkan ke bawaan baru bila belum pernah diubah pengguna.
  if (s.reader.fontSize === 30 && s.reader.lineHeight === 2.4) Object.assign(s.reader, { fontSize: 28, lineHeight: 2.1 })
  return s
}

let settings = load()

export function getSettings() {
  return settings
}

export function saveSettings(patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && settings[k] && typeof settings[k] === 'object') settings[k] = { ...settings[k], ...v }
    else settings[k] = v
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {}
  applyGlobalSettings()
  emit('settings:changed', settings)
  return settings
}

export function replaceSettings(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next || {}))
  } catch {}
  settings = load()
  applyGlobalSettings()
  emit('settings:changed', settings)
}

export function resolvedTheme() {
  if (settings.theme === 'auto') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return settings.theme
}

export function applyGlobalSettings() {
  const root = document.documentElement
  const theme = resolvedTheme()
  root.dataset.theme = theme
  root.dataset.arabicFont = settings.arabicFont
  root.dataset.numerals = settings.numerals === 'latin' ? 'latin' : 'arabic'
  setNumeralMode(settings.numerals)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0f0d' : '#0b3d2e')
}

export function initSettings() {
  applyGlobalSettings()
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'auto') applyGlobalSettings()
  })
}
