// Catatan & pengingat pada kalender. Disimpan HANYA di perangkat ini (localStorage), tidak dikirim ke server.
// Bentuk: { 'YYYY-MM-DD': [{ id, text, remind, time: 'HH:MM', fired }] }
const KEY = 'quranku:kalender'
const MAX_TEXT = 300
const MAX_PER_DAY = 20

export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}
function save(all) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
    return true
  } catch {
    return false
  }
}
const validTime = (t) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(t || '') ? t : '07:00')

export const notesOf = (key) => (load()[key] || []).slice()
/** Kumpulan kunci tanggal yang memiliki catatan, untuk menandai sel kalender. */
export const noteDays = () => {
  const all = load()
  const out = {}
  for (const k in all) if (all[k].length) out[k] = { count: all[k].length, remind: all[k].some((n) => n.remind) }
  return out
}

/** Menambah (tanpa id) atau mengubah (dengan id) catatan. @returns catatan tersimpan, atau null bila gagal/kosong */
export function saveNote(key, { id, text, remind = false, time = '07:00' }) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT)
  if (!clean || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null
  const all = load()
  const list = all[key] || (all[key] = [])
  let note = id && list.find((n) => n.id === id)
  if (!note) {
    if (list.length >= MAX_PER_DAY) return null
    note = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
    list.push(note)
  }
  const t = validTime(time)
  if (note.time !== t || !remind) delete note.fired // jam diubah → pengingat boleh berbunyi lagi
  Object.assign(note, { text: clean, remind: !!remind, time: t })
  return save(all) ? { ...note } : null
}

export function deleteNote(key, id) {
  const all = load()
  if (!all[key]) return
  all[key] = all[key].filter((n) => n.id !== id)
  if (!all[key].length) delete all[key]
  save(all)
}

/** Pengingat hari ini yang jamnya sudah tiba dan belum pernah ditampilkan. Menandainya sebagai sudah tampil. */
export function takeDueReminders(now = new Date()) {
  const all = load()
  const key = dayKey(now)
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const due = (all[key] || []).filter((n) => n.remind && !n.fired && n.time <= hm)
  if (!due.length) return []
  due.forEach((n) => (n.fired = 1))
  save(all)
  return due.map((n) => ({ ...n }))
}
