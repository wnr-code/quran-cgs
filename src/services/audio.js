// Pemutar murottal global: audio per ayat & seluruh surah, repeat, auto-play, kecepatan, volume.
import { QARI, QARI_AYAH, QARI_SURAH, DEFAULT_QARI } from '../config.js'
import { getSettings, saveSettings } from './storage.js'
import { resolveAudioUrl } from './offline.js'
import { emit, toast } from '../utils/helpers.js'

const el = typeof Audio !== 'undefined' ? new Audio() : null
if (el) el.preload = 'auto'

const state = {
  mode: null, // 'ayah' | 'surah' | null
  surah: null, // data surah yang sedang diputar
  ayah: 0,
  playing: false,
  loading: false,
  local: false,
  qari: '05'
}
let blobUrl = null

export const getAudioState = () => ({ ...state, currentTime: el ? el.currentTime : 0, duration: el && Number.isFinite(el.duration) ? el.duration : 0 })
export const audioSettings = () => getSettings().audio

/** Pilih URL qari; bila qari pilihan tak tersedia di sumber data, pakai yang ada dan beri tahu pengguna. */
export function pickAudio(map, qari = audioSettings().qari) {
  if (!map) return null
  if (map[qari]) return { url: map[qari], qari }
  const k = Object.keys(map)[0]
  return k ? { url: map[k], qari: k } : null
}

/** URL audio surah penuh. Qari tambahan memakai alamat <dasar>/<NNN>.mp3; lainnya dari data surah. */
export function pickSurahAudio(surah, qari = audioSettings().qari) {
  if (!surah) return null
  const extra = QARI_SURAH[qari]
  const n = Number(surah.nomor)
  if (extra && Number.isInteger(n) && n >= 1 && n <= 114) {
    const file = `${String(n).padStart(3, '0')}.mp3`
    return { url: `${extra.base}/${file}`, alt: extra.alt ? `${extra.alt}/${file}` : '', qari }
  }
  return pickAudio(surah.audioFull, extra ? ayahQari() : qari)
}

/** Qari untuk audio per ayat: qari pilihan bila mendukung, selain itu qari per-ayat yang terakhir dipilih. */
export function ayahQari() {
  const s = audioSettings()
  if (QARI_AYAH[s.qari]) return s.qari
  return QARI_AYAH[s.ayahQari] ? s.ayahQari : DEFAULT_QARI
}
let toldSurahOnly = false
let fallbackUrl = ''

function notify() {
  emit('audio:state', getAudioState())
}

async function load(url) {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrl = null
  }
  const r = await resolveAudioUrl(url)
  if (r.blob) blobUrl = r.src
  state.local = r.local
  const s = audioSettings()
  el.src = r.src
  el.playbackRate = s.rate || 1
  el.volume = s.volume ?? 1
  state.loading = true
  notify()
  try {
    await el.play()
  } catch (e) {
    state.loading = false
    state.playing = false
    notify()
    if (e && e.name !== 'AbortError') toast(navigator.onLine ? 'Audio tidak dapat diputar.' : 'Audio ini belum diunduh untuk offline.')
  }
}

function setMediaSession() {
  if (!('mediaSession' in navigator) || !state.surah) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.mode === 'ayah' ? `${state.surah.namaLatin} — Ayat ${state.ayah}` : `Surah ${state.surah.namaLatin}`,
      artist: QARI[state.qari] || 'Murottal',
      album: 'QuranKu',
      artwork: [{ src: '/icons/icon-512-v2.png', sizes: '512x512', type: 'image/png' }]
    })
    navigator.mediaSession.setActionHandler('play', () => resume())
    navigator.mediaSession.setActionHandler('pause', () => pause())
    navigator.mediaSession.setActionHandler('nexttrack', state.mode === 'ayah' ? () => next() : null)
    navigator.mediaSession.setActionHandler('previoustrack', state.mode === 'ayah' ? () => prev() : null)
  } catch {}
}

export async function playAyah(surah, ayahNo) {
  if (!el || !surah) return
  const a = surah.ayat && surah.ayat[ayahNo - 1]
  const chosen = audioSettings().qari
  const pick = a && pickAudio(a.audio, ayahQari())
  if (!pick) return toast('Audio ayat tidak tersedia dari sumber data ini.')
  if (QARI_SURAH[chosen]) {
    if (!toldSurahOnly) toast(`${QARI[chosen]} hanya tersedia untuk surah penuh. Audio per ayat memakai ${QARI[pick.qari] || 'qari lain'}.`, 5000)
    toldSurahOnly = true
  } else if (pick.qari !== chosen) toast(`Qari pilihan tidak tersedia, memutar ${QARI[pick.qari] || 'qari lain'}.`)
  fallbackUrl = ''
  Object.assign(state, { mode: 'ayah', surah, ayah: ayahNo, qari: pick.qari })
  setMediaSession()
  emit('audio:ayah', { surah: surah.nomor, ayah: ayahNo })
  await load(pick.url)
}

