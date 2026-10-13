import { useEffect } from 'react';
import type { Profile } from '../api';

function setMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
}

interface Props {
  profile: Profile;
  title?: string;
  description?: string;
  image?: string | null;
}

// Keeps <head> in sync on client-side navigation. In production the server already renders
// the same tags into index.html (server/src/lib/seo.js) for crawlers that do not run JS.
export function Seo({ profile, title, description, image }: Props) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${profile.name}` : `${profile.name} · ${profile.headline}`;
    const desc = description || profile.summary;
    const url = window.location.origin + window.location.pathname;
    document.title = fullTitle;
    setMeta('meta[name="description"]', { name: 'description', content: desc });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: desc });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: title ? 'article' : 'profile' });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    if (image) setMeta('meta[property="og:image"]', { property: 'og:image', content: window.location.origin + image });

    let script = document.getElementById('person-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'person-jsonld';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.name,
      jobTitle: profile.headline,
      description: profile.summary,
      email: profile.email ? `mailto:${profile.email}` : undefined,
      address: profile.location || undefined,
      url: window.location.origin,
      sameAs: [profile.linkedin_url, profile.github_url].filter(Boolean),
    });
  }, [profile, title, description, image]);
  return null;
}
