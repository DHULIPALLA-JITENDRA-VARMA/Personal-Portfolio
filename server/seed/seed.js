import bcrypt from 'bcryptjs';
import { buildSeedData } from './data.js';
import { matchRepo } from '../src/lib/github.js';

const isEmpty = (db, table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n === 0;

export const isDatabaseEmpty = (db) => isEmpty(db, 'admin') && isEmpty(db, 'profile');

// Idempotent: content tables are only filled while they are empty, so re-running the seed never
// duplicates rows or overwrites edits made in the admin dashboard. The admin row is the one
// exception - it is upserted, which makes `npm run seed` the way to rotate ADMIN_PASSWORD.
export function seedDatabase(db, config) {
  const { adminUsername, adminPassword } = config;
  if (!adminUsername || !adminPassword) {
    throw new Error('Refusing to seed: ADMIN_USERNAME and ADMIN_PASSWORD are required.');
  }
  if (adminPassword.length < 10) {
    throw new Error('Refusing to seed: ADMIN_PASSWORD must be at least 10 characters.');
  }

  const data = buildSeedData(config);
  const now = new Date().toISOString();
  const seeded = [];

  db.transaction(() => {
    if (isEmpty(db, 'profile')) {
      db.prepare(
        `INSERT INTO profile (id, name, headline, summary, email, phone, show_phone, location, linkedin_url, github_url, updated_at)
         VALUES (1, @name, @headline, @summary, @email, @phone, @show_phone, @location, @linkedin_url, @github_url, @updated_at)`,
      ).run({ ...data.profile, updated_at: now });
      seeded.push('profile');
    }

    if (isEmpty(db, 'skills')) {
      const insert = db.prepare('INSERT INTO skills (category, name, sort_order) VALUES (?, ?, ?)');
      let order = 0;
      for (const [category, names] of data.skills) for (const name of names) insert.run(category, name, order++);
      seeded.push('skills');
    }

    if (isEmpty(db, 'projects')) {
      const insert = db.prepare(
        `INSERT INTO projects (slug, title, tagline, description_md, tech_stack, live_url, repo_url, featured, published, sort_order, created_at, updated_at)
         VALUES (@slug, @title, @tagline, @description_md, @tech_stack, @live_url, '', @featured, 1, @sort_order, @now, @now)`,
      );
      data.projects.forEach((p, i) => insert.run({ ...p, tech_stack: JSON.stringify(p.tech_stack), sort_order: i, now }));
      seeded.push('projects');
    }

    if (isEmpty(db, 'experience')) {
      const insert = db.prepare('INSERT INTO experience (role, company, start, "end", bullets, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      data.experience.forEach((e, i) => insert.run(e.role, e.company, e.start, e.end, JSON.stringify(e.bullets), i));
      seeded.push('experience');
    }

    if (isEmpty(db, 'education')) {
      const insert = db.prepare('INSERT INTO education (degree, institution, start, "end", score, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      data.education.forEach((e, i) => insert.run(e.degree, e.institution, e.start, e.end, e.score, i));
      seeded.push('education');
    }

    if (isEmpty(db, 'certifications')) {
      const insert = db.prepare("INSERT INTO certifications (title, issuer, url, sort_order) VALUES (?, ?, '', ?)");
      data.certifications.forEach((c, i) => insert.run(c.title, c.issuer, i));
      seeded.push('certifications');
    }

    if (isEmpty(db, 'achievements')) {
      const insert = db.prepare('INSERT INTO achievements (title, description, sort_order) VALUES (?, ?, ?)');
      data.achievements.forEach((a, i) => insert.run(a.title, a.description, i));
      seeded.push('achievements');
    }

    const hash = bcrypt.hashSync(adminPassword, config.isTest ? 4 : 12);
    db.prepare(
      `INSERT INTO admin (username, password_hash) VALUES (?, ?)
       ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash`,
    ).run(adminUsername, hash);
  })();

  return seeded;
}

// Fills repo_url for projects that have none, when a public repo clearly matches the title.
// Network failures are swallowed: an unreachable GitHub must not break seeding or boot.
export async function linkProjectRepos(db, github) {
  let repos;
  try {
    ({ repos } = await github.getRepos());
  } catch {
    return [];
  }
  const linked = [];
  const update = db.prepare('UPDATE projects SET repo_url = ?, updated_at = ? WHERE id = ?');
  for (const project of db.prepare("SELECT id, title FROM projects WHERE repo_url = ''").all()) {
    const repo = matchRepo(project.title, repos);
    if (!repo) continue;
    update.run(repo.url, new Date().toISOString(), project.id);
    linked.push({ title: project.title, repo: repo.url });
  }
  return linked;
}