/** surah: detail atau ringkasan (cukup punya audioFull). */
export async function playSurah(surah) {
  if (!el || !surah) return
  const pick = pickSurahAudio(surah)
  if (!pick) return toast('Audio surah tidak tersedia dari sumber data ini.')
  if (pick.qari !== audioSettings().qari) toast(`Qari pilihan tidak tersedia, memutar ${QARI[pick.qari] || 'qari lain'}.`)
  Object.assign(state, { mode: 'surah', surah, ayah: 0, qari: pick.qari })
  setMediaSession()
  fallbackUrl = pick.alt || ''
  await load(pick.url)
}

export function pause() {
  el && el.pause()
}
export function resume() {
  if (el && el.src) el.play().catch(() => {})
}
export function toggle() {
  if (!el || !state.mode) return
  el.paused ? resume() : pause()
}
export function stop() {
  if (!el) return
  el.pause()
  el.removeAttribute('src')
  el.load()
  Object.assign(state, { mode: null, surah: null, ayah: 0, playing: false, loading: false })
  emit('audio:ayah', null)
  notify()
}
export function next() {
  if (state.mode === 'ayah' && state.surah && state.ayah < state.surah.ayat.length) return playAyah(state.surah, state.ayah + 1)
}
export function prev() {
  if (state.mode === 'ayah' && state.surah && state.ayah > 1) return playAyah(state.surah, state.ayah - 1)
  if (el) el.currentTime = 0
}
export function seek(ratio) {
  if (el && Number.isFinite(el.duration)) el.currentTime = Math.max(0, Math.min(1, ratio)) * el.duration
}
export function setRate(rate) {
  saveSettings({ audio: { rate } })
  if (el) el.playbackRate = rate
}
export function setVolume(volume) {
  saveSettings({ audio: { volume } })
  if (el) el.volume = volume
}
export function setRepeat(repeat) {
  saveSettings({ audio: { repeat } })
  notify()
}
export function setAutoPlay(autoPlay) {
  saveSettings({ audio: { autoPlay } })
}
export function setQari(qari) {
  if (!QARI[qari]) return
  saveSettings({ audio: QARI_AYAH[qari] ? { qari, ayahQari: qari } : { qari } })
  // Lanjutkan pemutaran dengan qari baru
  if (state.mode === 'ayah') playAyah(state.surah, state.ayah)
  else if (state.mode === 'surah') playSurah(state.surah)
}

function onEnded() {
  const s = audioSettings()
  if (state.mode === 'ayah') {
    if (s.repeat === 'ayah') return playAyah(state.surah, state.ayah)
    if (state.ayah < state.surah.ayat.length) {
      if (s.autoPlay) return playAyah(state.surah, state.ayah + 1)
    } else if (s.repeat === 'surah') return playAyah(state.surah, 1)
  } else if (state.mode === 'surah' && (s.repeat === 'surah' || s.repeat === 'ayah')) {
    el.currentTime = 0
    return resume()
  }
  state.playing = false
  notify()
}

if (el) {
  el.addEventListener('playing', () => {
    state.playing = true
    state.loading = false
    notify()
  })
  el.addEventListener('pause', () => {
    state.playing = false
    notify()
  })
  el.addEventListener('waiting', () => {
    state.loading = true
    notify()
  })
  el.addEventListener('ended', onEnded)
  el.addEventListener('timeupdate', () => emit('audio:time', { currentTime: el.currentTime, duration: Number.isFinite(el.duration) ? el.duration : 0 }))
  el.addEventListener('error', () => {
    if (!state.mode) return
    // Qari tambahan: alamat utama gagal → coba sekali alamat resmi cadangan.
    if (state.mode === 'surah' && fallbackUrl && navigator.onLine) {
      const url = fallbackUrl
      fallbackUrl = ''
      return void load(url)
    }
    state.playing = false
    state.loading = false
    notify()
    toast(navigator.onLine ? 'Audio gagal dimuat dari server.' : 'Offline: audio ini belum diunduh.')
  })
}
