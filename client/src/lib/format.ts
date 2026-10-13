export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }) =>
  new Intl.DateTimeFormat('en', opts).format(new Date(iso));

export const formatDateTime = (iso: string) =>
  formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatRange = (start: string, end: string) => [start, end].filter(Boolean).join(' – ');

export const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

export const prettyUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
