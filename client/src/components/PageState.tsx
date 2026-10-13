import type { ReactNode } from 'react';

export function Spinner({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary ${className}`} />;
}

// Full-screen loading / error / empty placeholder for route-level states.
export function PageState({ title, children, loading = false }: { title: string; children?: ReactNode; loading?: boolean }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center" role={loading ? 'status' : undefined}>
      {loading && <Spinner className="h-6 w-6" />}
      <h1 className="text-2xl text-cream sm:text-3xl">{title}</h1>
      {children && <div className="max-w-md text-sm text-gray-400">{children}</div>}
    </main>
  );
}
