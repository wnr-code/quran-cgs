import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fakeD1 } from './helpers.mjs'
import { ensureSchema } from '../functions/lib/db.js'
import { generateVapid, encryptPayload, sendPush, validEndpoint, b64u, unb64u } from '../functions/lib/webpush.js'
import { eventsFor, dueEvents, pushDue, getVapid } from '../functions/lib/adzan.js'
import { onSubscribe, onUnsubscribe, onKey } from '../functions/api/push.js'

const enc = new TextEncoder()
const hkdf = async (salt, ikm, info, len) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), len * 8))
const cat = (...p) => {
  const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0))
  let i = 0
  for (const x of p) (o.set(x, i), (i += x.length))
  return o
}

/** Peramban tiruan: pasangan kunci langganan + pembuka sandi RFC 8291 (sisi penerima). */
async function fakeBrowser() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))
  const auth = crypto.getRandomValues(new Uint8Array(16))
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: b64u(pub), auth: b64u(auth) }
  async function decrypt(body) {
    const salt = body.slice(0, 16)
    const idlen = body[20]
    const asPub = body.slice(21, 21 + idlen)
    const cipher = body.slice(21 + idlen)
    const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
    const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, kp.privateKey, 256))
    const ikm = await hkdf(auth, secret, cat(enc.encode('WebPush: info\0'), pub, asPub), 32)
    const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
    const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cipher))
    assert.equal(plain[plain.length - 1], 2, 'pembatas rekaman terakhir')
    return new TextDecoder().decode(plain.slice(0, -1))
  }
  return { sub, decrypt }
}

