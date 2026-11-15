// Terapkan tema sebelum render pertama agar tidak berkedip (berkas terpisah agar CSP tanpa inline script).
try {
  var s = JSON.parse(localStorage.getItem('quranku:settings') || '{}')
  var t = s.theme || 'auto'
  if (t === 'custom') {
    // Variabel tema kustom sudah dihitung & disimpan aplikasi (src/services/storage.js).
    var c = JSON.parse(localStorage.getItem('quranku:theme-vars') || 'null')
    t = c && c.base === 'dark' ? 'dark' : 'light'
    if (c && c.vars) for (var k in c.vars) if (/^--[a-z0-9-]+$/.test(k) && /^#[0-9a-f]{6}$/i.test(c.vars[k])) document.documentElement.style.setProperty(k, c.vars[k])
  } else if (t === 'auto') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = t
} catch (e) {}
