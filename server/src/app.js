import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createGithubService } from './lib/github.js';
import { createMailer } from './lib/mailer.js';
import { renderMeta } from './lib/seo.js';
import { createAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { createRateLimits } from './middleware/rateLimits.js';
import { adminRoutes } from './routes/admin/index.js';
import { baseUrl, publicRoutes, seoRoutes } from './routes/public/index.js';

export function createApp({ db, config, github, mailer }) {
  const app = express();
  const ctx = {
    db,
    config,
    github: github || createGithubService({ db, username: config.githubUsername, token: config.githubToken }),
    mailer: mailer || createMailer(config.smtp),
    limits: createRateLimits(),
    auth: createAuth(config),
  };

  app.disable('x-powered-by');
  // Behind Render's proxy the client address is in X-Forwarded-For; trust exactly one hop so
  // req.ip (used for rate limits and visitor hashing) cannot be spoofed with extra headers.
  if (config.isProd) app.set('trust proxy', 1);

  const media = config.mediaOrigin ? [config.mediaOrigin] : [];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // 'unsafe-inline' styles are needed for the animation library's inline transforms.
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", ...media],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use(seoRoutes(ctx));
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '7d', index: false, dotfiles: 'deny' }));
  app.use('/api/admin', adminRoutes(ctx));
  app.use('/api', ctx.limits.api, publicRoutes(ctx));
  app.use('/api', notFound);

  // Production: the same process serves the built client, with SPA fallback for client routes.
  const indexFile = path.join(config.clientDist, 'index.html');
  if (config.isProd && fs.existsSync(indexFile)) {
    const template = fs.readFileSync(indexFile, 'utf8');
    app.use(express.static(config.clientDist, { index: false, maxAge: '1h' }));
    app.use('/assets', notFound);
    app.get(/.*/, (req, res) => {
      const meta = req.path.startsWith('/admin')
        ? '<title>Admin</title>\n    <meta name="robots" content="noindex" />'
        : renderMeta(db, { path: req.path, baseUrl: baseUrl(config, req) });
      res.set('Cache-Control', 'no-cache').type('html').send(template.replace('<!--app-meta-->', meta));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
