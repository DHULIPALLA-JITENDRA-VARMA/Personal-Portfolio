import { getProfile, getProjectBySlug } from './content.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const personSchema = (profile, url) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  jobTitle: profile.headline,
  description: profile.summary,
  email: profile.email ? `mailto:${profile.email}` : undefined,
  address: profile.location || undefined,
  url,
  sameAs: [profile.linkedin_url, profile.github_url].filter(Boolean),
});

// Crawlers and link-preview bots do not run the SPA, so the tags they need (title, description,
// Open Graph, JSON-LD) are rendered into index.html on the server from the same profile row.
export function renderMeta(db, { path, baseUrl }) {
  const profile = getProfile(db);
  if (!profile) return '';
  const slug = path.match(/^\/projects\/([^/]+)\/?$/)?.[1];
  const project = slug ? getProjectBySlug(db, slug) : null;
  const title = project ? `${project.title} · ${profile.name}` : `${profile.name} · ${profile.headline}`;
  const description = project ? project.tagline || profile.summary : profile.summary;
  const url = `${baseUrl}${path === '/' ? '' : path}`;
  const image = project?.image ? `${baseUrl}${project.image}` : '';
  // "<" is escaped so the JSON can never close the surrounding <script> element.
  const jsonLd = JSON.stringify(personSchema(profile, baseUrl)).replace(/</g, '\\u003c');
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${project ? 'article' : 'profile'}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image && `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<script type="application/ld+json" id="person-jsonld">${jsonLd}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');
}
