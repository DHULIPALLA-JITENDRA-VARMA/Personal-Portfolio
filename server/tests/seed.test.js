import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db.js';
import { isDatabaseEmpty, linkProjectRepos, seedDatabase } from '../seed/seed.js';
import { testConfig } from './helpers.js';

const TABLES = ['profile', 'skills', 'projects', 'experience', 'education', 'certifications', 'achievements', 'admin'];
const counts = (db) => Object.fromEntries(TABLES.map((t) => [t, db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n]));

describe('seed', () => {
  it('fills an empty database with the resume content', () => {
    const db = openDb(':memory:');
    expect(isDatabaseEmpty(db)).toBe(true);
    seedDatabase(db, testConfig());
    expect(isDatabaseEmpty(db)).toBe(false);
    expect(counts(db)).toEqual({ profile: 1, skills: 13, projects: 3, experience: 1, education: 3, certifications: 2, achievements: 2, admin: 1 });
    const profile = db.prepare('SELECT * FROM profile').get();
    expect(profile).toMatchObject({
      name: 'Dhulipalla Jitendra Varma',
      email: 'jitendravarmadhulipalla99@gmail.com',
      phone: '+91 7569054209',
      show_phone: 0,
      location: 'Bengaluru, India',
      linkedin_url: 'https://www.linkedin.com/in/octo-owner/',
      github_url: 'https://github.com/octo-owner',
    });
    expect(db.prepare('SELECT COUNT(*) AS n FROM projects WHERE published = 1').get().n).toBe(3);
    expect(db.prepare('SELECT title FROM projects WHERE featured = 1').all()).toEqual([{ title: 'Honest Eye' }]);
  });

  it('is idempotent and never overwrites admin edits', () => {
    const db = openDb(':memory:');
    const config = testConfig();
    seedDatabase(db, config);
    db.prepare("UPDATE profile SET headline = 'Edited in the dashboard'").run();
    db.prepare("DELETE FROM skills WHERE name = 'Java'").run();
    const before = counts(db);

    expect(seedDatabase(db, config)).toEqual([]);
    seedDatabase(db, config);
    expect(counts(db)).toEqual(before);
    expect(db.prepare('SELECT headline FROM profile').get().headline).toBe('Edited in the dashboard');
  });

  it('stores a bcrypt hash and rotates it when ADMIN_PASSWORD changes', () => {
    const db = openDb(':memory:');
    seedDatabase(db, testConfig());
    const first = db.prepare('SELECT * FROM admin').get();
    expect(first.password_hash).toMatch(/^\$2[aby]\$/);
    expect(bcrypt.compareSync('correct-horse-battery', first.password_hash)).toBe(true);

    seedDatabase(db, testConfig({ adminPassword: 'a-brand-new-password' }));
    const rows = db.prepare('SELECT * FROM admin').all();
    expect(rows).toHaveLength(1);
    expect(bcrypt.compareSync('a-brand-new-password', rows[0].password_hash)).toBe(true);
  });

  it('refuses to seed without admin credentials or with a short password', () => {
    const db = openDb(':memory:');
    expect(() => seedDatabase(db, testConfig({ adminPassword: 'short' }))).toThrow(/at least 10 characters/);
    expect(() => seedDatabase(db, testConfig({ adminPassword: '' }))).toThrow(/required/);
    expect(() => seedDatabase(db, testConfig({ adminUsername: '' }))).toThrow(/required/);
    expect(isDatabaseEmpty(db)).toBe(true);
  });

  it('links a repo only when it clearly matches a project, and tolerates GitHub being down', async () => {
    const db = openDb(':memory:');
    seedDatabase(db, testConfig());
    expect(await linkProjectRepos(db, { getRepos: async () => { throw new Error('offline'); } })).toEqual([]);

    const github = { getRepos: async () => ({ repos: [{ name: 'Honest-Eye', url: 'https://github.com/o/Honest-Eye' }, { name: 'medical', url: 'x' }] }) };
    const linked = await linkProjectRepos(db, github);
    expect(linked).toEqual([{ title: 'Honest Eye', repo: 'https://github.com/o/Honest-Eye' }]);
    const urls = db.prepare('SELECT slug, repo_url FROM projects ORDER BY sort_order').all();
    expect(urls.map((p) => p.repo_url)).toEqual(['https://github.com/o/Honest-Eye', '', '']);
    expect(await linkProjectRepos(db, github)).toEqual([]); // already linked
  });
});
