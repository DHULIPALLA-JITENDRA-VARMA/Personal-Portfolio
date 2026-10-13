import { API_BASE } from './http';
import type { EventType } from './types';

const doNotTrack = () =>
  typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (window as { doNotTrack?: string }).doNotTrack === '1');

/**
 * Fire-and-forget analytics. Uses sendBeacon so the event survives the page unloading
 * (e.g. clicking an outbound link). Sends nothing when the visitor has Do Not Track enabled,
 * and never tracks the admin area.
 */
export function track(type: EventType, path: string, ref = document.referrer): void {
  if (doNotTrack() || window.location.pathname.startsWith('/admin')) return;
  const payload = JSON.stringify({ type, path: path.slice(0, 300), ref: ref.slice(0, 300) });
  try {
    const sent = navigator.sendBeacon?.(`${API_BASE}/track`, new Blob([payload], { type: 'application/json' }));
    if (sent) return;
  } catch {
    /* fall through to fetch */
  }
  void fetch(`${API_BASE}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export const trackPageView = (path: string) => track('page_view', path);
export const trackProjectClick = (slug: string) => track('project_click', `/projects/${slug}`, window.location.pathname);
export const trackOutbound = (url: string) => track('outbound_click', url, window.location.pathname);
