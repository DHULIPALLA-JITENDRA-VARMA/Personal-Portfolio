import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { seedDatabase } from '../seed/seed.js';

export const ADMIN = { username: 'admin', password: 'correct-horse-battery' };
export const CSRF = { 'x-requested-with': 'portfolio' };
export const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

export const testConfig = (overrides = {}) => ({
  ...loadConfig({
    NODE_ENV: 'test',
    DB_PATH: ':memory:',
    UPLOAD_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-uploads-')),
    SERVER_SECRET: 'unit-test-secret-unit-test-secret-1234',
    ADMIN_USERNAME: ADMIN.username,
    ADMIN_PASSWORD: ADMIN.password,
    GITHUB_USERNAME: 'octo-owner',
    GITHUB_URL: 'https://github.com/octo-owner',
    LINKEDIN_URL: 'https://www.linkedin.com/in/octo-owner/',
  }),
  ...overrides,
});

// A fresh in-memory database, seeded, with a GitHub stub that can never reach the network.
export function createTestApp({ seed = true, github, config = testConfig() } = {}) {
  const db = openDb(':memory:');
  if (seed) seedDatabase(db, config);
  const sent = [];
  const mailer = { enabled: false, sendContactNotification: async (m) => sent.push(m) };
  const app = createApp({
    db,
    config,
    mailer,
    github: github || { getRepos: async () => ({ repos: [], stale: false, fetched_at: null }) },
  });
  return { app, db, config, sent };
}

// Logs in and returns an agent that keeps the session cookie and always sends the CSRF header.
export async function loginAgent(app) {
  const agent = request.agent(app);
  agent.set(CSRF);
  const res = await agent.post('/api/admin/login').send(ADMIN);
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return agent;
}
