import { Router } from 'express';
import { toProject } from '../../lib/content.js';
import { slugify, uniqueSlug } from '../../lib/slug.js';
import { memoryUpload, removeUpload, saveUpload } from '../../lib/upload.js';
import { HttpError } from '../../middleware/errors.js';
import { parseId, validate } from '../../middleware/validate.js';
import { reorder } from './collections.js';
import { partialOf, projectSchema, reorderSchema } from './schemas.js';

const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export function projectRoutes({ db, config }) {
  const router = Router();
  const raw = (id) => db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  const find = (id) => toProject(raw(id));

  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM projects ORDER BY sort_order, id').all().map(toProject));
  });

  router.get('/:id', parseId, (req, res) => {
    const project = find(req.id);
    if (!project) throw new HttpError(404, 'Project not found');
    res.json(project);
  });

  router.post('/', validate(projectSchema), (req, res) => {
    const { slug, sort_order, tech_stack, ...data } = req.valid.body;
    const now = new Date().toISOString();
    const info = db
      .prepare(
        `INSERT INTO projects (slug, title, tagline, description_md, tech_stack, live_url, repo_url, featured, published, sort_order, created_at, updated_at)
         VALUES (@slug, @title, @tagline, @description_md, @tech_stack, @live_url, @repo_url, @featured, @published, @sort_order, @now, @now)`,
      )
      .run({
        ...data,
        // The slug comes from the title unless one is supplied; either way it is made unique.
        slug: uniqueSlug(db, slug || data.title),
        tech_stack: JSON.stringify(tech_stack),
        sort_order: sort_order ?? db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM projects').get().n,
        now,
      });
    res.status(201).json(find(info.lastInsertRowid));
  });

  router.patch('/reorder', validate(reorderSchema), (req, res) => {
    reorder(db, 'projects', req.valid.body.ids);
    res.json({ ok: true });
  });

  // PUT and PATCH share one partial update, so the publish/featured toggles are just
  // `PATCH /projects/:id { published: true }`. The slug only changes when sent explicitly:
  // renaming a project must not break links that are already shared.
  const update = (req, res) => {
    if (!raw(req.id)) throw new HttpError(404, 'Project not found');
    const data = Object.fromEntries(Object.entries(req.valid.body).filter(([, v]) => v !== undefined));
    if (data.slug !== undefined) data.slug = uniqueSlug(db, slugify(data.slug), req.id);
    if (data.tech_stack) data.tech_stack = JSON.stringify(data.tech_stack);
    data.updated_at = new Date().toISOString();
    const sets = Object.keys(data).map((c) => `${c} = @${c}`).join(', ');
    db.prepare(`UPDATE projects SET ${sets} WHERE id = @id`).run({ ...data, id: req.id });
    res.json(find(req.id));
  };
  const updateSchema = partialOf(projectSchema);
  router.put('/:id', parseId, validate(updateSchema), update);
  router.patch('/:id', parseId, validate(updateSchema), update);

  router.delete('/:id', parseId, (req, res) => {
    const project = raw(req.id);
    if (!project) throw new HttpError(404, 'Project not found');
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.id);
    removeUpload(config.uploadDir, project.image);
    res.status(204).end();
  });

  router.post('/:id/image', parseId, memoryUpload(IMAGE_MAX_BYTES), (req, res) => {
    const project = raw(req.id);
    if (!project) throw new HttpError(404, 'Project not found');
    const filename = saveUpload(config.uploadDir, req.file, ['jpg', 'png', 'webp'], 'project-');
    db.prepare('UPDATE projects SET image = ?, updated_at = ? WHERE id = ?').run(filename, new Date().toISOString(), req.id);
    removeUpload(config.uploadDir, project.image);
    res.json(find(req.id));
  });

  router.delete('/:id/image', parseId, (req, res) => {
    const project = raw(req.id);
    if (!project) throw new HttpError(404, 'Project not found');
    db.prepare('UPDATE projects SET image = NULL, updated_at = ? WHERE id = ?').run(new Date().toISOString(), req.id);
    removeUpload(config.uploadDir, project.image);
    res.json(find(req.id));
  });

  return router;
}
