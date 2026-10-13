import { Router } from 'express';
import { z } from 'zod';
import { isBot, visitorHash } from '../../lib/hash.js';
import { validate } from '../../middleware/validate.js';

export const EVENT_TYPES = ['page_view', 'project_click', 'resume_download', 'outbound_click'];

const trackSchema = z.object({
  type: z.enum(EVENT_TYPES),
  path: z.string().trim().min(1).max(300),
  ref: z.string().trim().max(300).optional().default(''),
});

export function recordEvent(db, config, req, { type, path, ref = '' }) {
  const userAgent = req.get('user-agent') || '';
  if (isBot(userAgent)) return false;
  db.prepare('INSERT INTO events (type, path, ref, visitor_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
    type,
    path,
    ref,
    visitorHash({ ip: req.ip, userAgent, secret: config.serverSecret }),
    new Date().toISOString(),
  );
  return true;
}

export function trackRoutes({ db, config, limits }) {
  const router = Router();
  // Always 204, including for ignored bots: the beacon caller never reads the response.
  router.post('/track', limits.track, validate(trackSchema), (req, res) => {
    recordEvent(db, config, req, req.valid.body);
    res.status(204).end();
  });
  return router;
}