test('web push: isi terenkripsi dapat dibuka penerima (RFC 8291) & tanda tangan VAPID sah', async () => {
  const br = await fakeBrowser()
  const body = await encryptPayload(br.sub, { title: 'Waktu Subuh', n: 1 })
  assert.deepEqual([...body.slice(16, 20)], [0, 0, 16, 0])
  assert.deepEqual(JSON.parse(await br.decrypt(body)), { title: 'Waktu Subuh', n: 1 })

  const vapid = await generateVapid()
  assert.equal(unb64u(vapid.publicKey).length, 65)
  let seen
  const r = await sendPush(br.sub, { a: 1 }, vapid, { fetchImpl: async (url, init) => ((seen = { url, init }), new Response('', { status: 201 })) })
  assert.deepEqual(r, { ok: true, status: 201, gone: false })
  assert.equal(seen.init.headers['Content-Encoding'], 'aes128gcm')
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(seen.init.headers.Authorization)
  assert.ok(m)
  const claims = JSON.parse(new TextDecoder().decode(unb64u(m[2])))
  assert.equal(claims.aud, 'https://fcm.googleapis.com')
  assert.ok(claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 24 * 3600)
  const key = await crypto.subtle.importKey('raw', unb64u(m[4]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64u(m[3]), enc.encode(`${m[1]}.${m[2]}`)))
  assert.deepEqual(JSON.parse(await br.decrypt(new Uint8Array(seen.init.body))), { a: 1 })

  assert.equal((await sendPush(br.sub, {}, vapid, { fetchImpl: async () => new Response('', { status: 410 }) })).gone, true)
  assert.equal(validEndpoint('https://evil.example/push'), false)
  assert.equal(validEndpoint('http://fcm.googleapis.com/x'), false)
  assert.equal(validEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x'), true)
})

const JKT = { lat: -6.2, lng: 106.82, method: 'kemenag', tz: 'Asia/Jakarta', place: 'Jakarta', hijriAdjust: 0, prefs: {} }
const wib = (t) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(t)

test('jadwal adzan server: lima waktu pada tanggal lokal pelanggan; imsak & tarhim hanya Ramadan', () => {
  // 15 Nov 2026 12:00 WIB (bukan Ramadan)
  const ev = eventsFor(JKT, new Date('2026-11-15T05:00:00Z'))
  assert.deepEqual(ev.map((e) => e.key), ['subuh', 'zuhur', 'asar', 'magrib', 'isya'])
  const h = Object.fromEntries(ev.map((e) => [e.key, wib(e.time)]))
  assert.match(h.subuh, /^04:0\d$/)
  assert.match(h.zuhur, /^11:[34]\d$/)
  assert.match(h.magrib, /^17:[45]\d$/)
  assert.match(ev[0].body, /Jakarta/)
  // Menjelang tengah malam UTC tanggal lokal sudah berganti: 23:30 UTC = 06:30 WIB esok hari.
  assert.match(eventsFor(JKT, new Date('2026-11-15T23:30:00Z'))[0].id, /^2026-11-16\|subuh$/)
  // Ramadan 1448 H (Umm al-Qura): 20 Feb 2027 termasuk di dalamnya.
  const rm = eventsFor(JKT, new Date('2027-02-20T05:00:00Z'))
  assert.deepEqual(rm.map((e) => e.key), ['tarhim', 'imsak', 'subuh', 'zuhur', 'asar', 'magrib', 'isya'])
  assert.equal(rm[2].time - rm[1].time, 10 * 60000)
  assert.equal(rm[2].time - rm[0].time, 15 * 60000)
  // Pilihan pengguna dihormati.
  const off = eventsFor({ ...JKT, prefs: { prayers: { zuhur: false }, imsak: false, tarhim: false } }, new Date('2027-02-20T05:00:00Z'))
  assert.deepEqual(off.map((e) => e.key), ['subuh', 'asar', 'magrib', 'isya'])
  // Jatuh tempo hanya dalam jendela singkat setelah waktunya.
  const magrib = ev.find((e) => e.key === 'magrib').time
  assert.deepEqual(dueEvents(JKT, new Date(magrib.getTime() + 20000)).map((e) => e.key), ['magrib'])
  assert.deepEqual(dueEvents(JKT, new Date(magrib.getTime() - 20000)), [])
  assert.deepEqual(dueEvents(JKT, new Date(magrib.getTime() + 5 * 60000)), [])
})

test('langganan push & cron: simpan, kirim sekali per waktu salat, hapus langganan mati', async () => {
  const env = { DB: fakeD1() }
  await ensureSchema(env.DB)
  const key = await (await onKey({ env })).json()
  assert.equal(key.ok, true)
  assert.equal((await getVapid(env)).publicKey, key.key, 'kunci VAPID tetap sama')
  const br = await fakeBrowser()
  const req = (body) => ({ env, request: new Request('https://x/api/push/subscribe', { method: 'POST', body: JSON.stringify(body) }) })
  const body = { subscription: { endpoint: br.sub.endpoint, keys: { p256dh: br.sub.p256dh, auth: br.sub.auth } }, lat: -6.2088, lng: 106.8456, method: 'kemenag', tz: 'Asia/Jakarta', place: 'Jakarta<script>', prefs: { prayers: { asar: false } } }
  assert.equal((await onSubscribe(req({ ...body, subscription: { ...body.subscription, endpoint: 'https://evil.example/x' } }))).status, 400)
  assert.equal((await onSubscribe(req({ ...body, lat: 999 }))).status, 400)
  assert.equal((await (await onSubscribe(req(body))).json()).ok, true)
  assert.equal((await (await onSubscribe(req({ ...body, tz: 'Bukan/Zona' }))).json()).ok, true) // perbarui, bukan gandakan
  const row = env.DB._db.prepare('SELECT * FROM push_subs').all()
  assert.equal(row.length, 1)
  assert.equal(row[0].lat, -6.21) // koordinat dibulatkan
  assert.equal(row[0].tz, 'Asia/Jakarta')
  assert.equal(row[0].place, 'Jakartascript')
  assert.equal(JSON.parse(row[0].prefs).prayers.asar, false)

  const magrib = eventsFor(JKT, new Date('2026-11-15T05:00:00Z')).find((e) => e.key === 'magrib').time
  const sent = []
  const fetchImpl = async (url, init) => (sent.push(JSON.parse(await br.decrypt(new Uint8Array(init.body)))), new Response('', { status: 201 }))
  assert.deepEqual(await pushDue(env, new Date(magrib.getTime() - 60000), { fetchImpl }), { sent: 0, removed: 0 })
  assert.deepEqual(await pushDue(env, new Date(magrib.getTime() + 5000), { fetchImpl }), { sent: 1, removed: 0 })
  assert.deepEqual(await pushDue(env, new Date(magrib.getTime() + 65000), { fetchImpl }), { sent: 0, removed: 0 }) // tidak dobel
  assert.equal(sent.length, 1)
  assert.equal(sent[0].key, 'magrib')
  assert.equal(sent[0].title, 'Waktu Magrib')
  // Asar dimatikan pengguna → tidak dikirim.
  const asar = new Date(magrib.getTime() - 3 * 3600000)
  for (let m = -30; m <= 30; m++) await pushDue(env, new Date(asar.getTime() + m * 60000), { fetchImpl })
  assert.equal(sent.length, 1)
  // Langganan yang sudah tidak berlaku (410) dihapus.
  const isya = eventsFor(JKT, new Date('2026-11-15T05:00:00Z')).find((e) => e.key === 'isya').time
  assert.deepEqual(await pushDue(env, new Date(isya.getTime() + 1000), { fetchImpl: async () => new Response('', { status: 410 }) }), { sent: 0, removed: 1 })
  assert.equal(env.DB._db.prepare('SELECT COUNT(*) c FROM push_subs').get().c, 0)
  // Berhenti berlangganan.
  await onSubscribe(req(body))
  assert.equal((await (await onUnsubscribe({ env, request: new Request('https://x', { method: 'POST', body: JSON.stringify({ endpoint: br.sub.endpoint }) }) })).json()).ok, true)
  assert.equal(env.DB._db.prepare('SELECT COUNT(*) c FROM push_subs').get().c, 0)
})
