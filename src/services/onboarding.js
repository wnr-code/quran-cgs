import { icon } from '../components/icons.js'

export const ONBOARDING_KEY = 'quranku:onboarding:completed:v1'

export const ONBOARDING_SLIDES = [
  {
    eyebrow: 'BACA DENGAN NYAMAN',
    title: 'Al-Qur’an, mengikuti ritme Anda.',
    description: 'Jelajahi mushaf, terjemahan, tafsir, dan audio. Simpan bookmark serta posisi terakhir agar mudah melanjutkan bacaan.',
    icon: 'book',
    art: 'quran',
    label: 'Mushaf digital',
    features: [
      { icon: 'bookmark', label: 'Bookmark ayat' },
      { icon: 'headphones', label: 'Murottal' },
      { icon: 'refresh', label: 'Lanjut membaca' }
    ]
  },
  {
    eyebrow: 'JADWAL SALAT',
    title: 'Waktu salat sesuai lokasi.',
    description: 'Pilih kota atau koordinat untuk melihat jadwal. Dari halaman Salat, aktifkan azan, pengingat sebelum salat, dan notifikasi imsak Ramadan.',
    icon: 'mosque',
    art: 'prayer',
    label: 'Ibadah tepat waktu',
    features: [
      { icon: 'pin', label: 'Lokasi pilihan' },
      { icon: 'clock', label: 'Jadwal harian' },
      { icon: 'calendar', label: 'Pengingat Ramadan' }
    ]
  },
  {
    eyebrow: 'TEMAN IBADAH HARIAN',
    title: 'Lebih banyak, dalam satu tempat.',
    description: 'Temukan arah kiblat, kalender Hijriah, doa, tasbih, dan target tilawah. Pengaturan pribadi Anda tetap tersimpan di perangkat.',
    icon: 'compass',
    art: 'daily',
    label: 'Perjalanan ibadah Anda',
    features: [
      { icon: 'calendar', label: 'Kalender Hijriah' },
      { icon: 'hands', label: 'Doa & tasbih' },
      { icon: 'target', label: 'Target tilawah' }
    ]
  }
]

function safeStorage() {
  try { return globalThis.localStorage } catch { return null }
}

export function hasCompletedOnboarding(storage = safeStorage()) {
  try { return storage?.getItem(ONBOARDING_KEY) === '1' } catch { return false }
}

export function markOnboardingComplete(storage = safeStorage()) {
  if (!storage) return false
  try { storage.setItem(ONBOARDING_KEY, '1'); return true } catch { return false }
}

export function renderOnboardingSlide(index = 0, direction = 'next') {
  const active = Math.max(0, Math.min(ONBOARDING_SLIDES.length - 1, Number(index) || 0))
  const slide = ONBOARDING_SLIDES[active]
  const last = active === ONBOARDING_SLIDES.length - 1
  const progress = Math.round(((active + 1) / ONBOARDING_SLIDES.length) * 100)
  return `<div class="onboarding-shade" aria-hidden="true"></div>
    <section class="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-description" data-direction="${direction}">
      <header class="onboarding-header">
        <div class="onboarding-brand"><img src="/icons/icon-192-v2.png" width="34" height="34" alt="" /><span>QuranKu</span></div>
        <span class="onboarding-step">${String(active + 1).padStart(2, '0')} <i>/</i> ${String(ONBOARDING_SLIDES.length).padStart(2, '0')}</span>
        <button type="button" class="onboarding-skip" data-onboarding-finish>Lewati</button>
      </header>
      <div class="onboarding-progress" role="progressbar" aria-label="Langkah pengenalan" aria-valuemin="1" aria-valuemax="${ONBOARDING_SLIDES.length}" aria-valuenow="${active + 1}" aria-valuetext="Langkah ${active + 1} dari ${ONBOARDING_SLIDES.length}"><span style="width:${progress}%"></span></div>
      <div class="onboarding-stage" aria-live="polite" aria-atomic="true">
        <div class="onboarding-art" data-onboarding-art="${slide.art}" aria-hidden="true">
          <span class="onboarding-orbit onboarding-orbit-one"></span><span class="onboarding-orbit onboarding-orbit-two"></span>
          <span class="onboarding-spark onboarding-spark-one">✦</span><span class="onboarding-spark onboarding-spark-two">✧</span>
          <div class="onboarding-symbol">${icon(slide.icon)}</div>
          ${slide.features.map((feature, i) => `<span class="onboarding-float onboarding-float-${i + 1}">${icon(feature.icon)}</span>`).join('')}
          <span class="onboarding-art-label">${slide.label}</span>
        </div>
        <div class="onboarding-copy">
          <p class="onboarding-eyebrow"><span></span>${slide.eyebrow}</p>
          <h1 id="onboarding-title">${slide.title}</h1>
          <p class="onboarding-description" id="onboarding-description">${slide.description}</p>
          <ul class="onboarding-features" aria-label="Fitur terkait">${slide.features.map((feature) => `<li>${icon('check')}<span>${feature.label}</span></li>`).join('')}</ul>
        </div>
      </div>
      <footer class="onboarding-footer">
        <button type="button" class="onboarding-back" data-onboarding-back ${active === 0 ? 'hidden' : ''}>${icon('back')}<span>Kembali</span></button>
        <div class="onboarding-dots" role="group" aria-label="Langkah ${active + 1} dari ${ONBOARDING_SLIDES.length}">${ONBOARDING_SLIDES.map((_, i) => `<span class="${i === active ? 'is-current' : i < active ? 'is-done' : ''}" ${i === active ? 'aria-current="step"' : ''}></span>`).join('')}</div>
        <button type="button" class="onboarding-next" data-onboarding-next>${last ? '<span>Mulai menggunakan QuranKu</span>' : '<span>Lanjut</span>'}${icon(last ? 'check' : 'forward')}</button>
      </footer>
      <p class="onboarding-privacy">${icon('shield')}<span>Tanpa akun. Pengaturan dan progres bacaan tersimpan di perangkat.</span></p>
    </section>`
}

