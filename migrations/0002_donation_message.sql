-- Pesan/doa donatur dari formulir Trakteer (juga ditambahkan otomatis oleh ensureSchema).
ALTER TABLE donations ADD COLUMN message TEXT NOT NULL DEFAULT '';
