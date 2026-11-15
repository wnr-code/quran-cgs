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
    <section class="card about-hero">${LOGO_SVG}<h2>${APP.name}</h2><p class="muted">Versi <span data-version>${esc(APP.versionLabel)}</span><br />${APP.packageId}</p>
      <p>Aplikasi Al-Qur'an digital berbahasa Indonesia: gratis, tanpa iklan, tanpa akun, dan sumber terbuka.</p>
      <p class="muted">${esc(APP.copyright)} · Lisensi ${esc(APP.license)}</p></section>

    <section class="card"><p class="eyebrow">Fitur</p>
      <ul class="about-list">
        <li>Al-Qur'an 114 surah: mode Mushaf, Halaman, dan Terjemahan; tafsir; pencarian</li>
        <li>Tandai teks, bookmark, catatan, dan posisi bacaan terakhir</li>
        <li>Murottal per ayat dan per surah dengan banyak qari</li>
        <li>Jadwal salat, adzan otomatis, arah kiblat, kalender Hijriah</li>
        <li>Doa harian, wirid setelah salat, Asmaul Husna, tasbih digital</li>
        <li>Target tilawah dan statistik; bisa dipasang dan dipakai offline</li>
      </ul></section>

    <section class="sources" id="sumber-data">
      <h2 class="section-title">Sumber Data</h2>
      <p class="hint">QuranKu tidak pernah membuat atau mengubah teks ayat, terjemahan, tafsir, maupun doa. Semua konten berasal dari sumber di bawah ini dan ditampilkan apa adanya.</p>
      ${SOURCES.map((g) => `<div class="card source-group"><p class="eyebrow">${icon(g.icon)}${esc(g.group)}</p><ul class="source-list">${g.items.map(sourceItem).join('')}</ul></div>`).join('')}
      <p class="hint">Urutan pengambilan teks: salinan di perangkat → EQuran.id → Al Quran Cloud → data lokal di server QuranKu. Sumber yang sedang dipakai selalu tertulis di menu Info pada halaman surah. Bila Anda menemukan kekeliruan, mohon laporkan kepada pengembang dan rujuk mushaf cetak resmi.</p>
    </section>

    <section class="card" id="lisensi"><p class="eyebrow">Lisensi</p>
      <p><b>QuranKu adalah perangkat lunak sumber terbuka berlisensi MIT.</b> Siapa pun boleh memakai, menyalin, mengubah, dan menyebarkan kode aplikasi ini, termasuk untuk tujuan komersial, selama menyertakan pemberitahuan hak cipta dan teks lisensi. Perangkat lunak disediakan “apa adanya” tanpa jaminan apa pun.</p>
      <p class="muted">Lisensi MIT hanya berlaku untuk kode QuranKu. Teks Al-Qur'an, terjemahan, tafsir, doa, audio, font, dan pustaka pihak ketiga tetap mengikuti ketentuan pemiliknya masing-masing sebagaimana tercantum di Sumber Data.</p>
      <p class="muted">${esc(APP.copyright)}</p>
      <div class="btn-row"><a class="btn" href="${APP.repo}" target="_blank" rel="noopener noreferrer">${icon('grid')}Kode sumber</a><a class="btn" href="${APP.repo}/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">${icon('shield')}Teks lisensi MIT</a></div></section>

    <section class="card"><p class="eyebrow">Privasi</p>
      <p>Tidak ada akun, iklan, atau pelacakan. Bookmark, catatan, tanda, riwayat, dan pengaturan hanya tersimpan di perangkat Anda. Bila Adzan otomatis dinyalakan, alamat langganan pemberitahuan dan koordinat lokasi salat (dibulatkan ±1 km) disimpan di server agar pemberitahuan dapat dikirim; mematikannya menghapus langganan tersebut.</p>
      <div class="btn-row"><a class="btn" href="/privacy.html" target="_blank" rel="noopener">${icon('shield')}Kebijakan Privasi</a><a class="btn" href="#/infaq">${icon('heart')}Infaq pengembang</a></div></section>
  </div>`
}
