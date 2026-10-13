import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Stats } from '../api';

// Loaded lazily from Dashboard.tsx so recharts stays out of the initial admin bundle.
const SERIES_1 = 'var(--chart-1)';
const SERIES_2 = 'var(--chart-2)';
const AXIS = { fontSize: 11, fill: '#9ca3af' };
const GRID = 'rgba(255,255,255,0.06)';

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

const tooltipProps = {
  labelFormatter: (label: string) => shortDate(label),
  contentStyle: { background: '#000', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12, padding: '8px 12px' },
  labelStyle: { color: '#9ca3af', marginBottom: 4 },
  itemStyle: { color: '#E1E0CC', padding: 0 },
};

const xAxis = (
  <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={28} tickMargin={8} />
);
const yAxis = <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={32} />;

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function VisitorsChart({ data }: { data: Stats['visitors_per_day'] }) {
  return (
    <figure aria-label="Page views and unique visitors per day">
      <Legend items={[{ label: 'Page views', color: SERIES_1 }, { label: 'Unique visitors', color: SERIES_2 }]} />
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            {xAxis}
            {yAxis}
            <Tooltip {...tooltipProps} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
            <Line type="monotone" dataKey="views" name="Page views" stroke={SERIES_1} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: '#101010', strokeWidth: 2 }} />
            <Line type="monotone" dataKey="unique" name="Unique visitors" stroke={SERIES_2} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: '#101010', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function DailyBarChart({ data, name }: { data: Array<{ date: string; count: number }>; name: string }) {
  return (
    <figure aria-label={`${name} per day`} className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="25%">
          <CartesianGrid stroke={GRID} vertical={false} />
          {xAxis}
          {yAxis}
          <Tooltip {...tooltipProps} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="count" name={name} fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
