import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/design';

/** Loads data on mount and exposes reload + optimistic setData. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const result = await loader();
      if (id !== seq.current) return; // a newer request superseded this one
      setData(result);
      setError(null);
    } catch (err) {
      if (id === seq.current) setError((err as Error).message);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Admin`;
  }, [title]);
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl text-cream md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-gray-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Notice({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  if (!children) return null;
  const tone = {
    error: 'border-danger/30 bg-danger/10 text-danger',
    success: 'border-success/30 bg-success/10 text-success',
    info: 'border-white/10 bg-white/5 text-gray-400',
  }[kind];
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={cn('mb-5 rounded-xl border px-4 py-3 text-sm', tone)}>
      {children}
    </p>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 after:absolute after:-inset-2.5 disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-white/15',
      )}
    >
      <span className={cn('inline-block h-4 w-4 rounded-full transition-transform duration-200', checked ? 'translate-x-6 bg-black' : 'translate-x-1 bg-gray-300')} />
    </button>
  );
}

/** Two-step delete: the first click arms the button, the second (within 4s) confirms. */
export function ConfirmButton({ onConfirm, children, label }: { onConfirm: () => void; children: ReactNode; label: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <button
      type="button"
      aria-label={armed ? `Confirm: ${label}` : label}
      className={cn('btn-danger', armed && 'bg-danger/20')}
      onClick={() => {
        if (armed) onConfirm();
        setArmed(!armed);
      }}
    >
      {armed ? 'Confirm?' : children}
    </button>
  );
}

export function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors duration-200 hover:border-white/30 hover:text-cream after:absolute after:-inset-1.5 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
};
