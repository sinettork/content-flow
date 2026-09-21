import {
  FileText,
  FilePenLine,
  Eye,
  CheckCircle2,
  CalendarClock,
  Send,
  AlertTriangle,
  Activity,
  BarChart3,
  Plus,
  Radio,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "@/components/cards/MetricCard";
import { PlatformSummaryCard } from "@/components/cards/PlatformSummaryCard";
import { StatusDistribution } from "@/components/charts/StatusDistribution";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fromNow, formatDate } from "@/lib/dates";
import { reportService, activityService, profileService } from "@/services";
import type { DashboardMetrics } from "@/services/report-service";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import type { ActivityLog, ContentItem, Profile } from "@/types";

export function DashboardPage() {
  const navigate = useNavigate();
  const setContentFilters = useUiStore((s) => s.setContentFilters);
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [upcoming, setUpcoming] = useState<ContentItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, sched, logs, profs] = await Promise.all([
          reportService.dashboard(),
          reportService.scheduled(),
          activityService.recent(8),
          profileService.listForWorkspace(workspaceId ?? ""),
        ]);
        setMetrics(m);
        setUpcoming(sched.slice(0, 5));
        setRecentLogs(logs);
        setProfileMap(Object.fromEntries(profs.map((p) => [p.id, p])));
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId]);

  if (loading) return <PageSkeleton />;
  if (!metrics) return <p className="py-10 text-center text-sm text-muted-foreground">Failed to load dashboard data.</p>;

  const metricCards = [
    { label: "Total content", value: metrics.total, icon: <FileText className="h-4 w-4" /> },
    { label: "Drafts", value: metrics.byStatus.draft, status: "draft" as const, icon: <FilePenLine className="h-4 w-4" /> },
    { label: "In review", value: metrics.byStatus.in_review, status: "in_review" as const, icon: <Eye className="h-4 w-4" /> },
    { label: "Approved", value: metrics.byStatus.approved, status: "approved" as const, icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Scheduled this week", value: metrics.scheduledThisWeek, icon: <CalendarClock className="h-4 w-4" />, destination: "/app/calendar" },
    { label: "Posted this month", value: metrics.postedThisMonth, status: "posted" as const, icon: <Send className="h-4 w-4" /> },
    { label: "Overdue", value: metrics.overdue, icon: <AlertTriangle className="h-4 w-4" />, destination: "/app/my-work" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of content operations, upcoming publishing work, and recent team activity."
        actions={
          <Button onClick={() => navigate("/app/content/new")}>
            <Plus className="h-4 w-4" />
            New content
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((m) => (
          <button
            key={m.label}
            type="button"
            className="text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              if (m.status) setContentFilters({ status: m.status });
              navigate(m.destination ?? "/app/content");
            }}
          >
            <MetricCard label={m.label} value={m.value} icon={m.icon} />
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upcoming */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Radio className="h-4 w-4 text-muted-foreground" />
              Upcoming Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {upcoming.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nothing scheduled.</p>}
            {upcoming.map((it) => (
              <Button
                type="button"
                variant="ghost"
                key={it.id}
                className="h-auto w-full justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-normal transition-colors duration-100 hover:bg-muted/60"
                onClick={() => navigate(`/app/content/${it.id}`)}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(it.scheduled_at, "MMM d, h:mm a")}</div>
                </div>
                <ContentStatusBadge status={it.master_status} />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {recentLogs.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>}
            {recentLogs.map((log) => {
              const u = profileMap[log.user_id];
              const initials = (u?.full_name ?? "?")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div key={log.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/40">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      <span className="font-medium">{u?.full_name ?? "Unknown"}</span>{" "}
                      <span className="text-muted-foreground">{log.action_type.replace(/\./g, " ")}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{fromNow(log.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Platform summary */}
        <div className="space-y-6">
          <PlatformSummaryCard counts={metrics.byPlatform} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusDistribution counts={metrics.byStatus} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
