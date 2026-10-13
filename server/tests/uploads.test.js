import fs from 'node:fs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { BROWSER_UA, createTestApp, loginAgent } from './helpers.js';

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(64)]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(256)]);

describe('uploads', () => {
  let app;
  let db;
  let config;
  let agent;
  beforeEach(async () => {
    ({ app, db, config } = createTestApp());
    agent = await loginAgent(app);
  });
  const files = () => fs.readdirSync(config.uploadDir);

  it.each([
    ['png', PNG],
    ['jpg', JPG],
    ['webp', WEBP],
  ])('accepts a %s project image, stores it under a random name and serves it', async (ext, buffer) => {
    const res = await agent.post('/api/admin/projects/1/image').attach('file', buffer, '../../evil name.exe');
    expect(res.status).toBe(200);
    expect(res.body.image).toMatch(new RegExp(`^/uploads/project-[a-f0-9]{32}\\.${ext}$`));
    expect(files()).toHaveLength(1);
    const served = await request(app).get(res.body.image);
    expect(served.status).toBe(200);
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });

  it('replaces the previous image file', async () => {
    const first = (await agent.post('/api/admin/projects/1/image').attach('file', PNG, 'a.png')).body.image;
    const second = (await agent.post('/api/admin/projects/1/image').attach('file', JPG, 'b.jpg')).body.image;
    expect(second).not.toBe(first);
    expect(files()).toEqual([second.replace('/uploads/', '')]);
  });

  it('rejects a wrong type even when the name and mime type claim to be an image', async () => {
    const res = await agent
      .post('/api/admin/projects/1/image')
      .attach('file', Buffer.from('<script>alert(1)</script> definitely not an image'), { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    expect(res.body.error).toMatch(/Unsupported file type/);
    expect((await agent.post('/api/admin/projects/1/image').attach('file', PDF, 'doc.png')).status).toBe(415);
    expect(files()).toHaveLength(0);
  });

  it('rejects images over 2MB and a missing file', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await agent.post('/api/admin/projects/1/image').attach('file', big, 'big.png');
    expect(res.status).toBe(413);
    expect(res.body.error).toBe('File is too large');
    expect((await agent.post('/api/admin/projects/1/image')).status).toBe(400);
    expect((await agent.post('/api/admin/projects/999/image').attach('file', PNG, 'a.png')).status).toBe(404);
    expect(files()).toHaveLength(0);
  });

  it('requires auth', async () => {
    const res = await request(app).post('/api/admin/resume').set('x-requested-with', 'portfolio').attach('file', PDF, 'cv.pdf');
    expect(res.status).toBe(401);
  });

  it('resume: 404 until uploaded, PDF only, ≤5MB, replaced on re-upload, download is logged', async () => {
    await request(app).get('/api/resume').expect(404);
    expect((await request(app).get('/api/profile')).body.has_resume).toBe(false);

    expect((await agent.post('/api/admin/resume').attach('file', PNG, 'cv.pdf')).status).toBe(415);
    const tooBig = Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]);
    expect((await agent.post('/api/admin/resume').attach('file', tooBig, 'cv.pdf')).status).toBe(413);

    await agent.post('/api/admin/resume').attach('file', PDF, 'cv.pdf').expect(200);
    const firstFile = files()[0];
    await agent.post('/api/admin/resume').attach('file', PDF, 'cv-v2.pdf').expect(200);
    expect(files()).toHaveLength(1);
    expect(files()[0]).not.toBe(firstFile);
    expect((await request(app).get('/api/profile')).body.has_resume).toBe(true);

    const download = await request(app).get('/api/resume').set('User-Agent', BROWSER_UA);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toBe('application/pdf');
    expect(download.headers['content-disposition']).toBe('attachment; filename="Dhulipalla-Jitendra-Varma-Resume.pdf"');
    expect(download.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(db.prepare("SELECT COUNT(*) AS n FROM events WHERE type = 'resume_download'").get().n).toBe(1);

    await agent.delete('/api/admin/resume').expect(200);
    await request(app).get('/api/resume').expect(404);
    expect(files()).toHaveLength(0);
  });
});
