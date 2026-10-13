import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './helpers.js';

const valid = { name: 'Asha Rao', email: 'asha@example.com', subject: 'Internship', body: 'We would like to talk about a role.' };
const count = (db) => db.prepare('SELECT COUNT(*) AS n FROM messages').get().n;

describe('POST /api/contact', () => {
  it('stores a valid message as new, with a hashed ip, and notifies the mailer', async () => {
    const { app, db, sent } = createTestApp();
    const res = await request(app).post('/api/contact').send(valid);
    expect(res.status).toBe(201);
    const row = db.prepare('SELECT * FROM messages').get();
    expect(row).toMatchObject({ ...valid, status: 'new' });
    expect(row.ip_hash).toMatch(/^[a-f0-9]{32}$/);
    expect(row.ip_hash).not.toContain('127.0.0.1');
    expect(sent).toHaveLength(1);
  });

  it('still succeeds when the mailer rejects', async () => {
    const { app, db } = createTestApp();
    const { createMailer } = await import('../src/lib/mailer.js');
    const mailer = createMailer({ host: '127.0.0.1', port: 1, user: 'u', pass: 'p', to: 't@example.com' }, { error() {} });
    expect(await mailer.sendContactNotification({ name: 'A', email: 'a@example.com', subject: '', body: 'x' })).toBe(false);
    expect((await request(app).post('/api/contact').send(valid)).status).toBe(201);
    expect(count(db)).toBe(1);
  });

  it.each([
    ['short name', { name: 'A' }, 'name'],
    ['long name', { name: 'x'.repeat(61) }, 'name'],
    ['bad email', { email: 'not-an-email' }, 'email'],
    ['long subject', { subject: 'x'.repeat(101) }, 'subject'],
    ['short body', { body: 'too short' }, 'body'],
    ['long body', { body: 'x'.repeat(2001) }, 'body'],
  ])('rejects %s', async (_label, patch, field) => {
    const { app, db } = createTestApp();
    const res = await request(app).post('/api/contact').send({ ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details.map((d) => d.path)).toContain(field);
    expect(count(db)).toBe(0);
  });

  it('silently accepts and drops submissions that fill the honeypot', async () => {
    const { app, db, sent } = createTestApp();
    const res = await request(app).post('/api/contact').send({ ...valid, website: 'https://spam.example' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(count(db)).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it('rate limits to 5 submissions per hour per IP', async () => {
    const { app, db } = createTestApp();
    for (let i = 0; i < 5; i += 1) expect((await request(app).post('/api/contact').send(valid)).status).toBe(201);
    const blocked = await request(app).post('/api/contact').send(valid);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBeTruthy();
    expect(count(db)).toBe(5);
  });
});
