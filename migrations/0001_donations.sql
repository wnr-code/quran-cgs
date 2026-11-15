-- Cloudflare D1: tabel infaq (diisi oleh webhook Trakteer)
CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY,          -- transaction_id dari Trakteer (mencegah duplikat)
  name TEXT NOT NULL,           -- nama tampilan donatur
  unit TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL DEFAULT 0, -- total rupiah
  type TEXT NOT NULL DEFAULT 'tip',
  is_test INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL   -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_donations_created ON donations (created_at);
