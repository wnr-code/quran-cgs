// Web Push (RFC 8030/8291/8292) dengan WebCrypto saja — berjalan di Cloudflare Workers tanpa pustaka tambahan.
const enc = new TextEncoder()
export const b64u = (buf) => {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export const unb64u = (s) => {
  const t = atob(String(s).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(t.length)
  for (let i = 0; i < t.length; i++) out[i] = t.charCodeAt(i)
  return out
}
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

/** Layanan push yang dikenal — mencegah server dipakai mengirim permintaan ke alamat sembarang. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /\.push\.apple\.com$/, /^android\.googleapis\.com$/]
export function validEndpoint(endpoint) {
  try {
    const u = new URL(endpoint)
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname))
  } catch {
    return false
  }
}

/** Membuat pasangan kunci VAPID (P-256). */
export async function generateVapid() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey))
  return { publicKey: b64u(pub), privateJwk: jwk }
}

async function vapidAuth(endpoint, vapid, subject) {
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })))
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`))
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${vapid.publicKey}`
}

const hkdf = async (salt, ikm, info, len) =>
  new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), len * 8))

/** Mengenkripsi isi pesan untuk satu langganan (aes128gcm, RFC 8291). */
export async function encryptPayload(sub, payload) {
  const uaPub = unb64u(sub.p256dh)
  const auth = unb64u(sub.auth)
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey))
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256))
  const ikm = await hkdf(auth, secret, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const data = concat(enc.encode(typeof payload === 'string' ? payload : JSON.stringify(payload)), new Uint8Array([2]))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, data))
  return concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPub.length]), asPub, cipher)
}

/**
 * Mengirim satu pesan push.
 * @returns {Promise<{ok:boolean,status:number,gone:boolean}>} gone = langganan sudah tidak berlaku (hapus dari basis data)
 */
export async function sendPush(sub, payload, vapid, { ttl = 600, subject = 'mailto:admin@quran.cgs.my.id', fetchImpl = fetch } = {}) {
  if (!validEndpoint(sub.endpoint)) return { ok: false, status: 0, gone: true }
  try {
    const body = await encryptPayload(sub, payload)
    const res = await fetchImpl(sub.endpoint, {
      method: 'POST',
      headers: { Authorization: await vapidAuth(sub.endpoint, vapid, subject), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'high' },
      body
    })
    return { ok: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 404 || res.status === 410 }
  } catch {
    return { ok: false, status: 0, gone: false }
  }
}
