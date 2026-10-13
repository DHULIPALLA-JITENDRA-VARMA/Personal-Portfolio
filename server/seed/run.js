import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { createGithubService } from '../src/lib/github.js';
import { linkProjectRepos, seedDatabase } from './seed.js';

const config = loadConfig();
const db = openDb(config.dbPath);
try {
  const seeded = seedDatabase(db, config);
  console.log(seeded.length ? `Seeded: ${seeded.join(', ')}` : 'Content already present - nothing inserted.');
  console.log(`Admin user "${config.adminUsername}" is up to date.`);
  const github = createGithubService({ db, username: config.githubUsername, token: config.githubToken });
  const linked = await linkProjectRepos(db, github);
  for (const l of linked) console.log(`Linked repo: ${l.title} -> ${l.repo}`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  db.close();
}
