import { Archive, MailOpen, Reply, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { adminMessages, type Message, type MessageStatus } from '../api';
import { cn } from '../lib/design';
import { formatDateTime } from '../lib/format';
import { UNREAD_CHANGED } from './Layout';
import { ConfirmButton, Notice, PageHeader, useLoad } from './ui';

const FILTERS: Array<{ value: MessageStatus | undefined; label: string }> = [
  { value: undefined, label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
];
const PAGE_SIZE = 10;

const badge: Record<MessageStatus, string> = {
  new: 'bg-primary text-black',
  read: 'bg-white/10 text-gray-300',
  archived: 'border border-white/10 text-gray-500',
};

export default function MessagesPage() {
  const [status, setStatus] = useState<MessageStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState('');
  const { data, error, loading, reload } = useLoad(() => adminMessages.list({ status, page, limit: PAGE_SIZE }), [status, page]);

  async function act(action: () => Promise<unknown>) {
    setActionError('');
    try {
      await action();
    } catch (err) {
      setActionError((err as Error).message);
    }
    await reload();
    window.dispatchEvent(new Event(UNREAD_CHANGED));
  }
  const setMessageStatus = (m: Message, next: MessageStatus) => act(() => adminMessages.setStatus(m.id, next));

  return (
    <>
      <PageHeader
        title="Messages"
        description={data ? `${data.unread} unread · ${data.total} in this view` : 'Messages sent through the contact form.'}
        actions={
          <div role="group" aria-label="Filter by status" className="flex rounded-full border border-white/10 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                aria-pressed={status === f.value}
                onClick={() => { setStatus(f.value); setPage(1); }}
                className={cn('rounded-full px-3.5 py-1.5 text-xs transition-colors duration-200', status === f.value ? 'bg-primary font-bold text-black' : 'text-gray-400 hover:text-cream')}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />
      <Notice>{error || actionError}</Notice>
      {loading && !data && <div className="h-48 animate-pulse rounded-2xl bg-white/5" />}
      {data && data.items.length === 0 && <p className="panel p-8 text-sm text-gray-400">No messages{status ? ` marked “${status}”` : ' yet'}.</p>}

      {data && data.items.length > 0 && (
        <ul className={cn('space-y-3 transition-opacity duration-200', loading && 'opacity-60')}>
          {data.items.map((m) => (
            <li key={m.id} className={cn('panel p-5 md:p-6', m.status === 'new' && 'border-primary/30')}>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', badge[m.status])}>{m.status}</span>
                    <h2 className="text-base text-cream">{m.subject || '(no subject)'}</h2>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {m.name} · <a href={`mailto:${m.email}`} className="underline decoration-white/20 underline-offset-2 hover:text-cream">{m.email}</a>
                  </p>
                </div>
                <time dateTime={m.created_at} className="text-xs tabular-nums text-gray-500">{formatDateTime(m.created_at)}</time>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-primary/80">{m.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a className="btn-ghost" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>
                  <Reply className="h-4 w-4" aria-hidden /> Reply
                </a>
                {m.status === 'new' && (
                  <button type="button" className="btn-ghost" onClick={() => setMessageStatus(m, 'read')}>
                    <MailOpen className="h-4 w-4" aria-hidden /> Mark read
                  </button>
                )}
                {m.status !== 'new' && (
                  <button type="button" className="btn-ghost" onClick={() => setMessageStatus(m, 'new')}>
                    <Undo2 className="h-4 w-4" aria-hidden /> Mark unread
                  </button>
                )}
                {m.status !== 'archived' && (
                  <button type="button" className="btn-ghost" onClick={() => setMessageStatus(m, 'archived')}>
                    <Archive className="h-4 w-4" aria-hidden /> Archive
                  </button>
                )}
                <ConfirmButton label={`Delete message from ${m.name}`} onConfirm={() => act(() => adminMessages.remove(m.id))}>
                  Delete
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm text-gray-400">
          <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="tabular-nums">
            Page {data.page} of {data.pages}
          </span>
          <button type="button" className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </nav>
      )}
    </>
  );
}
