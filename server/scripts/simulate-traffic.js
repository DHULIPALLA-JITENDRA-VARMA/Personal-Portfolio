// Fills the database with clearly-marked DEMO analytics events and messages so the admin
// dashboard has something to show (screenshots, demos). Safe to re-run: previous demo rows are
// replaced. `--clear` only removes them.
//
// Rows are written straight to SQLite rather than through POST /api/track because the public
// API (correctly) cannot backdate events. Demo rows are identifiable: every visitor_hash starts
// with "demo-" and every message subject starts with "[DEMO]".
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { sha256 } from '../src/lib/hash.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = 60; // 30 current + 30 previous, so "% change vs previous period" is meaningful

// Small seeded PRNG (mulberry32) so every run produces the same believable dataset.
function prng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = prng(20260101);
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (weighted) => {
  const total = weighted.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [value, w] of weighted) if ((r -= w) <= 0) return value;
  return weighted[0][0];
};

const config = loadConfig();
const db = openDb(config.dbPath);

const clear = () => {
  const events = db.prepare("DELETE FROM events WHERE visitor_hash LIKE 'demo-%'").run().changes;
  const messages = db.prepare("DELETE FROM messages WHERE subject LIKE '[DEMO]%'").run().changes;
  return { events, messages };
};

if (process.argv.includes('--clear')) {
  const removed = clear();
  console.log(`Removed ${removed.events} demo events and ${removed.messages} demo messages.`);
  db.close();
  process.exit(0);
}

const profile = db.prepare('SELECT linkedin_url, github_url FROM profile WHERE id = 1').get();
const projects = db.prepare('SELECT slug, live_url, repo_url, featured FROM projects WHERE published = 1 ORDER BY sort_order').all();
if (!profile || !projects.length) {
  console.error('Database has no content yet. Run `npm run seed` first.');
  db.close();
  process.exit(1);
}

const projectWeights = projects.map((p, i) => [p, p.featured ? 6 : 3 - Math.min(i, 2) * 0.5]);
const outbound = [
  [profile.linkedin_url, 5],
  [profile.github_url, 4],
  ...projects.filter((p) => p.live_url).map((p) => [p.live_url, 4]),
  ...projects.filter((p) => p.repo_url).map((p) => [p.repo_url, 2]),
].filter(([url]) => url);
const referrers = [['', 5], ['https://www.linkedin.com/', 4], ['https://github.com/', 3], ['https://www.google.com/', 3]];

const insertEvent = db.prepare('INSERT INTO events (type, path, ref, visitor_hash, created_at) VALUES (?, ?, ?, ?, ?)');
const insertMessage = db.prepare(
  "INSERT INTO messages (name, email, subject, body, status, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, 'demo')",
);

const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
const nowMs = Date.now();
let eventCount = 0;

db.transaction(() => {
  clear();

  for (let d = DAYS - 1; d >= 0; d -= 1) {
    const dayStart = today - d * DAY_MS;
    const weekday = new Date(dayStart).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    // Gentle upward trend towards today, quieter weekends, plus noise.
    const trend = 8 + ((DAYS - d) / DAYS) * 22;
    const visitors = Math.max(2, Math.round(trend * (weekend ? 0.55 : 1) * (0.7 + rand() * 0.6)));

    for (let v = 0; v < visitors; v += 1) {
      const visitor = `demo-${sha256(`${dayStart}:${v}`).slice(0, 40)}`;
      // Daytime-weighted timestamps (IST working hours ~ 04:00-16:00 UTC), never in the future.
      let at = dayStart + int(3, 17) * 3600_000 + int(0, 3599) * 1000;
      if (at > nowMs) at = dayStart + Math.floor(rand() * Math.max(1, nowMs - dayStart));
      const ref = pick(referrers);
      const stamp = () => new Date(Math.min((at += int(8, 90) * 1000), nowMs)).toISOString();
      const add = (type, path, r = '') => {
        insertEvent.run(type, path, r, visitor, stamp());
        eventCount += 1;
      };

      add('page_view', '/', ref);
      if (rand() < 0.45) {
        const project = pick(projectWeights);
        add('project_click', `/projects/${project.slug}`);
        add('page_view', `/projects/${project.slug}`);
        if (project.live_url && rand() < 0.4) add('outbound_click', project.live_url, `/projects/${project.slug}`);
        if (rand() < 0.3) add('page_view', '/');
        if (rand() < 0.25) {
          const second = pick(projectWeights);
          add('project_click', `/projects/${second.slug}`);
          add('page_view', `/projects/${second.slug}`);
        }
      }
      if (outbound.length && rand() < 0.22) add('outbound_click', pick(outbound), '/');
      if (rand() < 0.12) add('resume_download', '/api/resume', '/');
    }
  }

  const iso = (daysAgo, hour) => new Date(Math.min(today - daysAgo * DAY_MS + hour * 3600_000, nowMs - 60_000)).toISOString();
  const messages = [
    ['Demo Recruiter', 'recruiter@example.com', '[DEMO] Internship opportunity', 'This is sample data created by `npm run simulate-traffic`. Hi, we came across your Honest Eye project and would like to talk about a web development internship.', 'new', iso(0, 5)],
    ['Demo Founder', 'founder@example.com', '[DEMO] Freelance landing page', 'This is sample data created by `npm run simulate-traffic`. We need a responsive landing page for a small clinic. Are you available for freelance work this month?', 'new', iso(2, 9)],
    ['Demo Student', 'student@example.com', '[DEMO] Question about the Gemini integration', 'This is sample data created by `npm run simulate-traffic`. How did you combine the Gemini API and the Fact Check API to produce the credibility score?', 'read', iso(6, 13)],
    ['Demo Organiser', 'events@example.com', '[DEMO] Hackathon invitation', 'This is sample data created by `npm run simulate-traffic`. We are hosting a 24-hour hackathon next month and would love to have you participate.', 'read', iso(12, 7)],
    ['Demo Alumni', 'alumni@example.com', '[DEMO] Feedback on your portfolio', 'This is sample data created by `npm run simulate-traffic`. Nice work on the project write-ups. One suggestion: add screenshots to each project page.', 'archived', iso(21, 11)],
  ];
  for (const m of messages) insertMessage.run(...m);
})();

console.log(`Inserted ${eventCount} demo events across ${DAYS} days and 5 demo messages into ${config.dbPath}`);
console.log('Remove them any time with: npm run simulate-traffic -- --clear');
db.close();
