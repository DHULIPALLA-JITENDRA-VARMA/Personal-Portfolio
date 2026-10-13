import { Router } from 'express';
import { z } from 'zod';
import { getStats } from '../../lib/analytics.js';
import { validate } from '../../middleware/validate.js';
import { authRoutes } from './auth.js';
import { collectionRoutes } from './collections.js';
import { messageRoutes } from './messages.js';
import { profileRoutes } from './profile.js';
import { projectRoutes } from './projects.js';

const statsSchema = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

export function adminRoutes(ctx) {
  const router = Router();
  const { auth } = ctx;

  // Admin responses are private and must never be cached by browsers or proxies.
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Order matters: the CSRF header is checked before anything else (including login), then
  // /login, /logout and /me are reachable without a session, and everything after requires one.
  router.use(auth.requireCsrfHeader);
  router.use(authRoutes(ctx));
  router.use(auth.requireAuth);

  router.get('/stats', validate(statsSchema, 'query'), (req, res) => {
    res.json(getStats(ctx.db, { days: req.valid.query.days }));
  });
  router.use(profileRoutes(ctx));
  router.use('/projects', projectRoutes(ctx));
  router.use('/messages', messageRoutes(ctx));
  router.use(collectionRoutes(ctx));

  return router;
}
