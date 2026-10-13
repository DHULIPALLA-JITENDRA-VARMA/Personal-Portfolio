// Captures the README screenshots against a throwaway production build:
// build -> start on a free port with a temp database -> seed -> simulate traffic -> log in ->
// capture -> shut everything down. Nothing touches your real ./data or ./uploads.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots');
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

function run(label, command, args, env) {
  console.log(`> ${label}`);
  const result = spawnSync(command, args, { cwd: ROOT, env, stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.status !== 0) throw new Error(`${label} failed (exit ${result.status})`);
}

async function waitForHealth(base, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server did not become healthy in time');
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-shots-'));
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const admin = { username: 'admin', password: crypto.randomBytes(12).toString('hex') };
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(port),
  DB_PATH: path.join(tmp, 'portfolio.db'),
  UPLOAD_DIR: path.join(tmp, 'uploads'),
  SERVER_SECRET: crypto.randomBytes(32).toString('hex'),
  ADMIN_USERNAME: admin.username,
  ADMIN_PASSWORD: admin.password,
  COOKIE_SECURE: 'false', // the temp server is plain http
  SITE_URL: '',
};

let server;
let browser;
try {
  run('build client', 'npm', ['run', 'build'], process.env);
  run('seed temp database', 'node', ['server/seed/run.js'], env);
  run('simulate traffic', 'node', ['server/scripts/simulate-traffic.js'], env);

  console.log(`> start server on ${base}`);
  server = spawn('node', ['server/src/index.js'], { cwd: ROOT, env, stdio: ['ignore', 'inherit', 'inherit'] });
  await waitForHealth(base);

  // Prefer an installed Google Chrome: unlike bundled Chromium it can decode the H.264 hero
  // video. Without it the CSS gradient fallback is captured instead.
  browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  fs.mkdirSync(OUT, { recursive: true });

  const shot = async (page, name) => {
    await page.screenshot({ path: path.join(OUT, name) });
    console.log(`  saved docs/screenshots/${name}`);
  };
  // Entrance animations start when an element scrolls into view, so walk the whole page once
  // (a streaming background video means 'networkidle' never fires, so waits are explicit)
  // (as a visitor would) before taking any picture.
  const settle = async (page) => {
    await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = 'auto';
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
  };
  const scrollTo = async (page, selector, offset = 72) => {
    await page.evaluate(
      ([sel, off]) => window.scrollTo(0, document.querySelector(sel).getBoundingClientRect().top + window.scrollY - off),
      [selector, offset],
    );
    await page.waitForTimeout(900);
  };

  const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.warn('  [page error]', err.message));

  console.log('> public pages');
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForSelector('#github li a, #github p', { timeout: 15000 });
  await settle(page);
  await page.waitForTimeout(1500);
  await shot(page, 'home.png');
  await scrollTo(page, '#projects');
  await shot(page, 'projects.png');
  await scrollTo(page, '#contact');
  await shot(page, 'contact.png');

  await page.goto(`${base}/projects/honest-eye`, { waitUntil: 'load' });
  await page.waitForSelector('.prose-portfolio');
  await settle(page);
  await shot(page, 'project-detail.png');

  console.log('> admin pages');
  await page.goto(`${base}/admin`, { waitUntil: 'load' });
  await page.fill('input[name="username"]', admin.username);
  await page.fill('input[name="password"]', admin.password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.recharts-line', { timeout: 15000 });
  await page.waitForTimeout(1800); // let the chart draw-in animation finish
  await shot(page, 'admin-dashboard.png');

  await page.goto(`${base}/admin/projects`, { waitUntil: 'load' });
  await page.waitForSelector('table tbody tr');
  await shot(page, 'admin-projects.png');

  await page.goto(`${base}/admin/messages`, { waitUntil: 'load' });
  await page.waitForSelector('main ul li h2');
  await shot(page, 'admin-messages.png');
  await context.close();

  console.log('> mobile');
  const mobile = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mpage = await mobile.newPage();
  await mpage.goto(base, { waitUntil: 'load' });
  await mpage.waitForSelector('#contact');
  await settle(mpage);
  await mpage.waitForTimeout(1500);
  await shot(mpage, 'home-mobile.png');
  await mobile.close();

  console.log('Done.');
} catch (err) {
  console.error(`Screenshots failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve));
    server.kill('SIGTERM');
    await exited;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
