// Read-side helpers shared by the public and admin routes: rows -> API shapes.
const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const uploadUrl = (file) => (file ? `/uploads/${file}` : null);

export function toProject(row) {
  if (!row) return null;
  return {
    ...row,
    tech_stack: parseJson(row.tech_stack, []),
    image: uploadUrl(row.image),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
  };
}

export const toExperience = (row) => ({ ...row, bullets: parseJson(row.bullets, []) });

export function getProfile(db, { includePrivate = false } = {}) {
  const row = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  if (!row) return null;
  const { id, resume_file, phone, show_phone, ...rest } = row;
  const profile = { ...rest, has_resume: Boolean(resume_file) };
  // The phone number only leaves the server when the owner has opted in.
  if (includePrivate) return { ...profile, phone, show_phone: Boolean(show_phone) };
  return show_phone ? { ...profile, phone } : profile;
}

export function getSkillsGrouped(db) {
  const rows = db.prepare('SELECT * FROM skills ORDER BY sort_order, id').all();
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.category)) groups.set(row.category, []);
    groups.get(row.category).push({ id: row.id, name: row.name });
  }
  return [...groups].map(([category, items]) => ({ category, items }));
}

export function getProjects(db, { publishedOnly = true, featuredOnly = false } = {}) {
  const where = [];
  if (publishedOnly) where.push('published = 1');
  if (featuredOnly) where.push('featured = 1');
  const sql = `SELECT * FROM projects ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY sort_order, id`;
  return db.prepare(sql).all().map(toProject);
}

export const getProjectBySlug = (db, slug) =>
  toProject(db.prepare('SELECT * FROM projects WHERE slug = ? AND published = 1').get(slug));

export const getExperience = (db) =>
  db.prepare('SELECT * FROM experience ORDER BY sort_order, id').all().map(toExperience);
export const getEducation = (db) => db.prepare('SELECT * FROM education ORDER BY sort_order, id').all();
export const getCertifications = (db) => db.prepare('SELECT * FROM certifications ORDER BY sort_order, id').all();
export const getAchievements = (db) => db.prepare('SELECT * FROM achievements ORDER BY sort_order, id').all();

export const getPortfolio = (db) => ({
  profile: getProfile(db),
  skills: getSkillsGrouped(db),
  projects: getProjects(db),
  experience: getExperience(db),
  education: getEducation(db),
  certifications: getCertifications(db),
  achievements: getAchievements(db),
});