/** Tampilkan pengenalan satu kali setelah rute pertama siap; splash brand tetap terlihat di atasnya. */
export function showFirstRunOnboarding() {
  if (typeof document === 'undefined' || hasCompletedOnboarding() || document.querySelector('[data-onboarding-root]')) return false
  const root = document.createElement('div')
  root.className = 'onboarding-root'
  root.dataset.onboardingRoot = ''
  const app = document.getElementById('app')
  const wasInert = app?.inert || false
  const previousAriaHidden = app?.getAttribute('aria-hidden')
  let active = 0
  let direction = 'next'
  let touchStartX = null

  const render = (focus = true) => {
    root.innerHTML = renderOnboardingSlide(active, direction)
    if (focus) requestAnimationFrame(() => root.querySelector('[data-onboarding-next]')?.focus({ preventScroll: true }))
  }
  const finish = () => {
    markOnboardingComplete()
    root.classList.add('is-closing')
    document.body.classList.remove('onboarding-open')
    if (app) {
      app.inert = wasInert
      if (previousAriaHidden === null) app.removeAttribute('aria-hidden')
      else app.setAttribute('aria-hidden', previousAriaHidden)
    }
    const view = document.getElementById('view')
    if (!wasInert) view?.focus({ preventScroll: true })
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260
    window.setTimeout(() => root.remove(), delay)
  }
  const next = () => {
    if (active >= ONBOARDING_SLIDES.length - 1) return
    direction = 'next'
    active++
    render()
  }
  const back = () => {
    if (active <= 0) return
    direction = 'back'
    active--
    render()
  }

  render(false)
  document.body.appendChild(root)
  document.body.classList.add('onboarding-open')
  if (app) {
    app.inert = true
    app.setAttribute('aria-hidden', 'true')
  }
  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-onboarding-finish]')) finish()
    else if (event.target.closest('[data-onboarding-next]')) active === ONBOARDING_SLIDES.length - 1 ? finish() : next()
    else if (event.target.closest('[data-onboarding-back]')) back()
  })
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      finish()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [...root.querySelectorAll('button:not([disabled]):not([hidden])')]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  })
  root.addEventListener('touchstart', (event) => {
    if (event.touches.length === 1) touchStartX = event.touches[0].clientX
  }, { passive: true })
  root.addEventListener('touchend', (event) => {
    if (touchStartX === null || !event.changedTouches.length) return
    const delta = event.changedTouches[0].clientX - touchStartX
    touchStartX = null
    if (delta < -55) next()
    else if (delta > 55) back()
  }, { passive: true })
  requestAnimationFrame(() => root.querySelector('[data-onboarding-next]')?.focus({ preventScroll: true }))
  return true
}
