import { Router } from 'express';
import { z } from 'zod';
import { ipHash } from '../../lib/hash.js';
import { validate } from '../../middleware/validate.js';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be at most 60 characters'),
  email: z.string().trim().max(254).pipe(z.email('Enter a valid email address')),
  subject: z.string().trim().max(100, 'Subject must be at most 100 characters').default(''),
  body: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be at most 2000 characters'),
});

export function contactRoutes({ db, config, mailer, limits }) {
  const router = Router();

  // Honeypot: `website` is hidden from humans, so only bots fill it. They get the same 201 as a
  // real submission (no signal to adapt to) and the message is dropped before validation.
  const honeypot = (req, res, next) => {
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      return res.status(201).json({ ok: true });
    }
    return next();
  };

  router.post('/contact', limits.contact, honeypot, validate(contactSchema), (req, res) => {
    const message = req.valid.body;
    const info = db
      .prepare(
        `INSERT INTO messages (name, email, subject, body, status, created_at, ip_hash)
         VALUES (@name, @email, @subject, @body, 'new', @created_at, @ip_hash)`,
      )
      .run({ ...message, created_at: new Date().toISOString(), ip_hash: ipHash(req.ip, config.serverSecret) });
    // Fire-and-forget: the response never waits on (or fails because of) SMTP.
    mailer.sendContactNotification({ id: info.lastInsertRowid, ...message });
    res.status(201).json({ ok: true });
  });

  return router;
}
