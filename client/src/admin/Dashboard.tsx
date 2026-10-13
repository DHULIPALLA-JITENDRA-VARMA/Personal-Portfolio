import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Suspense, lazy, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getStats, type StatTotal, type Stats } from '../api';
import { cn } from '../lib/design';
import { prettyUrl } from '../lib/format';
import { Notice, PageHeader, useLoad } from './ui';

const VisitorsChart = lazy(() => import('./Charts').then((m) => ({ default: m.VisitorsChart })));
const DailyBarChart = lazy(() => import('./Charts').then((m) => ({ default: m.DailyBarChart })));

const RANGES = [7, 30, 90];
const CARDS: Array<{ key: keyof Stats['totals']; label: string }> = [
  { key: 'page_views', label: 'Page views' },
  { key: 'unique_visitors', label: 'Unique visitors' },
  { key: 'project_clicks', label: 'Project clicks' },
  { key: 'resume_downloads', label: 'Resume downloads' },
  { key: 'outbound_clicks', label: 'Outbound clicks' },
  { key: 'messages', label: 'Messages' },
];

function Change({ total }: { total: StatTotal }) {
  if (total.change_pct === null) return <span className="text-muted">No earlier data</span>;
  const up = total.change_pct > 0;
  const flat = total.change_pct === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-1', flat ? 'text-gray-400' : up ? 'text-success' : 'text-danger')}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {up ? '+' : ''}
      {total.change_pct}%<span className="text-muted">vs previous</span>
    </span>
  );
}

function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('panel p-5 md:p-6', className)}>
      <h2 className="mb-4 text-sm text-gray-400">{title}</h2>
      {children}
    </section>
  );
}

function RankList({ rows, empty }: { rows: Array<{ label: string; value: number; href?: string }>; empty: string }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ol className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="truncate text-cream" title={row.label}>{row.label}</span>
            <span className="tabular-nums text-gray-400">{row.value.toLocaleString()}</span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-white/5">
            <div className="h-1 rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

const chartFallback = <div className="h-48 animate-pulse rounded-xl bg-white/5" />;

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useLoad(() => getStats(days), [days]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={data ? `${data.range.from} to ${data.range.to} (UTC), compared with the ${data.days} days before.` : 'Privacy-friendly analytics for your portfolio.'}
        actions={
          <div role="group" aria-label="Date range" className="flex rounded-full border border-white/10 p-1">
            {RANGES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={days === n}
                onClick={() => setDays(n)}
                className={cn('rounded-full px-4 py-2.5 text-xs transition-colors duration-200', days === n ? 'bg-primary font-bold text-black' : 'text-gray-400 hover:text-cream')}
              >
                {n} days
              </button>
            ))}
          </div>
        }
      />
      <Notice>{error}</Notice>
      {!data && loading && <div className="h-40 animate-pulse rounded-2xl bg-white/5" role="status" aria-label="Loading statistics" />}

      {data && (
        <div className={cn('space-y-4 transition-opacity duration-200', loading && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {CARDS.map(({ key, label }) => (
              <section key={key} className="panel p-5">
                <h2 className="text-xs text-gray-400">{label}</h2>
                <p className="mt-3 text-3xl tabular-nums text-cream">{data.totals[key].value.toLocaleString()}</p>
                <p className="mt-2 text-[11px]">
                  <Change total={data.totals[key]} />
                </p>
              </section>
            ))}
          </div>

          <Card title="Visitors per day">
            <Suspense fallback={chartFallback}>
              <VisitorsChart data={data.visitors_per_day} />
            </Suspense>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Resume downloads per day">
              <Suspense fallback={chartFallback}>
                <DailyBarChart data={data.resume_downloads_per_day} name="Downloads" />
              </Suspense>
            </Card>
            <Card title="Messages per day">
              <Suspense fallback={chartFallback}>
                <DailyBarChart data={data.messages_per_day} name="Messages" />
              </Suspense>
              <p className="mt-3 text-xs text-muted">
                <Link to="/admin/messages" className="underline decoration-white/20 underline-offset-4 hover:text-cream">
                  Open the inbox
                </Link>
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Top pages">
              <RankList empty="No page views in this period." rows={data.top_pages.map((p) => ({ label: p.path, value: p.views }))} />
            </Card>
            <Card title="Top project clicks">
              <RankList empty="No project clicks in this period." rows={data.top_projects.map((p) => ({ label: p.path.replace('/projects/', ''), value: p.clicks }))} />
            </Card>
            <Card title="Outbound clicks">
              <RankList empty="No outbound clicks in this period." rows={data.outbound_clicks.map((o) => ({ label: `${o.kind} · ${prettyUrl(o.url)}`, value: o.count }))} />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
