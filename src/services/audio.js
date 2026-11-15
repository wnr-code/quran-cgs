// Pemutar murottal global: audio per ayat & seluruh surah, repeat, auto-play, kecepatan, volume.
import { QARI } from '../config.js'
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
      artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }]
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
  const pick = a && pickAudio(a.audio)
  if (!pick) return toast('Audio ayat tidak tersedia dari sumber data ini.')
  if (pick.qari !== audioSettings().qari) toast(`Qari pilihan tidak tersedia, memutar ${QARI[pick.qari] || 'qari lain'}.`)
  Object.assign(state, { mode: 'ayah', surah, ayah: ayahNo, qari: pick.qari })
  setMediaSession()
  emit('audio:ayah', { surah: surah.nomor, ayah: ayahNo })
  await load(pick.url)
}

/** surah: detail atau ringkasan (cukup punya audioFull). */
export async function playSurah(surah) {
  if (!el || !surah) return
  const pick = pickAudio(surah.audioFull)
  if (!pick) return toast('Audio surah tidak tersedia dari sumber data ini.')
  if (pick.qari !== audioSettings().qari) toast(`Qari pilihan tidak tersedia, memutar ${QARI[pick.qari] || 'qari lain'}.`)
  Object.assign(state, { mode: 'surah', surah, ayah: 0, qari: pick.qari })
  setMediaSession()
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
  saveSettings({ audio: { qari } })
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
    state.playing = false
    state.loading = false
    notify()
    toast(navigator.onLine ? 'Audio gagal dimuat dari server.' : 'Offline: audio ini belum diunduh.')
  })
}
