import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

const fromRoot = (p) => (p === ':memory:' || path.isAbsolute(p) ? p : path.resolve(ROOT_DIR, p));

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  const serverSecret = env.SERVER_SECRET || '';
  if (serverSecret.length < 32 && nodeEnv !== 'test') {
    throw new Error('SERVER_SECRET must be set to at least 32 characters (see .env.example).');
  }
  return {
    nodeEnv,
    isProd,
    isTest: nodeEnv === 'test',
    port: Number(env.PORT) || 4000,
    dbPath: fromRoot(env.DB_PATH || './data/portfolio.db'),
    uploadDir: fromRoot(env.UPLOAD_DIR || './uploads'),
    clientDist: path.join(ROOT_DIR, 'client/dist'),
    serverSecret: serverSecret || 'test-secret-test-secret-test-secret-0000',
    adminUsername: env.ADMIN_USERNAME || '',
    adminPassword: env.ADMIN_PASSWORD || '',
    githubUsername: env.GITHUB_USERNAME || '',
    githubUrl: env.GITHUB_URL || '',
    githubToken: env.GITHUB_TOKEN || '',
    linkedinUrl: env.LINKEDIN_URL || '',
    clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5173',
    siteUrl: (env.SITE_URL || '').replace(/\/$/, ''),
    // Secure cookies need HTTPS; overridable so a production build can be smoke-tested over plain http.
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
    // Extra origin allowed to serve the decorative hero video (see client/src/lib/design.ts).
    mediaOrigin: env.MEDIA_ORIGIN ?? 'https://d8j0ntlcm91z4.cloudfront.net',
    smtp: {
      host: env.SMTP_HOST || '',
      port: Number(env.SMTP_PORT) || 587,
      user: env.SMTP_USER || '',
      pass: env.SMTP_PASS || '',
      to: env.SMTP_TO || '',
    },
  };
}
