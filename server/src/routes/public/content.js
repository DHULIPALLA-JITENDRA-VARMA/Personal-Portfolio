import { Router } from 'express';
import * as content from '../../lib/content.js';
import { HttpError } from '../../middleware/errors.js';

export function contentRoutes({ db }) {
  const router = Router();

  router.get('/profile', (req, res) => {
    const profile = content.getProfile(db);
    if (!profile) throw new HttpError(404, 'Profile not found');
    res.json(profile);
  });
  router.get('/skills', (req, res) => res.json(content.getSkillsGrouped(db)));
  router.get('/projects', (req, res) =>
    res.json(content.getProjects(db, { featuredOnly: req.query.featured === '1' })),
  );
  router.get('/projects/:slug', (req, res) => {
    const project = content.getProjectBySlug(db, req.params.slug);
    if (!project) throw new HttpError(404, 'Project not found');
    res.json(project);
  });
  router.get('/experience', (req, res) => res.json(content.getExperience(db)));
  router.get('/education', (req, res) => res.json(content.getEducation(db)));
  router.get('/certifications', (req, res) => res.json(content.getCertifications(db)));
  router.get('/achievements', (req, res) => res.json(content.getAchievements(db)));

  // One round-trip for the first render. Express adds a weak ETag to res.json() and answers
  // If-None-Match with 304, so repeat visits after the 60s window cost only headers.
  router.get('/portfolio', (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json(content.getPortfolio(db));
  });

  return router;
}
