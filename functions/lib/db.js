// Skema D1 dibuat otomatis saat pertama dipakai (tidak perlu menjalankan SQL manual).
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT '', quantity INTEGER NOT NULL DEFAULT 1,
    amount INTEGER NOT NULL DEFAULT 0, type TEXT NOT NULL DEFAULT 'tip', is_test INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, source TEXT NOT NULL DEFAULT 'webhook', message TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS idx_donations_created ON donations (created_at)`,
  `CREATE TABLE IF NOT EXISTS infaq_intents (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, quantity INTEGER NOT NULL, amount INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'redirect', status TEXT NOT NULL DEFAULT 'pending', ref TEXT,
    donation_id TEXT UNIQUE, ip TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_intents_created ON infaq_intents (created_at)`,
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS push_subs (
    endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
    method TEXT NOT NULL DEFAULT 'kemenag', tz TEXT NOT NULL DEFAULT 'Asia/Jakarta', place TEXT NOT NULL DEFAULT '',
    hijri_adjust INTEGER NOT NULL DEFAULT 0, prefs TEXT NOT NULL DEFAULT '{}', last_id TEXT, updated_at INTEGER NOT NULL)`
]

const ready = new WeakSet()

export async function ensureSchema(db) {
  if (ready.has(db)) return
  for (const sql of STATEMENTS) await db.prepare(sql).run()
  // Tabel lama (dibuat dari migrations/0001) belum punya kolom `source`.
  try {
    await db.prepare(`ALTER TABLE donations ADD COLUMN source TEXT NOT NULL DEFAULT 'webhook'`).run()
  } catch {
    /* kolom sudah ada */
  }
  // Pesan/doa yang ditulis donatur di formulir Trakteer (ditampilkan di papan donatur).
  try {
    await db.prepare(`ALTER TABLE donations ADD COLUMN message TEXT NOT NULL DEFAULT ''`).run()
  } catch {
    /* kolom sudah ada */
  }
  ready.add(db)
}

export const metaGet = async (db, k) => (await db.prepare('SELECT v, at FROM meta WHERE k = ?1').bind(k).first()) || null
export const metaSet = (db, k, v, at = Date.now()) => db.prepare('INSERT INTO meta (k, v, at) VALUES (?1, ?2, ?3) ON CONFLICT(k) DO UPDATE SET v = ?2, at = ?3').bind(k, String(v), at).run()

const DUP_WINDOW = 10 * 60 * 1000

/**
 * Menyimpan satu donasi. Mencegah hitung ganda bila transaksi yang sama datang dari dua jalur
 * (webhook & Public API) dengan ID berbeda: nominal sama + nama sama (atau nama tidak diketahui) + waktu berdekatan.
 * @returns {Promise<boolean>} true bila baris baru ditambahkan
 */
export async function insertDonation(db, d, source) {
  const msg = d.message || ''
  const exists = await db.prepare('SELECT id FROM donations WHERE id = ?1').bind(d.id).first()
  if (exists) {
    if (msg) await db.prepare(`UPDATE donations SET message = ?2 WHERE id = ?1 AND message = ''`).bind(d.id, msg).run()
    return false
  }
  const twin = await db
    .prepare(`SELECT id FROM donations WHERE source != ?1 AND amount = ?2 AND ABS(created_at - ?3) < ?4 AND (LOWER(name) = LOWER(?5) OR ?6 = 1) LIMIT 1`)
    .bind(source, d.amount, d.created_at, DUP_WINDOW, d.name, d.nameUnknown ? 1 : 0)
    .first()
  if (twin) {
    // Jalur lain sudah mencatat transaksi ini lebih dulu; lengkapi pesannya bila belum ada.
    if (msg) await db.prepare(`UPDATE donations SET message = ?2 WHERE id = ?1 AND message = ''`).bind(twin.id, msg).run()
    return false
  }
  await db
    .prepare('INSERT OR IGNORE INTO donations (id, name, unit, quantity, amount, type, is_test, created_at, source, message) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)')
    .bind(d.id, d.name, d.unit || '', d.quantity || 1, d.amount, d.type || 'tip', d.is_test ? 1 : 0, d.created_at, source, msg)
    .run()
  return true
}

export const cleanText = (v, max) =>
  String(v ?? '')
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .trim()
    .slice(0, max)

export const json = (obj, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } })
