// Kalender: keterangan hari & catatan/pengingat.
import test from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
const { dayKey, notesOf, noteDays, saveNote, deleteNote, takeDueReminders } = await import('../src/services/calendar-notes.js')
const { ISLAMIC_DAYS, islamicDayOf, dayNotes } = await import('../src/utils/hijri.js')

test('hari besar: semua punya keterangan; pencarian menurut tanggal Hijriah', () => {
  for (const d of ISLAMIC_DAYS) assert.ok(d.name && d.desc && d.desc.length > 40, d.name)
  assert.equal(islamicDayOf({ month: 10, day: 1 }).name, 'Idulfitri')
  assert.equal(islamicDayOf({ month: 2, day: 2 }), null)
})

test('keterangan amalan: Senin/Kamis, Ayyamul Bidh, tanpa anjuran puasa di hari terlarang & Ramadan', () => {
  const mon = new Date(2026, 10, 16) // Senin
  const labels = (date, h) => dayNotes(date, h).map((x) => x.label)
  assert.deepEqual(labels(mon, { month: 5, day: 6 }), ['Puasa sunnah Senin'])
  assert.deepEqual(labels(mon, { month: 5, day: 14 }), ['Ayyamul Bidh', 'Puasa sunnah Senin'])
  assert.deepEqual(labels(mon, { month: 10, day: 1 }), []) // Idulfitri
  assert.deepEqual(labels(mon, { month: 12, day: 10 }), []) // Iduladha
  assert.deepEqual(labels(mon, { month: 12, day: 13 }), ['Hari tasyrik'])
  assert.deepEqual(labels(mon, { month: 9, day: 14 }), ['Puasa Ramadan'])
})

test('catatan: simpan, ubah, hapus, batas, dan pengingat sekali saja', () => {
  const key = dayKey(new Date(2026, 10, 16))
  assert.equal(key, '2026-11-16')
  assert.equal(saveNote(key, { text: '   ' }), null)
  assert.equal(saveNote('bukan-tanggal', { text: 'x' }), null)
  const a = saveNote(key, { text: '  Kajian   subuh ', remind: true, time: '05:30' })
  assert.equal(a.text, 'Kajian subuh')
  const b = saveNote(key, { text: 'Tanpa pengingat', time: '99:99' })
  assert.equal(b.time, '07:00')
  assert.deepEqual(noteDays()[key], { count: 2, remind: true })
  // belum waktunya → tidak ada; sudah lewat → muncul sekali
  assert.deepEqual(takeDueReminders(new Date(2026, 10, 16, 5, 29)), [])
  assert.deepEqual(takeDueReminders(new Date(2026, 10, 15, 23, 0)), []) // hari lain
  assert.equal(takeDueReminders(new Date(2026, 10, 16, 8, 0))[0].text, 'Kajian subuh')
  assert.deepEqual(takeDueReminders(new Date(2026, 10, 16, 9, 0)), [])
  // jam diubah → boleh mengingatkan lagi
  saveNote(key, { id: a.id, text: 'Kajian subuh', remind: true, time: '10:00' })
  assert.equal(takeDueReminders(new Date(2026, 10, 16, 10, 0)).length, 1)
  assert.equal(notesOf(key).length, 2)
  deleteNote(key, a.id)
  deleteNote(key, b.id)
  assert.equal(noteDays()[key], undefined)
  for (let i = 0; i < 20; i++) assert.ok(saveNote(key, { text: 'n' + i }))
  assert.equal(saveNote(key, { text: 'ke-21' }), null)
})
