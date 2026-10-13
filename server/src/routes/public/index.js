import { Router } from 'express';
import { contactRoutes } from './contact.js';
import { contentRoutes } from './content.js';
import { resumeRoutes } from './resume.js';
import { trackRoutes } from './track.js';

export function publicRoutes(ctx) {
  const router = Router();
  const startedAt = Date.now();

  router.get('/health', (req, res) => {
    ctx.db.prepare('SELECT 1').get();
    res.json({ status: 'ok', uptime_s: Math.round((Date.now() - startedAt) / 1000), time: new Date().toISOString() });
  });

  router.get('/github/repos', async (req, res) => {
    const result = await ctx.github.getRepos();
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ username: ctx.config.githubUsername, ...result });
  });

  router.use(contentRoutes(ctx), contactRoutes(ctx), trackRoutes(ctx), resumeRoutes(ctx));
  return router;
}

const xmlEscape = (s) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
export const baseUrl = (config, req) => config.siteUrl || `${req.protocol}://${req.get('host')}`;

// Mounted at the site root (not under /api) because crawlers look for these at fixed paths.
export function seoRoutes({ db, config }) {
  const router = Router();

  router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${baseUrl(config, req)}/sitemap.xml\n`);
  });

  router.get('/sitemap.xml', (req, res) => {
    const base = baseUrl(config, req);
    const profile = db.prepare('SELECT updated_at FROM profile WHERE id = 1').get();
    const projects = db.prepare('SELECT slug, updated_at FROM projects WHERE published = 1 ORDER BY sort_order, id').all();
    const urls = [
      { loc: `${base}/`, lastmod: profile?.updated_at, priority: '1.0' },
      ...projects.map((p) => ({ loc: `${base}/projects/${p.slug}`, lastmod: p.updated_at, priority: '0.8' })),
    ];
    const body = urls
      .map(
        (u) =>
          `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}\n    <priority>${u.priority}</priority>\n  </url>`,
      )
      .join('\n');
    res
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  });

  return router;
}
