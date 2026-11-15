// Skema IndexedDB QuranKu. Tambahkan langkah baru di akhir array untuk versi berikutnya.
export const DB_NAME = 'quranku'

export const MIGRATIONS = [
  // v1
  (db) => {
    db.createObjectStore('kv')
    db.createObjectStore('surahs', { keyPath: 'nomor' })
    db.createObjectStore('tafsir', { keyPath: 'nomor' })
    const b = db.createObjectStore('bookmarks', { keyPath: 'id' })
    b.createIndex('category', 'category')
    b.createIndex('createdAt', 'createdAt')
    db.createObjectStore('notes', { keyPath: 'id' })
    const h = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true })
    h.createIndex('at', 'at')
    db.createObjectStore('progress', { keyPath: 'date' })
    db.createObjectStore('audio', { keyPath: 'url' })
  }
]

export const DB_VERSION = MIGRATIONS.length
export const BACKUP_STORES = ['bookmarks', 'notes', 'history', 'progress']
