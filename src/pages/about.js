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
        <li>Jadwal salat, imsak &amp; buka puasa, adzan otomatis, arah kiblat, kalender Hijriah</li>
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

    <section class="card about-privacy-card"><p class="eyebrow">Privasi</p>
      <p class="about-privacy-copy">QuranKu tidak memerlukan akun, tidak menampilkan iklan, dan tidak memasang pelacak iklan atau analitik. Bookmark, catatan, tanda, riwayat, progres, pengaturan, dan lokasi pilihan disimpan di perangkat.</p>
      <p class="about-privacy-copy">Jika Anda menekan “Gunakan lokasi saya”, koordinat GPS dikirim langsung ke OpenStreetMap Nominatim untuk mencari nama wilayah. Nominatim dapat menerima alamat IP dan informasi teknis permintaan; QuranKu tidak menerima koordinat dari permintaan itu.</p>
      <p class="about-privacy-copy">${native ? 'APK Android tidak mendaftar Web Push. Jadwal salat memakai alarm dan notifikasi Android native yang dihitung di perangkat dalam jendela bergulir 14 hari; izin notifikasi dan, bila tersedia, alarm tepat dikendalikan Android. Doze/kebijakan OEM dapat menunda alarm. Pengingat kalender dan target bacaan tetap hanya berjalan saat QuranKu terbuka. Rekaman azan panjang di-streaming dan memerlukan internet.' : 'Jika Web Push Adzan diaktifkan di PWA, langganan push, lokasi yang dibulatkan sekitar ±1 km, dan pilihan jadwal disimpan di server untuk mengirim pemberitahuan. Mematikan fitur menghapus langganan tersebut; Web Push tetap bergantung pada browser dan layanan push, bukan alarm presisi.'}</p>
      <p class="about-privacy-copy">Jika Anda membuka formulir infaq, Trakteer dan mitra pembayarannya menangani data formulir/pembayaran. Server QuranKu menerima data transaksi untuk papan donatur; nama tampilan dan ucapan yang Anda kirim dapat ditampilkan di sana.</p>
      <p class="about-privacy-copy">Jika Anda memakai fitur Bagikan, layanan yang dipilih menerima teks doa dan tautan QuranKu yang disiapkan untuk Anda.</p>
      <div class="btn-row about-privacy-actions"><a class="btn" href="/privacy.html" target="_blank" rel="noopener noreferrer">${icon('shield')}Kebijakan Privasi</a><a class="btn" href="#/infaq">${icon('heart')}Donasi</a></div></section>

    <section class="card about-identity-card">
      <figure>
        <img src="/cigatas-identity.png" width="1212" height="512" loading="lazy" decoding="async" alt="Cigatas — #TongEureunNgaji" />
        <figcaption>Cigatas · #TongEureunNgaji</figcaption>
      </figure>
    </section>
  </div>`
}
