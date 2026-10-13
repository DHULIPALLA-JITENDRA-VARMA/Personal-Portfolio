import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ADMIN, CSRF, createTestApp, loginAgent } from './helpers.js';

describe('admin auth', () => {
  it('logs in with valid credentials and sets a hardened session cookie', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/api/admin/login').set(CSRF).send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: ADMIN.username });
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^portfolio_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Max-Age=28800/);
    expect(cookie).not.toMatch(/Secure/i); // only in production
  });

  it('marks the cookie Secure in production', async () => {
    const { config } = createTestApp();
    const { app } = createTestApp({ config: { ...config, cookieSecure: true } });
    const res = await request(app).post('/api/admin/login').set(CSRF).send(ADMIN);
    expect(res.headers['set-cookie'][0]).toMatch(/Secure/i);
  });

  it('rejects a wrong password and an unknown user with the same 401', async () => {
    const { app } = createTestApp();
    const wrong = await request(app).post('/api/admin/login').set(CSRF).send({ ...ADMIN, password: 'nope-nope-nope' });
    const unknown = await request(app).post('/api/admin/login').set(CSRF).send({ username: 'ghost', password: 'x' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.headers['set-cookie']).toBeUndefined();
  });

  it('rate limits login after 5 failed attempts', async () => {
    const { app } = createTestApp();
    const attempt = () => request(app).post('/api/admin/login').set(CSRF).send({ username: 'admin', password: 'wrong-wrong' });
    for (let i = 0; i < 5; i += 1) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many/i);
    // Even the correct password is refused while the window is active.
    expect((await request(app).post('/api/admin/login').set(CSRF).send(ADMIN)).status).toBe(429);
  });

  it('returns 401 on protected routes without a session', async () => {
    const { app } = createTestApp();
    for (const path of ['/me', '/stats', '/projects', '/messages', '/profile', '/skills']) {
      const res = await request(app).get(`/api/admin${path}`);
      expect(res.status, path).toBe(401);
      expect(res.body.error).toBeTruthy();
    }
    const write = await request(app).post('/api/admin/projects').set(CSRF).send({ title: 'x' });
    expect(write.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/admin/me').set('Cookie', 'portfolio_session=not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('requires the CSRF header on mutating admin requests, even with a valid session', async () => {
    const { app } = createTestApp();
    expect((await request(app).post('/api/admin/login').send(ADMIN)).status).toBe(403);

    const agent = await loginAgent(app);
    const cookie = (await request(app).post('/api/admin/login').set(CSRF).send(ADMIN)).headers['set-cookie'];
    const noHeader = await request(app).post('/api/admin/skills').set('Cookie', cookie).send({ category: 'A', name: 'B' });
    expect(noHeader.status).toBe(403);
    const wrongHeader = await request(app)
      .delete('/api/admin/skills/1')
      .set('Cookie', cookie)
      .set('x-requested-with', 'XMLHttpRequest');
    expect(wrongHeader.status).toBe(403);
    // GET is safe and does not need it; with the header the same write succeeds.
    expect((await request(app).get('/api/admin/me').set('Cookie', cookie)).status).toBe(200);
    expect((await agent.post('/api/admin/skills').send({ category: 'A', name: 'B' })).status).toBe(201);
  });

  it('logout clears the session', async () => {
    const { app } = createTestApp();
    const agent = await loginAgent(app);
    expect((await agent.get('/api/admin/me')).body).toEqual({ username: ADMIN.username });
    await agent.post('/api/admin/logout').expect(200);
    await agent.get('/api/admin/me').expect(401);
  });
});
