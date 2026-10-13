import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, loginAgent } from './helpers.js';

describe('public content API', () => {
  it('hides the phone number while show_phone=0 and reveals it once enabled', async () => {
    const { app, db } = createTestApp();
    const hidden = await request(app).get('/api/profile');
    expect(hidden.status).toBe(200);
    expect(hidden.body.name).toBe('Dhulipalla Jitendra Varma');
    expect(hidden.body).not.toHaveProperty('phone');
    expect(hidden.body).not.toHaveProperty('show_phone');
    expect(hidden.body).not.toHaveProperty('resume_file');
    expect(JSON.stringify((await request(app).get('/api/portfolio')).body)).not.toContain('7569054209');

    const agent = await loginAgent(app);
    expect((await agent.get('/api/admin/profile')).body).toMatchObject({ phone: '+91 7569054209', show_phone: false });
    await agent.put('/api/admin/profile').send({ show_phone: true }).expect(200);
    expect((await request(app).get('/api/profile')).body.phone).toBe('+91 7569054209');
    expect(db.prepare('SELECT name FROM profile').get().name).toBe('Dhulipalla Jitendra Varma'); // partial update
  });

  it('groups skills by category in seed order', async () => {
    const { app } = createTestApp();
    const { body } = await request(app).get('/api/skills');
    expect(body.map((g) => g.category)).toEqual(['Languages', 'Web Technologies', 'Backend', 'Tools & Platforms', 'Core Concepts']);
    expect(body[0].items.map((s) => s.name)).toEqual(['Java', 'HTML', 'CSS']);
  });

  it('lists published projects, supports ?featured=1 and fetches by slug', async () => {
    const { app } = createTestApp();
    const all = (await request(app).get('/api/projects')).body;
    expect(all.map((p) => p.slug)).toEqual(['honest-eye', 'online-medical-shopping-system', 'bob-ai-voice-assistant']);
    expect(all[0]).toMatchObject({ featured: true, live_url: 'https://honesteye.vercel.app', repo_url: '' });
    expect(all[0].tech_stack).toContain('Gemini API');
    expect((await request(app).get('/api/projects?featured=1')).body).toHaveLength(1);
    expect((await request(app).get('/api/projects/honest-eye')).body.title).toBe('Honest Eye');
    const missing = await request(app).get('/api/projects/nope');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Project not found' });
  });

  it('serves the remaining collections', async () => {
    const { app } = createTestApp();
    const experience = (await request(app).get('/api/experience')).body;
    expect(experience[0]).toMatchObject({ role: 'Web Development Intern', company: 'ShadowFox' });
    expect(experience[0].bullets).toHaveLength(3);
    expect((await request(app).get('/api/education')).body.map((e) => e.score)).toEqual(['CGPA 7.53', '67%', '100%']);
    expect((await request(app).get('/api/certifications')).body).toHaveLength(2);
    expect((await request(app).get('/api/achievements')).body).toHaveLength(2);
  });

  it('GET /api/portfolio returns everything with ETag + 60s caching', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/portfolio');
    expect(Object.keys(res.body).sort()).toEqual(['achievements', 'certifications', 'education', 'experience', 'profile', 'projects', 'skills']);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.headers.etag).toBeTruthy();
    const cached = await request(app).get('/api/portfolio').set('If-None-Match', res.headers.etag);
    expect(cached.status).toBe(304);
  });

  it('health, 404 shape, malformed JSON and oversized bodies', async () => {
    const { app } = createTestApp();
    expect((await request(app).get('/api/health')).body.status).toBe('ok');
    const missing = await request(app).get('/api/nope');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Not found' });
    const bad = await request(app).post('/api/contact').set('Content-Type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('Malformed JSON body');
    const huge = await request(app).post('/api/contact').send({ body: 'x'.repeat(200 * 1024) });
    expect(huge.status).toBe(413);
  });

  it('sets security headers', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('serves robots.txt and a sitemap with the home page and each published project', async () => {
    const { app, db } = createTestApp();
    db.prepare("UPDATE projects SET published = 0 WHERE slug = 'bob-ai-voice-assistant'").run();
    const robots = await request(app).get('/robots.txt');
    expect(robots.text).toContain('Disallow: /admin');
    expect(robots.text).toMatch(/Sitemap: http:\/\/.+\/sitemap\.xml/);
    const sitemap = await request(app).get('/sitemap.xml').set('Host', 'example.test');
    expect(sitemap.headers['content-type']).toContain('xml');
    const locs = [...sitemap.text.matchAll(/<loc>(.+?)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([
      'http://example.test/',
      'http://example.test/projects/honest-eye',
      'http://example.test/projects/online-medical-shopping-system',
    ]);
  });
});
