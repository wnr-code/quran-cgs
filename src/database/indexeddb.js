import { DB_NAME, DB_VERSION, MIGRATIONS } from './migrations.js'

let dbPromise

export function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB tidak didukung perangkat ini'))
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      for (let v = e.oldVersion; v < DB_VERSION; v++) MIGRATIONS[v](db, req.transaction)
    }
    req.onsuccess = () => {
      const db = req.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('Database sedang dipakai tab lain'))
  })
  dbPromise.catch(() => (dbPromise = null))
  return dbPromise
}

const wrap = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

async function store(name, mode = 'readonly') {
  const db = await openDB()
  return db.transaction(name, mode).objectStore(name)
}

export const idb = {
  async get(name, key) {
    return wrap((await store(name)).get(key))
  },
  async getAll(name) {
    return wrap((await store(name)).getAll())
  },
  async keys(name) {
    return wrap((await store(name)).getAllKeys())
  },
  async put(name, value, key) {
    return wrap((await store(name, 'readwrite')).put(value, key))
  },
  async delete(name, key) {
    return wrap((await store(name, 'readwrite')).delete(key))
  },
  async clear(name) {
    return wrap((await store(name, 'readwrite')).clear())
  },
  async count(name) {
    return wrap((await store(name)).count())
  },
  async bulkPut(name, values) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(name, 'readwrite')
      const s = tx.objectStore(name)
      for (const v of values) s.put(v)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }
}
