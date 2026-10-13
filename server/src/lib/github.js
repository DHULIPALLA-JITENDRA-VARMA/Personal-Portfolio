const CACHE_KEY = (username) => `github:repos:${username.toLowerCase()}`;

const toRepo = (r) => ({
  name: r.name,
  description: r.description || '',
  language: r.language || '',
  stars: r.stargazers_count ?? 0,
  forks: r.forks_count ?? 0,
  updated_at: r.pushed_at || r.updated_at,
  url: r.html_url,
});

export class GithubUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.status = 502;
    this.expose = true;
  }
}

export function createGithubService({
  db,
  username,
  token = '',
  fetchImpl = globalThis.fetch,
  ttlMs = 60 * 60 * 1000,
  retryAfterMs = 60 * 1000,
  now = Date.now,
}) {
  let memory = null; // { repos, fetchedAt }
  let lastFailureAt = 0;

  const readDisk = () => {
    const row = db.prepare('SELECT value, fetched_at FROM cache WHERE key = ?').get(CACHE_KEY(username));
    if (!row) return null;
    try {
      return { repos: JSON.parse(row.value), fetchedAt: row.fetched_at };
    } catch {
      return null;
    }
  };

  const writeDisk = (entry) => {
    db.prepare(
      `INSERT INTO cache (key, value, fetched_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at`,
    ).run(CACHE_KEY(username), JSON.stringify(entry.repos), entry.fetchedAt);
  };

  async function fetchRepos() {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-server' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetchImpl(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed&type=owner`,
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
    const data = await res.json();
    return data.filter((r) => !r.fork && !r.private).map(toRepo);
  }

  // Cache strategy (two tiers, then graceful degradation):
  //   1. memory  - fastest path, valid for `ttlMs` (1h).
  //   2. SQLite  - survives restarts/redeploys, so a cold boot does not spend GitHub quota.
  //   3. GitHub  - only when both tiers are older than the TTL.
  // If GitHub is unreachable or rate-limited (60 req/h unauthenticated) we fall back to the
  // newest cached copy of ANY age and flag it `stale: true` so the UI can say so. After a
  // failure we also wait `retryAfterMs` before trying again, to avoid hammering a failing API.
  async function getRepos() {
    if (!username) return { repos: [], stale: false, fetched_at: null };
    const fresh = (entry) => entry && now() - entry.fetchedAt < ttlMs;
    const respond = (entry, stale) => ({
      repos: entry.repos,
      stale,
      fetched_at: new Date(entry.fetchedAt).toISOString(),
    });

    if (fresh(memory)) return respond(memory, false);

    const disk = readDisk();
    if (fresh(disk)) {
      memory = disk;
      return respond(disk, false);
    }

    const fallback = memory || disk;
    if (fallback && now() - lastFailureAt < retryAfterMs) return respond(fallback, true);

    try {
      memory = { repos: await fetchRepos(), fetchedAt: now() };
      writeDisk(memory);
      lastFailureAt = 0;
      return respond(memory, false);
    } catch (err) {
      lastFailureAt = now();
      if (fallback) return respond(fallback, true);
      throw new GithubUnavailableError(`GitHub is unavailable and no cached data exists (${err.message})`);
    }
  }

  return { getRepos };
}

const normalize = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// A repo "clearly matches" a project when its name equals the project title once case, spaces
// and punctuation are ignored ("honest-eye" == "Honest Eye"). For titles like "BOB — AI Voice
// Assistant" the part before the dash is also accepted. Anything fuzzier is left unlinked.
export function matchRepo(title, repos) {
  const candidates = new Set([normalize(title), normalize(String(title).split(/\s[—–-]\s/)[0])]);
  candidates.delete('');
  return repos.find((r) => candidates.has(normalize(r.name))) || null;
}
