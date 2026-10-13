import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { HttpError } from '../../middleware/errors.js';
import { recordEvent } from './track.js';

export function resumeRoutes({ db, config }) {
  const router = Router();
  router.get('/resume', (req, res, next) => {
    const profile = db.prepare('SELECT name, resume_file FROM profile WHERE id = 1').get();
    const file = profile?.resume_file && path.join(config.uploadDir, path.basename(profile.resume_file));
    if (!file || !fs.existsSync(file)) return next(new HttpError(404, 'No resume has been uploaded yet'));

    recordEvent(db, config, req, { type: 'resume_download', path: '/api/resume', ref: req.get('referer') || '' });
    const filename = `${profile.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Resume'}-Resume.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': fs.statSync(file).size,
      'Cache-Control': 'no-store',
    });
    return fs.createReadStream(file).on('error', next).pipe(res);
  });
  return router;
}
