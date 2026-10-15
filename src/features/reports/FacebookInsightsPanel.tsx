import { AlertTriangle, Eye, Facebook, Info, RefreshCw, UserMinus, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "@/components/cards/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseBackend } from "@/lib/backend";
import { fillFacebookInsightCalendar, summarizeFacebookInsights, type FacebookDailyInsight } from "@/lib/facebook-insights";
import { automationService, facebookInsightsService } from "@/services";
import type { SocialConnection } from "@/services/automation-service";
import type { InsightsRange } from "@/services/facebook-insights-service";
import { useAuthStore } from "@/stores/auth-store";

interface ChartSeries {
  name: string;
  color: string;
  values: Array<number | null>;
}

function MetricLineChart({ rows, series }: { rows: FacebookDailyInsight[]; series: ChartSeries[] }) {
  const width = 720;
  const height = 210;
  const left = 12;
  const right = width - 12;
  const top = 12;
  const bottom = 166;
  const allValues = series.flatMap((line) => line.values.filter((value): value is number => value !== null));
  const max = Math.max(1, ...allValues);
  const xFor = (index: number) => rows.length < 2 ? (left + right) / 2 : left + (index / (rows.length - 1)) * (right - left);
  const yFor = (value: number) => bottom - (value / max) * (bottom - top);
  const labelIndexes = new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1]);

  const pathFor = (values: Array<number | null>) => {
    let path = "";
    let penDown = false;
    values.forEach((value, index) => {
      if (value === null) {
        penDown = false;
        return;
      }
      path += `${penDown ? " L" : " M"}${xFor(index).toFixed(1)} ${yFor(value).toFixed(1)}`;
      penDown = true;
    });
    return path;
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((line) => (
          <div key={line.name} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
            {line.name}
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[210px] w-full" role="img" aria-label={series.map((line) => line.name).join(" and ")}>
        {[0, 0.5, 1].map((ratio) => {
          const y = bottom - ratio * (bottom - top);
          return <line key={ratio} x1={left} x2={right} y1={y} y2={y} stroke="currentColor" className="text-border" strokeDasharray="3 5" />;
        })}
        {series.map((line) => (
          <g key={line.name}>
            <path d={pathFor(line.values)} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {line.values.map((value, index) => value === null ? null : <circle key={`${line.name}-${index}`} cx={xFor(index)} cy={yFor(value)} r={rows.length === 1 ? 4 : 2.5} fill={line.color} />)}
          </g>
        ))}
        {[...labelIndexes].filter((index) => index >= 0 && rows[index]).map((index) => {
          const row = rows[index];
          const label = new Date(`${row.metric_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
          return <text key={index} x={xFor(index)} y={height - 6} textAnchor={index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"} className="fill-muted-foreground" fontSize="11">{label}</text>;
        })}
      </svg>
    </div>
  );
}

function number(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
}

function lastUpdated(rows: FacebookDailyInsight[]) {
  const latest = rows.map((row) => row.updated_at).filter(Boolean).sort().at(-1);
  if (!latest) return null;
  return new Date(latest).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function FacebookInsightsPanel() {
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.profile?.role);
  const canSync = role === "admin" || role === "manager";
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [days, setDays] = useState<InsightsRange>(30);
  const [rows, setRows] = useState<FacebookDailyInsight[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingConnections(true);
    automationService.listConnections()
      .then((items) => {
        if (!active) return;
        const pages = items.filter((item) => item.provider === "facebook" && item.account_type === "page" && item.status !== "disconnected");
        setConnections(pages);
        setSelectedId((current) => current || pages.find((page) => page.status === "active")?.id || pages[0]?.id || "");
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load connected Facebook Pages.");
      })
      .finally(() => { if (active) setLoadingConnections(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId || !isSupabaseBackend) {
      setRows([]);
      return;
    }
    let active = true;
    setLoadingRows(true);
    setError(null);
    facebookInsightsService.listDaily(selectedId, days)
      .then((data) => { if (active) setRows(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load saved Facebook Insights."); })
      .finally(() => { if (active) setLoadingRows(false); });
    return () => { active = false; };
  }, [selectedId, days, refreshKey]);

  const activeConnection = connections.find((connection) => connection.id === selectedId);
  const summary = useMemo(() => summarizeFacebookInsights(rows, days), [rows, days]);
  const updated = lastUpdated(rows);
  const chartRows = fillFacebookInsightCalendar(rows, days);
  const hasCharts = rows.some((row) => row.unique_viewers !== null || row.daily_follows !== null || row.daily_unfollows !== null || row.total_followers !== null);

  const sync = async () => {
    if (!activeConnection || activeConnection.status !== "active" || !canSync) return;
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await facebookInsightsService.syncPage(activeConnection.id, days);
      setNotice(result.synced_days ? `Updated ${result.synced_days} daily records (${result.since} through ${result.through}).` : "Meta returned no daily Insights for this Page and period.");
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Facebook Insights sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section aria-labelledby="facebook-insights-title" className="mb-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            <h2 id="facebook-insights-title" className="text-lg font-semibold">Facebook Page Insights</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{activeConnection ? `${activeConnection.name} · daily viewers and audience growth` : "Track daily viewers and audience growth for connected Pages."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connections.length > 1 && (
            <label className="sr-only" htmlFor="facebook-insights-page">Choose Facebook Page</label>
          )}
          {connections.length > 1 && (
            <select id="facebook-insights-page" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="h-9 max-w-[220px] rounded-md border bg-background px-3 text-sm">
              {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.name}</option>)}
            </select>
          )}
          <div className="flex rounded-md border p-0.5" aria-label="Insights date range">
            {([30, 90] as const).map((value) => (
              <Button key={value} type="button" size="sm" variant={days === value ? "default" : "ghost"} onClick={() => setDays(value)} aria-pressed={days === value}>
                {value} days
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void sync()} disabled={!activeConnection || activeConnection.status !== "active" || !canSync || syncing || loadingConnections}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync Insights"}
          </Button>
          {activeConnection && !canSync && <span className="text-xs text-muted-foreground">Admins/managers sync data</span>}
        </div>
      </div>

      {!isSupabaseBackend ? (
        <Card><CardContent className="flex items-start gap-3 p-5"><Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-medium">Live Facebook Insights require Supabase mode</p><p className="mt-1 text-sm text-muted-foreground">Mock mode does not contain real Page metrics. Switch to the configured Supabase backend and connect Meta to load verified data.</p></div></CardContent></Card>
      ) : loadingConnections ? (
        <Card><CardContent className="p-5 text-sm text-muted-foreground">Loading connected Pages…</CardContent></Card>
      ) : connections.length === 0 ? (
        <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><div className="flex items-start gap-3"><Facebook className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" /><div><p className="font-medium">No Facebook Page connected</p><p className="mt-1 text-sm text-muted-foreground">Connect a Meta Page in Automation before loading its Insights.</p></div></div><Button variant="outline" onClick={() => navigate("/app/automation")}>Manage channels</Button></CardContent></Card>
      ) : (
        <>
          {activeConnection?.status !== "active" && <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span>This Page connection is not active. Check its status in Automation before syncing. Existing saved history is still available.</span></div><Button variant="ghost" size="sm" onClick={() => navigate("/app/automation")}>Manage connection</Button></div>}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Unique viewers · latest available" value={number(summary.latestViewers)} trend={summary.latestViewersDate ?? "No daily value returned"} icon={<Eye className="h-4 w-4" />} />
            <MetricCard label={`Follows recorded · ${days} days`} value={number(summary.follows.total)} trend={`${summary.follows.coveredDays}/${days} days with data`} icon={<UserPlus className="h-4 w-4" />} />
            <MetricCard label={`Unfollows recorded · ${days} days`} value={number(summary.unfollows.total)} trend={`${summary.unfollows.coveredDays}/${days} days with data`} icon={<UserMinus className="h-4 w-4" />} />
            <MetricCard label={`Net follows · ${days} days`} value={number(summary.netFollows)} trend={summary.netFollows === null ? "Requires complete follows + unfollows coverage" : "Complete daily coverage"} icon={<Users className="h-4 w-4" />} />
            <MetricCard label="Followers · latest snapshot" value={number(summary.latestFollowers)} trend={summary.latestFollowersDate ?? "No daily value returned"} icon={<Users className="h-4 w-4" />} />
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div><CardTitle className="text-base">Daily trend</CardTitle><p className="mt-1 text-sm text-muted-foreground">{activeConnection?.name ?? "Facebook Page"} · {days}-day history</p></div>
              <Badge variant="secondary">Meta Graph API v26.0</Badge>
            </CardHeader>
            <CardContent className="space-y-5">
              {error && <div role="alert" className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div><Button variant="ghost" size="sm" onClick={() => navigate("/app/automation")}>Manage Meta connection</Button></div>}
              {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
              {loadingRows ? <div className="py-10 text-center text-sm text-muted-foreground">Loading saved Insights…</div> : !hasCharts ? (
                <div className="rounded-md border border-dashed p-6 text-center">
                  <p className="font-medium">No saved Insights for this period</p>
                  <p className="mx-auto mt-1 max-w-2xl text-sm text-muted-foreground">Select “Sync Insights” to import daily metrics. If Meta returns no data, confirm the Page has Insights access (Meta notes a 100-like minimum), the Meta app has `read_insights` and `pages_read_engagement`, and the connected person has the Page’s ANALYZE task.</p>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-md border p-4"><p className="mb-2 text-sm font-medium">Unique media viewers</p><MetricLineChart rows={chartRows} series={[{ name: "Viewers", color: "#1877F2", values: chartRows.map((row) => row.unique_viewers) }]} /></div>
                  <div className="rounded-md border p-4"><p className="mb-2 text-sm font-medium">Audience growth</p><MetricLineChart rows={chartRows} series={[{ name: "Follows", color: "#16A34A", values: chartRows.map((row) => row.daily_follows) }, { name: "Unfollows", color: "#DC2626", values: chartRows.map((row) => row.daily_unfollows) }]} /></div>
                  <div className="rounded-md border p-4 xl:col-span-2"><p className="mb-2 text-sm font-medium">Total followers</p><MetricLineChart rows={chartRows} series={[{ name: "Followers", color: "#7C3AED", values: chartRows.map((row) => row.total_followers) }]} /></div>
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                <p className="flex max-w-3xl items-start gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Meta retired the legacy Page reach metrics in 2026. Unique media viewers are the current replacement, so do not compare this series directly with older reach exports. Unique daily follows and unfollows are estimates from Meta.</span></p>
                <p className="shrink-0">{updated ? `Last synced ${updated}` : "Not synced yet"}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
