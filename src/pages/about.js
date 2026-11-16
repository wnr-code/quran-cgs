import { pageHeader } from '../components/page-layout.js'
import { LOGO_SVG, icon } from '../components/icons.js'
import { APP } from '../config.js'
import { esc } from '../utils/helpers.js'
import { isNativePlatform } from '../services/platform.js'

export default function about(root) {
  const native = isNativePlatform()
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
        <li>Doa harian per kategori, doa wudhu, wirid &amp; doa usai salat, Asmaul Husna, tasbih digital</li>
        <li>Target tilawah dan statistik; bisa dipasang dan dipakai offline</li>
      </ul></section>

    <section class="card"><p class="eyebrow">Sumber data</p>
      <p>Seluruh teks ayat, terjemahan, tafsir, doa, audio, dan data lain berasal dari pihak yang kami sebutkan satu per satu. Terima kasih kepada semuanya — <i>jazakumullahu khairan</i>.</p>
      <div class="btn-row"><a class="btn" href="#/sumber">${icon('book')}Lihat Sumber Data</a></div></section>

    <section class="card" id="lisensi"><p class="eyebrow">Lisensi</p>
      <p><b>QuranKu adalah perangkat lunak sumber terbuka berlisensi MIT.</b> Siapa pun boleh memakai, menyalin, mengubah, dan menyebarkan kode aplikasi ini, termasuk untuk tujuan komersial, selama menyertakan pemberitahuan hak cipta dan teks lisensi. Perangkat lunak disediakan “apa adanya” tanpa jaminan apa pun.</p>
      <p class="muted">Lisensi MIT hanya berlaku untuk kode QuranKu. Teks Al-Qur'an, terjemahan, tafsir, doa, audio, font, dan pustaka pihak ketiga tetap mengikuti ketentuan pemiliknya masing-masing sebagaimana tercantum di halaman Sumber Data.</p>
      <p class="muted">${esc(APP.copyright)}</p>
      <div class="btn-row"><a class="btn" href="${APP.repo}" target="_blank" rel="noopener noreferrer">${icon('grid')}Kode sumber</a><a class="btn" href="${APP.repo}/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">${icon('shield')}Teks lisensi MIT</a></div></section>

    <section class="card"><p class="eyebrow">Privasi</p>
      <p>${native ? 'Tidak ada akun, iklan, atau pelacakan. Bookmark, catatan, tanda, riwayat, pengaturan, dan lokasi tersimpan di perangkat. APK Android tidak memakai Web Push atau notifikasi sistem; adzan dan pengingat hanya tampil di dalam aplikasi saat QuranKu terbuka.' : 'Tidak ada akun, iklan, atau pelacakan. Bookmark, catatan, tanda, riwayat, dan pengaturan tersimpan di perangkat. Jika Adzan otomatis berbasis Web Push diaktifkan, langganan pemberitahuan dan koordinat lokasi yang dibulatkan ±1 km disimpan di server agar pemberitahuan dapat dikirim; mematikannya menghapus langganan tersebut.'}</p>
      <div class="btn-row"><a class="btn" href="/privacy.html" target="_blank" rel="noopener">${icon('shield')}Kebijakan Privasi</a><a class="btn" href="#/infaq">${icon('heart')}Infaq pengembang</a></div></section>
  </div>`
}
