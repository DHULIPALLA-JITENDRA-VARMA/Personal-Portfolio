-- Durable copy of upstream API responses (GitHub repos) so a restart does not lose the cache.
CREATE TABLE cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
