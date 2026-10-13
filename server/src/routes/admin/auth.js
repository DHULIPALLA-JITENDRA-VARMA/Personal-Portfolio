import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/errors.js';
import { validate } from '../../middleware/validate.js';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

// Compared against when the username is unknown, so both failure paths cost one bcrypt round
// and response time does not reveal whether a username exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

export function authRoutes({ db, auth, limits }) {
  const router = Router();

  router.post('/login', limits.login, validate(loginSchema), async (req, res) => {
    const { username, password } = req.valid.body;
    const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
    const ok = await bcrypt.compare(password, admin?.password_hash || DUMMY_HASH);
    if (!admin || !ok) throw new HttpError(401, 'Invalid username or password');
    auth.issueSession(res, admin);
    res.json({ username: admin.username });
  });

  router.post('/logout', (req, res) => {
    auth.clearSession(res);
    res.json({ ok: true });
  });

  router.get('/me', auth.requireAuth, (req, res) => res.json({ username: req.admin.username }));

  return router;
}
