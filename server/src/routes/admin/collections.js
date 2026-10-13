import { Router } from 'express';
import { HttpError } from '../../middleware/errors.js';
import { parseId, validate } from '../../middleware/validate.js';
import { collections, partialOf, reorderSchema } from './schemas.js';

const q = (col) => `"${col}"`; // "end" is a reserved word in SQL

// Applies a new order in one transaction; ids not present in the table are rejected.
export function reorder(db, table, ids) {
  const existing = new Set(db.prepare(`SELECT id FROM ${table}`).all().map((r) => r.id));
  if (new Set(ids).size !== ids.length || ids.some((id) => !existing.has(id))) {
    throw new HttpError(400, 'ids must be unique and refer to existing rows');
  }
  const update = db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  db.transaction(() => ids.forEach((id, index) => update.run(index, id)))();
}

// Generic CRUD for the simple list tables. Table and column names come only from the static
// `collections` map (never from the request), so interpolating them into SQL is safe.
function crudRouter(db, table, { schema, json = [] }) {
  const router = Router();
  const updateSchema = partialOf(schema);
  const encode = (data) =>
    Object.fromEntries(Object.entries(data).map(([k, v]) => [k, json.includes(k) ? JSON.stringify(v) : v]));
  const decode = (row) => {
    if (!row) return row;
    const out = { ...row };
    for (const k of json) out[k] = JSON.parse(row[k] || '[]');
    return out;
  };
  const find = (id) => decode(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));

  router.get('/', (req, res) => {
    res.json(db.prepare(`SELECT * FROM ${table} ORDER BY sort_order, id`).all().map(decode));
  });

  router.post('/', validate(schema), (req, res) => {
    const data = encode(req.valid.body);
    data.sort_order ??= db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM ${table}`).get().n;
    const cols = Object.keys(data);
    const info = db
      .prepare(`INSERT INTO ${table} (${cols.map(q).join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`)
      .run(data);
    res.status(201).json(find(info.lastInsertRowid));
  });

  router.patch('/reorder', validate(reorderSchema), (req, res) => {
    reorder(db, table, req.valid.body.ids);
    res.json({ ok: true });
  });

  router.put('/:id', parseId, validate(updateSchema), (req, res) => {
    if (!find(req.id)) throw new HttpError(404, 'Not found');
    const data = encode(Object.fromEntries(Object.entries(req.valid.body).filter(([, v]) => v !== undefined)));
    const cols = Object.keys(data);
    if (cols.length) {
      db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${q(c)} = @${c}`).join(', ')} WHERE id = @id`).run({ ...data, id: req.id });
    }
    res.json(find(req.id));
  });

  router.delete('/:id', parseId, (req, res) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.id);
    if (!info.changes) throw new HttpError(404, 'Not found');
    res.status(204).end();
  });

  return router;
}

export function collectionRoutes({ db }) {
  const router = Router();
  for (const [table, def] of Object.entries(collections)) router.use(`/${table}`, crudRouter(db, table, def));
  return router;
}
