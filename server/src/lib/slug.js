export function slugify(text) {
  const slug = String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'project';
}

// Appends -2, -3, ... until the slug is free. `excludeId` lets a project keep its own slug on update.
export function uniqueSlug(db, title, excludeId = null) {
  const base = slugify(title);
  const taken = db.prepare('SELECT 1 FROM projects WHERE slug = ? AND id IS NOT ?');
  let slug = base;
  for (let n = 2; taken.get(slug, excludeId); n += 1) slug = `${base}-${n}`;
  return slug;
}
