import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { openDb } from '../src/db.js';
import { createGithubService, matchRepo } from '../src/lib/github.js';
import { createTestApp } from './helpers.js';

const HOUR = 60 * 60 * 1000;
const apiRepo = (name, extra = {}) => ({
  name,
  description: `${name} description`,
  language: 'JavaScript',
  stargazers_count: 3,
  forks_count: 1,
  pushed_at: '2026-01-01T00:00:00Z',
  html_url: `https://github.com/octo-owner/${name}`,
  fork: false,
  private: false,
  ...extra,
});
const okResponse = (repos) => ({ ok: true, status: 200, json: async () => repos });

// `fetchImpl` is always a mock here: these tests must never reach the real GitHub API.
function setup(fetchImpl, db = openDb(':memory:')) {
  const clock = { t: 1_800_000_000_000 };
  const service = createGithubService({ db, username: 'octo-owner', fetchImpl, now: () => clock.t });
  return { service, clock, db };
}

describe('GitHub service', () => {
  it('maps repos, excludes forks and sends no token by default', async () => {
    const fetchImpl = vi.fn(async () => okResponse([apiRepo('honest-eye'), apiRepo('some-fork', { fork: true })]));
    const { service } = setup(fetchImpl);
    const result = await service.getRepos();
    expect(result.stale).toBe(false);
    expect(result.repos).toEqual([
      {
        name: 'honest-eye',
        description: 'honest-eye description',
        language: 'JavaScript',
        stars: 3,
        forks: 1,
        updated_at: '2026-01-01T00:00:00Z',
        url: 'https://github.com/octo-owner/honest-eye',
      },
    ]);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain('https://api.github.com/users/octo-owner/repos');
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('serves from the in-memory cache for an hour (cache hit)', async () => {
    const fetchImpl = vi.fn(async () => okResponse([apiRepo('a')]));
    const { service, clock } = setup(fetchImpl);
    await service.getRepos();
    clock.t += HOUR - 1;
    const again = await service.getRepos();
    expect(again.stale).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    clock.t += 2;
    await service.getRepos();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('survives a restart through the SQLite cache', async () => {
    const fetchImpl = vi.fn(async () => okResponse([apiRepo('a')]));
    const first = setup(fetchImpl);
    await first.service.getRepos();
    const second = setup(fetchImpl, first.db); // new instance = empty memory, same database
    const result = await second.service.getRepos();
    expect(result.repos.map((r) => r.name)).toEqual(['a']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves stale cache with stale:true when GitHub is rate-limited or unreachable', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse([apiRepo('a')]))
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ message: 'rate limit exceeded' }) })
      .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND api.github.com'))
      .mockResolvedValueOnce(okResponse([apiRepo('a'), apiRepo('b')]));
    const { service, clock } = setup(fetchImpl);
    await service.getRepos();

    clock.t += 2 * HOUR;
    const rateLimited = await service.getRepos();
    expect(rateLimited).toMatchObject({ stale: true, repos: [{ name: 'a' }] });

    // Within the back-off window GitHub is not called again.
    clock.t += 1000;
    expect((await service.getRepos()).stale).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    clock.t += 5 * 60 * 1000;
    expect((await service.getRepos()).stale).toBe(true); // network error -> still stale
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    clock.t += 5 * 60 * 1000;
    const recovered = await service.getRepos();
    expect(recovered.stale).toBe(false);
    expect(recovered.repos.map((r) => r.name)).toEqual(['a', 'b']);
  });

  it('fails with 502 when GitHub is down and nothing is cached', async () => {
    const { service } = setup(vi.fn().mockRejectedValue(new Error('offline')));
    await expect(service.getRepos()).rejects.toMatchObject({ status: 502 });
  });

  it('sends the token when configured', async () => {
    const fetchImpl = vi.fn(async () => okResponse([]));
    const service = createGithubService({ db: openDb(':memory:'), username: 'o', token: 'ghp_test', fetchImpl });
    await service.getRepos();
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer ghp_test');
  });

  it('GET /api/github/repos exposes the service result and a JSON error when unavailable', async () => {
    const github = { getRepos: vi.fn(async () => ({ repos: [{ name: 'a' }], stale: true, fetched_at: '2026-01-01T00:00:00.000Z' })) };
    const { app } = createTestApp({ github });
    const res = await request(app).get('/api/github/repos');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'octo-owner', stale: true, repos: [{ name: 'a' }] });

    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const down = createTestApp({ github: setup(fetchImpl).service });
    const failed = await request(down.app).get('/api/github/repos');
    expect(failed.status).toBe(502);
    expect(failed.body.error).toMatch(/GitHub is unavailable/);
  });
});

describe('matchRepo', () => {
  const repos = [{ name: 'honest-eye', url: 'u1' }, { name: 'BOB', url: 'u2' }, { name: 'dotfiles', url: 'u3' }];
  it('matches names ignoring case, spaces and punctuation', () => {
    expect(matchRepo('Honest Eye', repos)?.url).toBe('u1');
    expect(matchRepo('BOB — AI Voice Assistant', repos)?.url).toBe('u2');
  });
  it('leaves unclear matches unlinked', () => {
    expect(matchRepo('Online Medical Shopping System', repos)).toBeNull();
    expect(matchRepo('Honest', repos)).toBeNull();
  });
});
