// Halaman perantara untuk peramban dalam aplikasi (WhatsApp, Instagram, dsb.).
// Peramban seperti itu menelan tautan https sehingga aplikasi tidak menerima intent;
// intent:// di bawah meminta Android membuka QuranKu, atau Play Store bila belum terpasang.
;(function () {
  var params = new URLSearchParams(location.search)
  var next = params.get('next') || '/'
  // Hanya jalur internal (tanpa ekstensi berkas) yang diterima, dan hanya dari alamat sendiri.
  var jalur = '/'
  try {
    var asal = new URL(next, location.origin)
    if (asal.origin === location.origin && !/\.[a-z0-9]+$/i.test(asal.pathname)) {
      jalur = asal.pathname.replace(/\/+$/, '') || '/'
      if (asal.search) jalur += asal.search
    }
  } catch (e) {
    jalur = '/'
  }
  var halaman = location.origin + jalur
  var paket = 'id.cgs.quranku'
  var play = 'https://play.google.com/store/apps/details?id=' + paket
  var intent =
    'intent://' +
    halaman.replace(/^https?:\/\//, '') +
    '#Intent;scheme=https;package=' +
    paket +
    ';S.browser_fallback_url=' +
    encodeURIComponent(play) +
    ';end'
  var ua = navigator.userAgent || ''
  var dalamAplikasi =
    /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|TikTok|Telegram|Twitter|MicroMessenger/i.test(ua) ||
    (/Android/i.test(ua) && /; wv\)/.test(ua))
  if (dalamAplikasi) document.body.classList.add('peramban-dalam')
  document.getElementById('buka-app').setAttribute('href', intent)
  document.getElementById('lanjut-web').setAttribute('href', jalur)
  document.getElementById('sumber').textContent = halaman
  // Di peramban biasa tautan https sudah bisa membuka aplikasi; intent:// tetap aman dipakai
  // dan jatuh ke Play Store bila aplikasi belum terpasang. Halaman tidak memaksa pindah
  // otomatis supaya pengguna tidak terjebak saat aplikasi belum dipasang.
  if (!dalamAplikasi) document.getElementById('petunjuk').hidden = false
})()
