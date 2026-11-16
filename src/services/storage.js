// Pengaturan pengguna (localStorage — sinkron agar tema diterapkan sebelum render pertama).
import { emit } from '../utils/helpers.js'
import { setNumeralMode } from '../utils/arabic-numbers.js'
import { deriveTheme, normalizeCustom, CUSTOM_DEFAULT } from '../utils/theme.js'

const KEY = 'quranku:settings'
const ARABIC_FONT_MIGRATION_KEY = 'quranku:migration:readable-quran-font-v1'
/** Variabel tema kustom yang sudah dihitung, dibaca public/theme-init.js sebelum render pertama. */
const THEME_VARS_KEY = 'quranku:theme-vars'

export const READER_DEFAULTS = {
  mode: 'continuous', // 'continuous' (mushaf mengalir) | 'focus' (per ayat + terjemahan) | 'page' (per halaman, geser ke samping)
  preset: 'theme', // 'theme' follows the app palette; also 'classic' | 'ivory' | 'dark' | 'night'
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
  theme: 'auto', // 'auto' | 'light' | 'dark' | 'custom'
  customTheme: { ...CUSTOM_DEFAULT }, // { primary, accent, bg } — dipakai bila theme === 'custom'
  numerals: 'arabic', // 'arabic' | 'latin'
  arabicFont: 'scheherazade', // Naskh-style local font; users can still choose 'amiri'.
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
  // Pindahkan font bawaan lama ke Naskh lokal yang lebih lega, satu kali saja; Amiri tetap bisa dipilih kembali.
  try {
    if (localStorage.getItem(ARABIC_FONT_MIGRATION_KEY) !== '1') {
      if (saved.arabicFont === 'amiri') {
        saved = { ...saved, arabicFont: 'scheherazade' }
        localStorage.setItem(KEY, JSON.stringify(saved))
      }
      localStorage.setItem(ARABIC_FONT_MIGRATION_KEY, '1')
    }
  } catch {}
  const s = { ...DEFAULTS, ...saved }
  for (const k of ['reader', 'audio', 'goal', 'reminders', 'adzan']) s[k] = { ...DEFAULTS[k], ...(saved[k] || {}) }
  s.customTheme = normalizeCustom(saved.customTheme)
  if (!['auto', 'light', 'dark', 'custom'].includes(s.theme)) s.theme = 'auto'
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
  if (settings.theme === 'custom') return deriveTheme(settings.customTheme).base
  if (settings.theme === 'auto') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  return settings.theme
}

const CUSTOM_VARS = Object.keys(deriveTheme(CUSTOM_DEFAULT).vars)

export function applyGlobalSettings() {
  const root = document.documentElement
  const theme = resolvedTheme()
  root.dataset.theme = theme
  root.dataset.arabicFont = settings.arabicFont
  root.dataset.numerals = settings.numerals === 'latin' ? 'latin' : 'arabic'
  setNumeralMode(settings.numerals)
  // Tema kustom: variabel warna dipasang langsung di <html>; tema lain: dilepas agar kembali ke theme.css.
  const custom = settings.theme === 'custom' ? deriveTheme(settings.customTheme) : null
  for (const k of CUSTOM_VARS) custom ? root.style.setProperty(k, custom.vars[k]) : root.style.removeProperty(k)
  try {
    if (custom) localStorage.setItem(THEME_VARS_KEY, JSON.stringify({ base: custom.base, vars: custom.vars }))
    else localStorage.removeItem(THEME_VARS_KEY)
  } catch {}
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', custom ? custom.themeColor : theme === 'dark' ? '#0a0f0d' : '#0b3d2e')
}

export function initSettings() {
  applyGlobalSettings()
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'auto') applyGlobalSettings()
  })
}
