// Layar pembuka: isi ucapan sesuai waktu. Ditutup oleh aplikasi setelah halaman pertama siap (src/app.js);
// bila aplikasi gagal dimuat, CSS menutupnya sendiri setelah beberapa detik.
try {
  var h = new Date().getHours()
  var g = h < 4 ? 'Selamat malam' : h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'
  var el = document.getElementById('splash-greet')
  if (el) el.textContent = g + ' — selamat datang di QuranKu'
  window.__splashAt = Date.now()
} catch (e) {}
