// Mini player global — tetap tampil saat berpindah halaman.
import { icon } from './icons.js'
import { esc, on } from '../utils/helpers.js'
import { getAudioState, toggle, stop, next, prev } from '../services/audio.js'
import { QARI } from '../config.js'
import { qnum } from '../utils/arabic-numbers.js'

export function initMiniPlayer(el) {
  el.innerHTML = `
    <div class="mp-progress"><i></i></div>
    <a class="mp-info" href="#/murottal" aria-label="Buka pemutar murottal"><strong></strong><small></small></a>
    <button class="icon-btn" data-act="prev" aria-label="Ayat sebelumnya">${icon('prev')}</button>
    <button class="icon-btn mp-main" data-act="toggle" aria-label="Putar atau jeda">${icon('play')}</button>
    <button class="icon-btn" data-act="next" aria-label="Ayat berikutnya">${icon('next')}</button>
    <button class="icon-btn" data-act="stop" aria-label="Hentikan">${icon('close')}</button>`
  const title = el.querySelector('strong')
  const sub = el.querySelector('small')
  const bar = el.querySelector('.mp-progress i')
  const main = el.querySelector('.mp-main')
  const acts = { toggle, stop, next, prev }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]')
    if (b) acts[b.dataset.act]()
  })
  const render = (s) => {
    const active = !!s.mode
    el.hidden = !active
    document.body.classList.toggle('has-player', active)
    if (!active) return
    title.innerHTML = s.mode === 'ayah' ? `${esc(s.surah.namaLatin)} · Ayat <span class="qn">${qnum(s.ayah)}</span>` : `Surah ${esc(s.surah.namaLatin)}`
    sub.textContent = (QARI[s.qari] || 'Murottal') + (s.local ? ' · offline' : '') + (s.loading ? ' · memuat…' : '')
    main.innerHTML = icon(s.playing ? 'pause' : 'play')
    el.querySelector('[data-act="prev"]').hidden = s.mode !== 'ayah'
    el.querySelector('[data-act="next"]').hidden = s.mode !== 'ayah'
  }
  on('audio:state', render)
  on('audio:time', ({ currentTime, duration }) => {
    bar.style.width = duration ? `${(currentTime / duration) * 100}%` : '0%'
  })
  render(getAudioState())
}
