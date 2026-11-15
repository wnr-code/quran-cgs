import { DatabaseSync } from 'node:sqlite'

/** Tiruan tipis antarmuka D1 di atas SQLite (mesin yang sama dengan D1). Skema dibuat oleh ensureSchema. */
export function fakeD1() {
  const db = new DatabaseSync(':memory:')
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => ({ success: true, meta: db.prepare(sql).run(...args) }),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) ?? null
  })
  return { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.all())), _db: db }
}
