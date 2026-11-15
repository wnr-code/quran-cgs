// Terapkan tema sebelum render pertama agar tidak berkedip (berkas terpisah agar CSP tanpa inline script).
try {
  var s = JSON.parse(localStorage.getItem('quranku:settings') || '{}')
  var t = s.theme || 'auto'
  if (t === 'auto') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = t
} catch (e) {}
