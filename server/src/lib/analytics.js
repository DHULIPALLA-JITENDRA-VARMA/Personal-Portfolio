const DAY_MS = 24 * 60 * 60 * 1000;
const dayStart = (ms) => new Date(Math.floor(ms / DAY_MS) * DAY_MS);
const iso = (d) => d.toISOString();

function pctChange(value, previous) {
  if (!previous) return null; // no baseline: "n/a" is more honest than +infinity
  return Math.round(((value - previous) / previous) * 1000) / 10;
}

export function outboundKind(url) {
  if (/linkedin\.com/i.test(url)) return 'LinkedIn';
  if (/github\.com/i.test(url)) return 'GitHub';
  return 'Live demo';
}

// All buckets are UTC days. The current period is the last `days` days including today;
// the previous period is the `days` days immediately before it.
export function getStats(db, { days = 30, now = new Date() } = {}) {
  const end = new Date(dayStart(now.getTime()).getTime() + DAY_MS); // exclusive: tomorrow 00:00Z
  const start = new Date(end.getTime() - days * DAY_MS);
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  const cur = [iso(start), iso(end)];
  const prev = [iso(prevStart), iso(start)];

  const dates = Array.from({ length: days }, (_, i) => iso(new Date(start.getTime() + i * DAY_MS)).slice(0, 10));
  const fill = (rows, shape) => {
    const byDate = new Map(rows.map((r) => [r.date, r]));
    return dates.map((date) => ({ date, ...shape, ...byDate.get(date) }));
  };

  const countEvents = db.prepare('SELECT COUNT(*) AS n FROM events WHERE type = ? AND created_at >= ? AND created_at < ?');
  // visitor_hash already rotates daily, so COUNT(DISTINCT) over a range equals the sum of daily uniques.
  const countUnique = db.prepare(
    "SELECT COUNT(DISTINCT visitor_hash) AS n FROM events WHERE type = 'page_view' AND created_at >= ? AND created_at < ?",
  );
  const countMessages = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE created_at >= ? AND created_at < ?');
  const perDay = db.prepare(
    `SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count, COUNT(DISTINCT visitor_hash) AS uniq
     FROM events WHERE type = ? AND created_at >= ? AND created_at < ? GROUP BY date`,
  );
  const topPaths = db.prepare(
    `SELECT path, COUNT(*) AS count FROM events
     WHERE type = ? AND created_at >= ? AND created_at < ? GROUP BY path ORDER BY count DESC, path LIMIT ?`,
  );

  const total = (value, previous) => ({ value, previous, change_pct: pctChange(value, previous) });
  const eventTotal = (type) => total(countEvents.get(type, ...cur).n, countEvents.get(type, ...prev).n);

  return {
    days,
    range: { from: dates[0], to: dates[dates.length - 1] },
    totals: {
      page_views: eventTotal('page_view'),
      unique_visitors: total(countUnique.get(...cur).n, countUnique.get(...prev).n),
      project_clicks: eventTotal('project_click'),
      resume_downloads: eventTotal('resume_download'),
      outbound_clicks: eventTotal('outbound_click'),
      messages: total(countMessages.get(...cur).n, countMessages.get(...prev).n),
    },
    visitors_per_day: fill(
      perDay.all('page_view', ...cur).map((r) => ({ date: r.date, views: r.count, unique: r.uniq })),
      { views: 0, unique: 0 },
    ),
    top_pages: topPaths.all('page_view', ...cur, 10).map((r) => ({ path: r.path, views: r.count })),
    top_projects: topPaths.all('project_click', ...cur, 10).map((r) => ({ path: r.path, clicks: r.count })),
    resume_downloads_per_day: fill(
      perDay.all('resume_download', ...cur).map((r) => ({ date: r.date, count: r.count })),
      { count: 0 },
    ),
    outbound_clicks: topPaths
      .all('outbound_click', ...cur, 20)
      .map((r) => ({ kind: outboundKind(r.path), url: r.path, count: r.count })),
    messages_per_day: fill(
      db
        .prepare(
          `SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count FROM messages
           WHERE created_at >= ? AND created_at < ? GROUP BY date`,
        )
        .all(...cur),
      { count: 0 },
    ),
  };
}
