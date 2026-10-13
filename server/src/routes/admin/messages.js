import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/errors.js';
import { parseId, validate } from '../../middleware/validate.js';

const STATUSES = ['new', 'read', 'archived'];
const listSchema = z.object({
  status: z.enum(STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const statusSchema = z.object({ status: z.enum(STATUSES) });
const COLUMNS = 'id, name, email, subject, body, status, created_at';

export function messageRoutes({ db }) {
  const router = Router();
  const unread = () => db.prepare("SELECT COUNT(*) AS n FROM messages WHERE status = 'new'").get().n;

  router.get('/', validate(listSchema, 'query'), (req, res) => {
    const { status, page, limit } = req.valid.query;
    const where = status ? 'WHERE status = ?' : '';
    const params = status ? [status] : [];
    const total = db.prepare(`SELECT COUNT(*) AS n FROM messages ${where}`).get(...params).n;
    const items = db
      .prepare(`SELECT ${COLUMNS} FROM messages ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);
    res.json({ items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), unread: unread() });
  });

  router.get('/unread-count', (req, res) => res.json({ unread: unread() }));

  router.patch('/:id', parseId, validate(statusSchema), (req, res) => {
    const info = db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(req.valid.body.status, req.id);
    if (!info.changes) throw new HttpError(404, 'Message not found');
    res.json(db.prepare(`SELECT ${COLUMNS} FROM messages WHERE id = ?`).get(req.id));
  });

  router.delete('/:id', parseId, (req, res) => {
    const info = db.prepare('DELETE FROM messages WHERE id = ?').run(req.id);
    if (!info.changes) throw new HttpError(404, 'Message not found');
    res.status(204).end();
  });

  return router;
}
