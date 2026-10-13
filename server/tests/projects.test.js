import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { slugify } from '../src/lib/slug.js';
import { createTestApp, loginAgent } from './helpers.js';

describe('admin project CRUD', () => {
  let app;
  let agent;
  beforeEach(async () => {
    ({ app } = createTestApp());
    agent = await loginAgent(app);
  });

  it('creates a project with an auto slug and sensible defaults', async () => {
    const res = await agent.post('/api/admin/projects').send({ title: '  My New Project!  ', tech_stack: ['Go'] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'My New Project!',
      slug: 'my-new-project',
      tech_stack: ['Go'],
      published: false,
      featured: false,
      image: null,
      sort_order: 3,
    });
    // Drafts are invisible publicly until published.
    await request(app).get('/api/projects/my-new-project').expect(404);
    await agent.patch(`/api/admin/projects/${res.body.id}`).send({ published: true }).expect(200);
    await request(app).get('/api/projects/my-new-project').expect(200);
  });

  it('keeps slugs unique by suffixing', async () => {
    const slugs = [];
    for (let i = 0; i < 3; i += 1) slugs.push((await agent.post('/api/admin/projects').send({ title: 'Honest Eye' })).body.slug);
    expect(slugs).toEqual(['honest-eye-2', 'honest-eye-3', 'honest-eye-4']);
    const custom = await agent.post('/api/admin/projects').send({ title: 'Other', slug: 'Honest Eye' });
    expect(custom.body.slug).toBe('honest-eye-5');
  });

  it('slugify handles punctuation, accents and empty input', () => {
    expect(slugify('BOB — AI Voice Assistant')).toBe('bob-ai-voice-assistant');
    expect(slugify('Café  & Crème')).toBe('cafe-creme');
    expect(slugify('!!!')).toBe('project');
  });

  it('validates input', async () => {
    expect((await agent.post('/api/admin/projects').send({})).status).toBe(400);
    expect((await agent.post('/api/admin/projects').send({ title: 'x', live_url: 'javascript:alert(1)' })).status).toBe(400);
    expect((await agent.put('/api/admin/projects/abc').send({ title: 'x' })).status).toBe(400);
    expect((await agent.put('/api/admin/projects/9999').send({ title: 'x' })).status).toBe(404);
  });

  it('updates fields without changing the slug, and toggles featured/published', async () => {
    const list = (await agent.get('/api/admin/projects')).body;
    const target = list.find((p) => p.slug === 'online-medical-shopping-system');
    const updated = await agent.put(`/api/admin/projects/${target.id}`).send({ title: 'Renamed', tagline: 'New tagline' });
    expect(updated.body).toMatchObject({ title: 'Renamed', tagline: 'New tagline', slug: target.slug, tech_stack: target.tech_stack });

    await agent.patch(`/api/admin/projects/${target.id}`).send({ featured: true, published: false }).expect(200);
    const featured = (await request(app).get('/api/projects?featured=1')).body;
    expect(featured.map((p) => p.slug)).toEqual(['honest-eye']);
    const visible = (await request(app).get('/api/projects')).body;
    expect(visible.map((p) => p.slug)).not.toContain(target.slug);
  });

  it('reorders projects and the public list follows', async () => {
    const before = (await agent.get('/api/admin/projects')).body.map((p) => p.id);
    const ids = [...before].reverse();
    await agent.patch('/api/admin/projects/reorder').send({ ids }).expect(200);
    expect((await agent.get('/api/admin/projects')).body.map((p) => p.id)).toEqual(ids);
    expect((await request(app).get('/api/projects')).body.map((p) => p.id)).toEqual(ids);

    expect((await agent.patch('/api/admin/projects/reorder').send({ ids: [ids[0], ids[0]] })).status).toBe(400);
    expect((await agent.patch('/api/admin/projects/reorder').send({ ids: [9999] })).status).toBe(400);
    expect((await agent.patch('/api/admin/projects/reorder').send({ ids: [] })).status).toBe(400);
  });

  it('deletes a project', async () => {
    const [first] = (await agent.get('/api/admin/projects')).body;
    await agent.delete(`/api/admin/projects/${first.id}`).expect(204);
    await agent.get(`/api/admin/projects/${first.id}`).expect(404);
    await agent.delete(`/api/admin/projects/${first.id}`).expect(404);
  });
});

describe('admin list resources and messages', () => {
  it('runs CRUD on a JSON-backed collection (experience)', async () => {
    const { app } = createTestApp();
    const agent = await loginAgent(app);
    const created = await agent.post('/api/admin/experience').send({ role: 'Dev', company: 'Acme', bullets: ['one', 'two'] });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ role: 'Dev', company: 'Acme', bullets: ['one', 'two'], start: '', end: '', sort_order: 1 });
    const updated = await agent.put(`/api/admin/experience/${created.body.id}`).send({ end: '2026' });
    expect(updated.body).toMatchObject({ role: 'Dev', end: '2026', bullets: ['one', 'two'] });
    expect((await request(app).get('/api/experience')).body).toHaveLength(2);
    await agent.delete(`/api/admin/experience/${created.body.id}`).expect(204);
    expect((await agent.post('/api/admin/experience').send({ role: '' })).status).toBe(400);
  });

  it('lists, filters, paginates, updates and deletes messages', async () => {
    const { app, db } = createTestApp();
    const agent = await loginAgent(app);
    const insert = db.prepare("INSERT INTO messages (name, email, subject, body, status, created_at, ip_hash) VALUES (?, 'a@example.com', '', 'hello there!', ?, ?, 'h')");
    for (let i = 0; i < 5; i += 1) insert.run(`N${i}`, i < 3 ? 'new' : 'read', `2026-01-0${i + 1}T00:00:00.000Z`);

    const page1 = (await agent.get('/api/admin/messages?limit=2')).body;
    expect(page1).toMatchObject({ total: 5, page: 1, limit: 2, pages: 3, unread: 3 });
    expect(page1.items.map((m) => m.name)).toEqual(['N4', 'N3']);
    expect(page1.items[0].ip_hash).toBeUndefined();
    expect((await agent.get('/api/admin/messages?limit=2&page=3')).body.items.map((m) => m.name)).toEqual(['N0']);
    expect((await agent.get('/api/admin/messages?status=read')).body.total).toBe(2);
    expect((await agent.get('/api/admin/messages?status=bogus')).status).toBe(400);

    const id = page1.items[0].id;
    const firstNew = (await agent.get('/api/admin/messages?status=new')).body.items[0].id;
    expect((await agent.patch(`/api/admin/messages/${firstNew}`).send({ status: 'read' })).body.status).toBe('read');
    expect((await agent.get('/api/admin/messages/unread-count')).body).toEqual({ unread: 2 });
    expect((await agent.patch(`/api/admin/messages/${id}`).send({ status: 'spam' })).status).toBe(400);
    await agent.patch(`/api/admin/messages/${id}`).send({ status: 'archived' }).expect(200);
    await agent.delete(`/api/admin/messages/${id}`).expect(204);
    await agent.delete(`/api/admin/messages/${id}`).expect(404);
  });
});
