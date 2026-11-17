import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key)
}

const {
  compareAppVersions,
  getInboxItems,
  getInboxUnreadCount,
  isRemoteBuildNewer,
  markAllInboxRead,
  markInboxItemRead,
  recordAvailableUpdate,
  recordCurrentAppBuild,
  recordInboxReminder
} = await import('../src/services/inbox.js')

function reset() {
  store.clear()
}

test('kotak masuk menyimpan status baca berita dan pengingat per perangkat', async () => {
  reset()
  const first = await getInboxItems()
  const news = first.find((item) => item.id === 'content:tahlil-nu-online-v1')
  assert.ok(news)
  assert.equal(news.unread, true)
  assert.equal(await getInboxUnreadCount(), 1)

  const reminder = recordInboxReminder({
    id: 'web:goal:2026-11-14',
    title: 'Target tilawah hari ini',
    body: 'Target belum tercapai.',
    route: '/target',
    at: 1_794_600_000_000
  })
  assert.equal(reminder.route, '/target')
  recordInboxReminder({ ...reminder })
  assert.equal((await getInboxItems()).filter((item) => item.id === reminder.id).length, 1, 'ID reminder mencegah duplikat')
  assert.equal(await getInboxUnreadCount(), 2)

  await markInboxItemRead(reminder.id)
  assert.equal((await getInboxItems()).find((item) => item.id === reminder.id).unread, false)
  await markAllInboxRead()
  assert.equal(await getInboxUnreadCount(), 0)
  assert.ok((await getInboxItems()).every((item) => !item.unread))
})

test('pembaruan ditandai hanya bila versinya lebih baru dan tetap punya entri baca', async () => {
  reset()
  assert.equal(compareAppVersions('1.5.0', '1.4.99'), 1)
  assert.equal(compareAppVersions('1.4.15', '1.4.16'), -1)
  assert.equal(compareAppVersions('1.4.15', '1.4.15'), 0)
  assert.equal(isRemoteBuildNewer({ version: '0.9.0', number: '261114.1200' }), false)
  assert.equal(isRemoteBuildNewer({ version: '1.4.16', number: '261114.1200' }), true)
  assert.equal(recordAvailableUpdate({ version: '0.9.0', number: '261114.1200' }), false)
  assert.equal(recordAvailableUpdate({ version: '1.4.16', number: '261114.1200' }), true)
  const update = (await getInboxItems()).find((item) => item.type === 'update')
  assert.ok(update)
  assert.match(update.title, /tersedia/)
  assert.equal(update.unread, true)
  await markInboxItemRead(update.id)
  assert.equal((await getInboxItems()).find((item) => item.id === update.id).unread, false)
})

test('pembaruan build yang sudah terpasang diumumkan sekali dan tersimpan sebagai riwayat', async () => {
  reset()
  assert.equal(recordCurrentAppBuild(), false, 'instalasi pertama tidak dianggap pembaruan')
  const state = JSON.parse(store.get('quranku:inbox:v1'))
  state.installedBuild = { version: '0.9.0', build: '1' }
  store.set('quranku:inbox:v1', JSON.stringify(state))

  assert.equal(recordCurrentAppBuild(), true)
  assert.equal(recordCurrentAppBuild(), false, 'build yang sama tidak mengulang pengumuman')
  const update = (await getInboxItems()).find((item) => item.id.startsWith('installed:'))
  assert.ok(update)
  assert.equal(update.type, 'update')
  assert.equal(update.unread, true)
  await markInboxItemRead(update.id)
  const history = (await getInboxItems()).find((item) => item.id === update.id)
  assert.equal(history.unread, false)
  assert.equal(history.title, 'Aplikasi QuranKu diperbarui')
})

test('alamat tujuan reminder dibatasi ke rute internal dan data Tahlil punya rujukan khusus', async () => {
  reset()
  const reminder = recordInboxReminder({ id: 'unsafe-route', title: '<uji>', route: 'javascript:alert(1)' })
  assert.equal(reminder.route, '/', 'tautan eksternal/tidak aman tidak diteruskan ke router')

  const tahlil = JSON.parse(readFileSync('src/data/tahlil.json', 'utf8'))
  assert.equal(tahlil.source.url, 'https://quran.nu.or.id/tahlil')
  assert.equal(tahlil.source.variant, 'Lengkap')
  assert.equal(tahlil.items.length, 29, '28 sumber + Surah Yasin tambahan QuranKu')
  assert.equal(tahlil.items[3].title, 'Al-Fatihah untuk ahli kubur yang disebut namanya')
  assert.equal(tahlil.items[3].section, 'Tawassul')
  const yasin = tahlil.items.find((item) => item.surah === 36)
  assert.ok(yasin)
  assert.equal(yasin.step, 25)
  assert.equal(yasin.section, 'Bacaan Tambahan')
  assert.equal(yasin.title, 'Surah Yasin')
  assert.match(tahlil.source.note, /bukan bagian dari susunan sumber/)
  assert.equal(tahlil.items.filter((item) => !item.surah).length, 28)
  assert.equal(new Set(tahlil.items.map((item) => item.step)).size, tahlil.items.length)
  for (const item of tahlil.items.filter((item) => !item.surah)) {
    assert.ok(item.title && item.arabic && item.latin && item.translation, item.title)
    assert.match(item.arabic, /[\u0600-\u06FF]/, item.title)
  }

  const dzikir = JSON.parse(readFileSync('src/data/dzikir.json', 'utf8'))
  assert.ok(dzikir.salat.some((item) => item.title === 'Tahlil'), 'Tahlil ringkas usai salat tetap berada di rangkaian wirid')
  const doaPage = readFileSync('src/pages/doa.js', 'utf8')
  assert.match(doaPage, /kind === 'tahlil' \? TAHLIL\.items : DZIKIR\[kind\]/)
  assert.match(doaPage, /const total = \(kind === 'tahlil' \? TAHLIL\.items : DZIKIR\[kind\]\)\.length/)

  const more = readFileSync('src/pages/more.js', 'utf8')
  const home = readFileSync('src/pages/home.js', 'utf8')
  const sources = readFileSync('src/data/sources.js', 'utf8')
  const serviceWorker = readFileSync('sw.js', 'utf8')
  assert.match(more, /notificationBell\(\)/)
  assert.match(more, /doa\/tahlil/)
  assert.equal((sources.match(/url: 'https:\/\/quran\.nu\.or\.id\//g) || []).length, 2)
  assert.doesNotMatch(sources, /url: 'https:\/\/quran\.nu\.or\.id\/(?:doa|tahlil)/)
  assert.match(serviceWorker, /inboxOpen/)
  assert.doesNotMatch(home, /notificationBell|data-inbox-bell/, 'ikon lonceng tidak tampil di Beranda')
})
