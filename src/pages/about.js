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
        <li>Al-Qur'an 114 surah: mode Terjemahan, Mushaf, dan Halaman; transliterasi, terjemahan, tafsir, dan pencarian</li>
        <li>Murottal per ayat dan surah dari banyak qari; tandai teks, bookmark, catatan, riwayat, dan cadangan bacaan</li>
        <li>Jadwal salat, notifikasi azan, pengingat sebelum salat, serta imsak dan tarhim Ramadan</li>
        <li>Arah kiblat, kalender Hijriah dengan catatan/pengingat pribadi, dan tasbih digital</li>
        <li>Doa harian, doa wudhu, wirid &amp; doa usai salat, Tahlil &amp; Doa Arwah Lengkap (28 langkah), dan Asmaul Husna (99 nama)</li>
        <li>Target tilawah, statistik, pengingat; unduh teks, tafsir, dan audio pilihan untuk offline</li>
        <li>Kotak masuk lokal untuk pengumuman, pembaruan aplikasi, dan riwayat pengingat; PWA dapat dipasang</li>
        <li>Infaq sukarela tersedia di aplikasi; tidak ada fitur atau konten berbayar</li>
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
      <p class="about-privacy-copy">${native ? 'APK Android tidak mendaftar Web Push. Alarm salat/imsak, pengingat pra-salat, tilawah, target, dan catatan kalender dijadwalkan di perangkat melalui AlarmManager dalam jendela bergulir 14 hari. Notifikasi memerlukan izin; tanpa akses alarm tepat, Doze, force-stop, atau kebijakan OEM, pengiriman dapat tertunda atau terhambat. Rekaman azan panjang di-streaming dan memerlukan internet.' : 'Jika Web Push Adzan diaktifkan di PWA, langganan push, lokasi yang dibulatkan sekitar ±1 km, dan pilihan jadwal disimpan di server untuk mengirim pemberitahuan. Mematikan fitur menghapus langganan tersebut; Web Push tetap bergantung pada browser dan layanan push, bukan alarm presisi.'}</p>
      <p class="about-privacy-copy">Jika Anda membuka formulir infaq, Trakteer dan mitra pembayarannya menangani data formulir/pembayaran. Server QuranKu menerima data transaksi untuk papan donatur; nama tampilan dan ucapan yang Anda kirim dapat ditampilkan di sana.</p>
      <p class="about-privacy-copy">Jika Anda memakai fitur Bagikan, layanan atau aplikasi yang dipilih menerima konten yang Anda pilih (misalnya doa, ayat, atau tautan audio) beserta tautan terkait dari QuranKu.</p>
      <div class="btn-row about-privacy-actions"><a class="btn" href="/privacy.html" target="_blank" rel="noopener noreferrer">${icon('shield')}Kebijakan Privasi</a><a class="btn" href="#/infaq">${icon('heart')}Donasi</a></div></section>

    <section class="card about-identity-card">
      <figure>
        <img src="/cigatas-identity.png" width="1536" height="1024" loading="lazy" decoding="async" alt="Cigatas — #TongEureunNgaji" />
        <figcaption>Cigatas · #TongEureunNgaji</figcaption>
      </figure>
    </section>
  </div>`
}
