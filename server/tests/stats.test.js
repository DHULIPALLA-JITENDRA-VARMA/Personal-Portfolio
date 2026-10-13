import { describe, expect, it } from 'vitest';
import { getStats } from '../src/lib/analytics.js';
import { createTestApp, loginAgent } from './helpers.js';

const NOW = new Date('2026-03-10T12:00:00.000Z');

function fixture(db) {
  const ev = db.prepare('INSERT INTO events (type, path, ref, visitor_hash, created_at) VALUES (?, ?, ?, ?, ?)');
  const msg = db.prepare("INSERT INTO messages (name, email, subject, body, status, created_at) VALUES ('A', 'a@example.com', '', 'hello there!', 'new', ?)");
  const rows = [
    // --- current 7-day window: 2026-03-04 .. 2026-03-10 ---
    ['page_view', '/', 'v1', '2026-03-10T08:00:00.000Z'],
    ['page_view', '/', 'v1', '2026-03-10T08:05:00.000Z'],
    ['page_view', '/projects/honest-eye', 'v2', '2026-03-10T09:00:00.000Z'],
    ['page_view', '/', 'v3', '2026-03-09T23:59:59.000Z'],
    ['page_view', '/', 'v4', '2026-03-04T00:00:00.000Z'], // first instant of the window
    ['project_click', '/projects/honest-eye', 'v1', '2026-03-10T08:01:00.000Z'],
    ['project_click', '/projects/honest-eye', 'v2', '2026-03-09T10:00:00.000Z'],
    ['project_click', '/projects/bob-ai-voice-assistant', 'v2', '2026-03-09T10:01:00.000Z'],
    ['resume_download', '/api/resume', 'v1', '2026-03-10T08:02:00.000Z'],
    ['resume_download', '/api/resume', 'v3', '2026-03-08T08:02:00.000Z'],
    ['outbound_click', 'https://www.linkedin.com/in/someone/', 'v1', '2026-03-10T08:03:00.000Z'],
    ['outbound_click', 'https://www.linkedin.com/in/someone/', 'v2', '2026-03-10T09:03:00.000Z'],
    ['outbound_click', 'https://github.com/someone', 'v1', '2026-03-10T08:04:00.000Z'],
    ['outbound_click', 'https://honesteye.vercel.app', 'v3', '2026-03-09T08:04:00.000Z'],
    // --- previous window: 2026-02-25 .. 2026-03-03 ---
    ['page_view', '/', 'p1', '2026-03-03T23:59:59.999Z'], // last instant before the window
    ['page_view', '/', 'p2', '2026-02-25T00:00:00.000Z'],
    ['resume_download', '/api/resume', 'p1', '2026-03-01T00:00:00.000Z'],
    // --- older than both windows: ignored ---
    ['page_view', '/', 'old', '2026-02-24T23:59:59.000Z'],
  ];
  for (const [type, path, visitor, at] of rows) ev.run(type, path, '', visitor, at);
  for (const at of ['2026-03-10T10:00:00.000Z', '2026-03-10T11:00:00.000Z', '2026-03-05T11:00:00.000Z', '2026-03-02T11:00:00.000Z']) msg.run(at);
}

describe('analytics aggregation', () => {
  const { db } = createTestApp();
  fixture(db);
  const stats = getStats(db, { days: 7, now: NOW });

  it('reports the window', () => {
    expect(stats.days).toBe(7);
    expect(stats.range).toEqual({ from: '2026-03-04', to: '2026-03-10' });
    expect(stats.visitors_per_day).toHaveLength(7);
  });

  it('computes totals with previous-period comparison', () => {
    expect(stats.totals.page_views).toEqual({ value: 5, previous: 2, change_pct: 150 });
    expect(stats.totals.unique_visitors).toEqual({ value: 4, previous: 2, change_pct: 100 });
    expect(stats.totals.project_clicks).toEqual({ value: 3, previous: 0, change_pct: null });
    expect(stats.totals.resume_downloads).toEqual({ value: 2, previous: 1, change_pct: 100 });
    expect(stats.totals.outbound_clicks).toEqual({ value: 4, previous: 0, change_pct: null });
    expect(stats.totals.messages).toEqual({ value: 3, previous: 1, change_pct: 200 });
  });

  it('buckets total and unique visitors per day, zero-filling quiet days', () => {
    const byDate = Object.fromEntries(stats.visitors_per_day.map((d) => [d.date, d]));
    expect(byDate['2026-03-10']).toEqual({ date: '2026-03-10', views: 3, unique: 2 });
    expect(byDate['2026-03-09']).toEqual({ date: '2026-03-09', views: 1, unique: 1 });
    expect(byDate['2026-03-04']).toEqual({ date: '2026-03-04', views: 1, unique: 1 });
    expect(byDate['2026-03-06']).toEqual({ date: '2026-03-06', views: 0, unique: 0 });
    expect(stats.visitors_per_day.reduce((n, d) => n + d.views, 0)).toBe(5);
  });

  it('ranks top pages and project clicks', () => {
    expect(stats.top_pages).toEqual([
      { path: '/', views: 4 },
      { path: '/projects/honest-eye', views: 1 },
    ]);
    expect(stats.top_projects).toEqual([
      { path: '/projects/honest-eye', clicks: 2 },
      { path: '/projects/bob-ai-voice-assistant', clicks: 1 },
    ]);
  });

  it('counts resume downloads and messages per day', () => {
    const resume = Object.fromEntries(stats.resume_downloads_per_day.map((d) => [d.date, d.count]));
    expect(resume['2026-03-10']).toBe(1);
    expect(resume['2026-03-08']).toBe(1);
    expect(resume['2026-03-07']).toBe(0);
    const messages = Object.fromEntries(stats.messages_per_day.map((d) => [d.date, d.count]));
    expect(messages['2026-03-10']).toBe(2);
    expect(messages['2026-03-05']).toBe(1);
  });

  it('classifies outbound clicks', () => {
    expect(stats.outbound_clicks).toEqual([
      { kind: 'LinkedIn', url: 'https://www.linkedin.com/in/someone/', count: 2 },
      { kind: 'GitHub', url: 'https://github.com/someone', count: 1 },
      { kind: 'Live demo', url: 'https://honesteye.vercel.app', count: 1 },
    ]);
  });

  it('is served by GET /api/admin/stats and validates ?days', async () => {
    const { app } = createTestApp();
    const agent = await loginAgent(app);
    const res = await agent.get('/api/admin/stats?days=14');
    expect(res.status).toBe(200);
    expect(res.body.days).toBe(14);
    expect(res.body.visitors_per_day).toHaveLength(14);
    expect((await agent.get('/api/admin/stats')).body.days).toBe(30);
    expect((await agent.get('/api/admin/stats?days=0')).status).toBe(400);
    expect((await agent.get('/api/admin/stats?days=abc')).status).toBe(400);
  });
});
