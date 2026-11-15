const pad = (n) => String(n).padStart(2, '0')

/** Kunci tanggal lokal "YYYY-MM-DD" */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`
}

export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec % 60)
  const m = Math.floor(sec / 60) % 60
  const h = Math.floor(sec / 3600)
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function formatClock(d) {
  return d instanceof Date && !isNaN(d) ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '--:--'
}

export function formatGregorian(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
  } catch {
    return d.toDateString()
  }
}

export function formatDateTime(ts) {
  try {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}

export function formatRupiah(n) {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
  } catch {
    return 'Rp' + (n || 0)
  }
}

export function tempatTurunLabel(v) {
  const s = String(v || '').toLowerCase()
  if (s.startsWith('mek') || s.startsWith('mec')) return 'Makkiyah'
  if (s.startsWith('mad') || s.startsWith('med')) return 'Madaniyah'
  return v || ''
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 4) return 'Selamat malam'
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}
