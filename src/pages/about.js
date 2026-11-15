import { pageHeader } from '../components/navbar.js'
import { LOGO_SVG, icon } from '../components/icons.js'
import { APP } from '../config.js'
import { SOURCES } from '../data/sources.js'
import { esc } from '../utils/helpers.js'

const sourceItem = (s) => `<li class="source-item">
  <div class="source-head"><b>${esc(s.name)}</b>${s.role ? `<span class="chip">${esc(s.role)}</span>` : ''}${s.license ? `<span class="chip chip-soft">${esc(s.license)}</span>` : ''}</div>
  <p>${esc(s.use)}</p>
  ${s.note ? `<p class="muted">${esc(s.note)}</p>` : ''}
  ${s.url ? `<a class="link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.host || s.url)}</a>` : ''}
</li>`

export default function about(root) {
  root.innerHTML = `<div class="page">${pageHeader('Tentang QuranKu')}
    <section class="card about-hero">${LOGO_SVG}<h2>${APP.name}</h2><p class="muted">Versi ${APP.version} · ${APP.packageId}</p>
      <p>Aplikasi Al-Qur'an digital gratis: mode baca mushaf, terjemahan, tafsir, murottal, dan dukungan offline.</p></section>

    <section class="sources" id="sumber-data">
      <h2 class="section-title">Sumber Data</h2>
      <p class="hint">QuranKu tidak pernah membuat atau mengubah teks ayat, terjemahan, tafsir, maupun doa. Semua konten berasal dari sumber di bawah ini dan ditampilkan apa adanya.</p>
      ${SOURCES.map((g) => `<div class="card source-group"><p class="eyebrow">${icon(g.icon)}${esc(g.group)}</p><ul class="source-list">${g.items.map(sourceItem).join('')}</ul></div>`).join('')}
      <p class="hint">Urutan pengambilan teks: salinan di perangkat → EQuran.id → Al Quran Cloud → data lokal. Sumber yang sedang dipakai selalu tertulis di menu Info pada halaman surah. Bila Anda menemukan kekeliruan, mohon laporkan kepada pengembang dan rujuk mushaf cetak resmi.</p>
    </section>

    <section class="card"><p class="eyebrow">Privasi</p>
      <p>Tidak ada akun, iklan, atau pelacakan. Data pribadi (bookmark, catatan, riwayat, lokasi) hanya tersimpan di perangkat Anda.</p>
      <div class="btn-row"><a class="btn" href="/privacy.html" target="_blank" rel="noopener">${icon('shield')}Kebijakan Privasi</a><a class="btn" href="#/infaq">${icon('heart')}Infaq pengembang</a></div></section>
  </div>`
}
