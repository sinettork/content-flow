export const FACEBOOK_INSIGHT_METRICS = [
  "page_total_media_view_unique",
  "page_daily_follows_unique",
  "page_daily_unfollows_unique",
  "page_follows",
] as const;

export interface FacebookDailyInsight {
  metric_date: string;
  unique_viewers: number | null;
  daily_follows: number | null;
  daily_unfollows: number | null;
  total_followers: number | null;
  updated_at: string;
}

export type FacebookInsightValues = Omit<FacebookDailyInsight, "updated_at">;

export interface FacebookInsightsWindow {
  since: string;
  /** Exclusive end date: the current UTC date, whose daily period is not yet closed. */
  until: string;
}

export function getFacebookInsightsWindow(days: 30 | 90, now = new Date()): FacebookInsightsWindow {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { since: start.toISOString().slice(0, 10), until: end.toISOString().slice(0, 10) };
}

export interface MetaInsightPoint {
  value?: unknown;
  end_time?: string;
}

export interface MetaInsightMetric {
  name?: string;
  values?: MetaInsightPoint[];
}

function parseCount(value: unknown): number | null {
  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(count) && count >= 0 ? Math.round(count) : null;
}

function parseMetricDate(endTime: string | undefined): string | null {
  if (!endTime) return null;
  const endDate = endTime.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return null;
  const date = new Date(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

const metricToColumn: Record<string, keyof Omit<FacebookDailyInsight, "metric_date" | "updated_at">> = {
  page_total_media_view_unique: "unique_viewers",
  page_daily_follows_unique: "daily_follows",
  page_daily_unfollows_unique: "daily_unfollows",
  page_follows: "total_followers",
};

export function mapMetaInsights(metrics: MetaInsightMetric[]): FacebookInsightValues[] {
  const byDate = new Map<string, FacebookInsightValues>();

  for (const metric of metrics) {
    const column = metric.name ? metricToColumn[metric.name] : undefined;
    if (!column) continue;

    for (const point of metric.values ?? []) {
      const date = parseMetricDate(point.end_time);
      const value = parseCount(point.value);
      if (!date || value === null) continue;

      const row = byDate.get(date) ?? {
        metric_date: date,
        unique_viewers: null,
        daily_follows: null,
        daily_unfollows: null,
        total_followers: null,
      };
      row[column] = value;
      byDate.set(date, row);
    }
  }

  return [...byDate.values()].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
}

export function mergeMetaInsightsWithExisting(
  incoming: FacebookInsightValues[],
  existing: FacebookDailyInsight[],
): FacebookInsightValues[] {
  const previous = new Map(existing.map((row) => [row.metric_date, row]));
  return incoming.map((row) => {
    const old = previous.get(row.metric_date);
    return {
      ...row,
      unique_viewers: row.unique_viewers ?? old?.unique_viewers ?? null,
      daily_follows: row.daily_follows ?? old?.daily_follows ?? null,
      daily_unfollows: row.daily_unfollows ?? old?.daily_unfollows ?? null,
      total_followers: row.total_followers ?? old?.total_followers ?? null,
    };
  });
}

export function fillFacebookInsightCalendar(
  rows: FacebookDailyInsight[],
  days: 30 | 90,
  now = new Date(),
): FacebookDailyInsight[] {
  const window = getFacebookInsightsWindow(days, now);
  const byDate = new Map(rows.map((row) => [row.metric_date, row]));
  const date = new Date(`${window.since}T00:00:00Z`);
  const until = new Date(`${window.until}T00:00:00Z`);
  const calendar: FacebookDailyInsight[] = [];

  while (date < until) {
    const metricDate = date.toISOString().slice(0, 10);
    calendar.push(byDate.get(metricDate) ?? {
      metric_date: metricDate,
      unique_viewers: null,
      daily_follows: null,
      daily_unfollows: null,
      total_followers: null,
      updated_at: "",
    });
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return calendar;
}

export interface MetricCoverage {
  total: number | null;
  coveredDays: number;
  expectedDays: number;
  complete: boolean;
}

export interface FacebookInsightsSummary {
  latestViewers: number | null;
  latestViewersDate: string | null;
  follows: MetricCoverage;
  unfollows: MetricCoverage;
  netFollows: number | null;
  latestFollowers: number | null;
  latestFollowersDate: string | null;
}

function summarizeSeries(
  rows: FacebookDailyInsight[],
  key: "daily_follows" | "daily_unfollows",
  expectedDays: number,
): MetricCoverage {
  const values = rows.filter((row) => row[key] !== null);
  return {
    total: values.length ? values.reduce((sum, row) => sum + (row[key] ?? 0), 0) : null,
    coveredDays: values.length,
    expectedDays,
    complete: values.length >= expectedDays,
  };
}

export function summarizeFacebookInsights(rows: FacebookDailyInsight[], expectedDays: number): FacebookInsightsSummary {
  const latest = [...rows].sort((a, b) => b.metric_date.localeCompare(a.metric_date));
  const latestViewersRow = latest.find((row) => row.unique_viewers !== null);
  const latestFollowersRow = latest.find((row) => row.total_followers !== null);
  const follows = summarizeSeries(rows, "daily_follows", expectedDays);
  const unfollows = summarizeSeries(rows, "daily_unfollows", expectedDays);

  return {
    latestViewers: latestViewersRow?.unique_viewers ?? null,
    latestViewersDate: latestViewersRow?.metric_date ?? null,
    follows,
    unfollows,
    netFollows: follows.complete && unfollows.complete && follows.total !== null && unfollows.total !== null
      ? follows.total - unfollows.total
      : null,
    latestFollowers: latestFollowersRow?.total_followers ?? null,
    latestFollowersDate: latestFollowersRow?.metric_date ?? null,
  };
}
