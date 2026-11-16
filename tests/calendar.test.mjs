// Kalender: keterangan hari & catatan/pengingat.
import test from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
const { dayKey, notesOf, noteDays, saveNote, deleteNote, takeDueReminders } = await import('../src/services/calendar-notes.js')
const { ISLAMIC_DAYS, islamicDayOf, dayNotes, toHijri, nextRamadan } = await import('../src/utils/hijri.js')

test('hari besar: semua punya keterangan; pencarian menurut tanggal Hijriah', () => {
  for (const d of ISLAMIC_DAYS) assert.ok(d.name && d.desc && d.desc.length > 40, d.name)
  assert.equal(islamicDayOf({ month: 10, day: 1 }).name, 'Idulfitri')
  assert.equal(islamicDayOf({ month: 2, day: 2 }), null)
})

test('hitung mundur Ramadan: tanggal awal puasa berikutnya dan hitungan hari inklusif', () => {
  const today = new Date(2026, 10, 16)
  const next = nextRamadan(today)
  assert.ok(next && next.days > 0 && next.days <= 400)
  assert.equal(toHijri(next.date).month, 9)
  assert.equal(toHijri(next.date).day, 1)
  assert.equal(nextRamadan(next.date).days, 0)
  const followingDay = new Date(next.date.getFullYear(), next.date.getMonth(), next.date.getDate() + 1)
  assert.ok(nextRamadan(followingDay).days > 0)
  assert.equal(nextRamadan(today, 0, 0), null)
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

test('pasaran Jawa: cocok dengan tanggal-tanggal acuan', async () => {
  const { weton, pasaranOf, PASARAN } = await import('../src/utils/javanese.js')
  assert.equal(weton(new Date(1945, 7, 17)), 'Jumat Legi') // Proklamasi
  assert.equal(weton(new Date(1901, 5, 6)), 'Kamis Pon')
  assert.equal(weton(new Date(1970, 0, 1)), 'Kamis Wage')
  assert.equal(weton(new Date(2024, 1, 14)), 'Rabu Legi')
  // berurutan tanpa putus, juga melewati pergantian tahun & tahun kabisat
  let d = new Date(2027, 11, 28)
  let i = PASARAN.indexOf(pasaranOf(d))
  for (let n = 0; n < 80; n++) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    i = (i + 1) % 5
    assert.equal(pasaranOf(d), PASARAN[i])
  }
})

test('libur nasional: 2026 & 2027 sesuai SKB; tahun lain perkiraan', async () => {
  const { holidayOf, easter, hasOfficial } = await import('../src/data/libur-nasional.js')
  const h = (y, m, d) => holidayOf(new Date(y, m - 1, d))
  assert.ok(hasOfficial(2026) && hasOfficial(2027) && !hasOfficial(2031))
  assert.deepEqual(h(2026, 3, 21), { name: 'Idulfitri 1447 H', type: 'libur', official: true })
  assert.equal(h(2026, 12, 25).name, 'Kelahiran Yesus Kristus (Natal)')
  assert.equal(h(2026, 11, 16), null)
  assert.equal(h(2027, 3, 8).name, 'Hari Suci Nyepi (Tahun Baru Saka 1949)')
  assert.equal(h(2027, 5, 20).name, 'Hari Raya Waisak 2571 BE')
  assert.equal(h(2027, 3, 9).type, 'cuti')
  assert.equal(h(2027, 12, 26).type, 'libur')
  let n26 = 0
  let n27 = 0
  let c27 = 0
  for (let d = new Date(2026, 0, 1); d.getFullYear() < 2028; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const x = holidayOf(d)
    if (!x) continue
    if (d.getFullYear() === 2026) n26++
    else if (x.type === 'cuti') c27++
    else n27++
  }
  assert.deepEqual([n26, n27, c27], [17, 18, 8])
  // Paskah hasil hitungan sama dengan SKB (2026: 5 April, 2027: 28 Maret)
  assert.deepEqual([easter(2026).getMonth(), easter(2026).getDate(), easter(2027).getMonth(), easter(2027).getDate()], [3, 5, 2, 28])
  const est = h(2031, 8, 17)
  assert.deepEqual(est, { name: 'Proklamasi Kemerdekaan RI', type: 'libur', official: false })
})
