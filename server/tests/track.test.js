import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { dailySalt, isBot, sha256, visitorHash } from '../src/lib/hash.js';
import { BROWSER_UA, createTestApp } from './helpers.js';

const events = (db) => db.prepare('SELECT * FROM events ORDER BY id').all();
const track = (app, body, ua = BROWSER_UA) => request(app).post('/api/track').set('User-Agent', ua).send(body);

describe('POST /api/track', () => {
  it('stores whitelisted event types', async () => {
    const { app, db } = createTestApp();
    for (const type of ['page_view', 'project_click', 'resume_download', 'outbound_click']) {
      expect((await track(app, { type, path: '/', ref: 'https://google.com' })).status).toBe(204);
    }
    expect(events(db).map((e) => e.type)).toEqual(['page_view', 'project_click', 'resume_download', 'outbound_click']);
  });

  it('rejects unknown types and missing paths', async () => {
    const { app, db } = createTestApp();
    expect((await track(app, { type: 'purchase', path: '/' })).status).toBe(400);
    expect((await track(app, { type: 'page_view' })).status).toBe(400);
    expect((await track(app, { type: 'page_view', path: 'x'.repeat(301) })).status).toBe(400);
    expect(events(db)).toHaveLength(0);
  });

  it('stores SHA-256(ip + user-agent + daily salt) and never the raw IP', async () => {
    const { app, db, config } = createTestApp();
    await track(app, { type: 'page_view', path: '/' });
    const [row] = events(db);
    expect(row.visitor_hash).toMatch(/^[a-f0-9]{64}$/);
    const candidates = ['127.0.0.1', '::ffff:127.0.0.1', '::1'].map((ip) =>
      visitorHash({ ip, userAgent: BROWSER_UA, secret: config.serverSecret }),
    );
    expect(candidates).toContain(row.visitor_hash);
    expect(JSON.stringify(row)).not.toMatch(/127\.0\.0\.1|::1/);
    expect(Object.keys(row).sort()).toEqual(['created_at', 'id', 'path', 'ref', 'type', 'visitor_hash']);
  });

  it('does not set any cookie', async () => {
    const { app } = createTestApp();
    const res = await track(app, { type: 'page_view', path: '/' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('gives the same visitor the same hash within a day and a different one per user-agent', async () => {
    const { app, db } = createTestApp();
    await track(app, { type: 'page_view', path: '/' });
    await track(app, { type: 'page_view', path: '/projects/honest-eye' });
    await track(app, { type: 'page_view', path: '/' }, `${BROWSER_UA} Edg/126`);
    const [a, b, c] = events(db).map((e) => e.visitor_hash);
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('ignores known bots but still answers 204', async () => {
    const { app, db } = createTestApp();
    for (const ua of ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'curl/8.4.0', 'Mozilla/5.0 HeadlessChrome/126.0', '']) {
      expect((await track(app, { type: 'page_view', path: '/' }, ua)).status).toBe(204);
    }
    expect(events(db)).toHaveLength(0);
  });

  it('rate limits tracking', async () => {
    const { app } = createTestApp();
    const results = await Promise.all(Array.from({ length: 65 }, () => track(app, { type: 'page_view', path: '/' })));
    expect(results.filter((r) => r.status === 429).length).toBe(5);
  });
});

describe('hash helpers', () => {
  it('rotates the salt (and so the visitor hash) every UTC day', () => {
    const d1 = new Date('2026-01-01T23:59:59Z');
    const d2 = new Date('2026-01-02T00:00:01Z');
    expect(dailySalt('s', d1)).toBe(sha256('s:2026-01-01'));
    expect(dailySalt('s', d1)).not.toBe(dailySalt('s', d2));
    const args = { ip: '203.0.113.9', userAgent: BROWSER_UA, secret: 's' };
    expect(visitorHash({ ...args, date: d1 })).not.toBe(visitorHash({ ...args, date: d2 }));
    expect(visitorHash({ ...args, date: d1 })).toBe(visitorHash({ ...args, date: new Date('2026-01-01T00:00:00Z') }));
  });

  it('depends on the server secret', () => {
    const args = { ip: '203.0.113.9', userAgent: BROWSER_UA, date: new Date('2026-01-01T00:00:00Z') };
    expect(visitorHash({ ...args, secret: 'a' })).not.toBe(visitorHash({ ...args, secret: 'b' }));
  });

  it('classifies bots', () => {
    expect(isBot(BROWSER_UA)).toBe(false);
    expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe(true);
    expect(isBot(undefined)).toBe(true);
  });
});
