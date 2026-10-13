import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { createGithubService } from './lib/github.js';
import { isDatabaseEmpty, linkProjectRepos, seedDatabase } from '../seed/seed.js';

const config = loadConfig();
const db = openDb(config.dbPath);
const github = createGithubService({ db, username: config.githubUsername, token: config.githubToken });

if (isDatabaseEmpty(db)) {
  const seeded = seedDatabase(db, config);
  console.log(`[seed] empty database seeded: ${seeded.join(', ')}`);
  linkProjectRepos(db, github).then((linked) => linked.forEach((l) => console.log(`[seed] linked ${l.title} -> ${l.repo}`)));
}

const server = createApp({ db, config, github }).listen(config.port, () => {
  console.log(`[server] ${config.nodeEnv} listening on http://localhost:${config.port}`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
