import { useEffect } from 'react';

/** Sets document.title (pass null to leave it alone) and optionally marks the page noindex. */
export function usePageTitle(title: string | null, noindex = false) {
  useEffect(() => {
    if (title) document.title = title;
    if (!noindex) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [title, noindex]);
}
