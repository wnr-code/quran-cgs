import { pageHeader } from '../components/page-layout.js'
import { icon } from '../components/icons.js'
import { SOURCES } from '../data/sources.js'
import { esc, copyText, toast } from '../utils/helpers.js'

// Hanya tautan GitHub yang aktif; alamat sumber lain ditampilkan sebagai teks untuk disalin.
export const isGithub = (url) => /^https:\/\/github\.com\//.test(url || '')

const linkRow = (s) => {
  if (!s.url) return ''
  if (isGithub(s.url)) return `<a class="link src-gh" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.host || s.url)}</a>`
  return `<div class="src-url"><code>${esc(s.url)}</code><button class="btn btn-sm" type="button" data-copy="${esc(s.url)}" aria-label="Salin alamat ${esc(s.name)}">Salin</button></div>`
}

const sourceItem = (s) => `<li class="source-item">
  <div class="source-head"><b>${esc(s.name)}</b>${s.role ? `<span class="chip">${esc(s.role)}</span>` : ''}${s.license ? `<span class="chip chip-soft">${esc(s.license)}</span>` : ''}</div>
  <p>${esc(s.use)}</p>
  ${s.note ? `<p class="muted">${esc(s.note)}</p>` : ''}
  ${linkRow(s)}
</li>`

export default function sources(root) {
  root.innerHTML = `<div class="page">${pageHeader('Sumber Data')}
    <section class="card thanks-card">
      <p class="thanks-ar" lang="ar" dir="rtl">جَزَاكُمُ اللهُ خَيْرًا</p>
      <h2>Terima kasih</h2>
      <p>QuranKu berdiri di atas kerja banyak pihak. Kami mengucapkan terima kasih yang sebesar-besarnya kepada seluruh penyedia data, penyusun, penerjemah, qari, serta pembuat pustaka dan font yang tercantum di halaman ini. Semoga Allah membalas dengan kebaikan yang berlipat dan menjadikannya amal jariyah.</p>
    </section>
    <section class="sources" id="sumber-data">
      <p class="hint">QuranKu tidak pernah membuat atau mengubah teks ayat, terjemahan, tafsir, maupun doa. Semua konten berasal dari sumber di bawah ini dan ditampilkan apa adanya. Alamat sumber ditulis sebagai teks — ketuk <b>Salin</b> lalu tempel di peramban bila ingin mengunjunginya.</p>
      ${SOURCES.map((g) => `<div class="card source-group"><p class="eyebrow">${icon(g.icon)}${esc(g.group)}</p><ul class="source-list">${g.items.map(sourceItem).join('')}</ul></div>`).join('')}
      <p class="hint">Urutan pengambilan teks: salinan di perangkat → EQuran.id → Al Quran Cloud → data lokal di server QuranKu. Sumber yang sedang dipakai selalu tertulis di menu Info pada halaman surah. Bila Anda menemukan kekeliruan, mohon laporkan kepada pengembang dan rujuk mushaf cetak resmi.</p>
    </section>
    <div class="btn-row"><a class="btn" href="#/tentang">${icon('info')}Tentang QuranKu</a></div>
  </div>`
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]')
    if (!b) return
    toast((await copyText(b.dataset.copy)) ? 'Alamat disalin' : 'Gagal menyalin — salin manual dari teksnya')
  })
}
