import { pageHeader } from '../components/navbar.js'
import { LOGO_SVG, icon } from '../components/icons.js'
import { APP } from '../config.js'
import { META_SOURCE } from '../utils/quran-meta.js'
import { esc } from '../utils/helpers.js'

export default function about(root) {
  root.innerHTML = `<div class="page">${pageHeader('Tentang QuranKu')}
    <section class="card about-hero">${LOGO_SVG}<h2>${APP.name}</h2><p class="muted">Versi ${APP.version} · ${APP.packageId}</p>
      <p>Aplikasi Al-Qur'an digital gratis: mode baca mushaf, terjemahan, tafsir, murottal, dan dukungan offline.</p></section>
    <section class="card"><p class="eyebrow">Sumber data</p>
      <ul class="plain-list text">
        <li><span><b>Teks Al-Qur'an, terjemahan, transliterasi, tafsir, audio</b><small>EQuran.id API v2 (utama) · Al Quran Cloud API (cadangan, ditandai sebagai edisi berbeda)</small></span></li>
        <li><span><b>Juz, halaman mushaf, ayat sajdah</b><small>${esc(META_SOURCE)} — 604 halaman</small></span></li>
        <li><span><b>Jadwal salat & arah kiblat</b><small>Dihitung di perangkat (pustaka adhan; rumus great-circle)</small></span></li>
        <li><span><b>Kalender Hijriah</b><small>Kalender Umm al-Qura bawaan perangkat (Intl)</small></span></li>
        <li><span><b>Asmaul Husna</b><small>github.com/wnr-code/asmaul_husna (MIT)</small></span></li>
        <li><span><b>Font Arab</b><small>Amiri Quran & Scheherazade New (SIL Open Font License)</small></span></li>
      </ul>
      <p class="hint">QuranKu tidak pernah membuat atau mengubah teks ayat, terjemahan, maupun tafsir. Bila Anda menemukan kekeliruan, mohon laporkan kepada pengembang dan rujuk mushaf cetak resmi.</p></section>
    <section class="card"><p class="eyebrow">Privasi</p>
      <p>Tidak ada akun, iklan, atau pelacakan. Data pribadi (bookmark, catatan, riwayat, lokasi) hanya tersimpan di perangkat Anda.</p>
      <div class="btn-row"><a class="btn" href="/privacy.html" target="_blank" rel="noopener">${icon('shield')}Kebijakan Privasi</a><a class="btn" href="#/infaq">${icon('heart')}Infaq pengembang</a></div></section>
  </div>`
}
