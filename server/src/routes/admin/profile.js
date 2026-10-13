import { Router } from 'express';
import { getProfile } from '../../lib/content.js';
import { memoryUpload, removeUpload, saveUpload } from '../../lib/upload.js';
import { HttpError } from '../../middleware/errors.js';
import { validate } from '../../middleware/validate.js';
import { profileSchema } from './schemas.js';

const RESUME_MAX_BYTES = 5 * 1024 * 1024;

export function profileRoutes({ db, config }) {
  const router = Router();
  const current = () => getProfile(db, { includePrivate: true });
  const resumeFile = () => db.prepare('SELECT resume_file FROM profile WHERE id = 1').get()?.resume_file;

  router.get('/profile', (req, res) => {
    const profile = current();
    if (!profile) throw new HttpError(404, 'Profile not found');
    res.json(profile);
  });

  router.put('/profile', validate(profileSchema), (req, res) => {
    const data = Object.fromEntries(Object.entries(req.valid.body).filter(([, v]) => v !== undefined));
    data.updated_at = new Date().toISOString();
    if (!current()) {
      db.prepare('INSERT INTO profile (id, updated_at) VALUES (1, ?)').run(data.updated_at);
    }
    const sets = Object.keys(data).map((c) => `${c} = @${c}`).join(', ');
    db.prepare(`UPDATE profile SET ${sets} WHERE id = 1`).run(data);
    res.json(current());
  });

  router.post('/resume', memoryUpload(RESUME_MAX_BYTES), (req, res) => {
    if (!current()) throw new HttpError(404, 'Profile not found');
    const previous = resumeFile();
    const filename = saveUpload(config.uploadDir, req.file, ['pdf'], 'resume-');
    db.prepare('UPDATE profile SET resume_file = ?, updated_at = ? WHERE id = 1').run(filename, new Date().toISOString());
    removeUpload(config.uploadDir, previous);
    res.json({ has_resume: true, size: req.file.size });
  });

  router.delete('/resume', (req, res) => {
    const previous = resumeFile();
    db.prepare('UPDATE profile SET resume_file = NULL, updated_at = ? WHERE id = 1').run(new Date().toISOString());
    removeUpload(config.uploadDir, previous);
    res.json({ has_resume: false });
  });

  return router;
}
