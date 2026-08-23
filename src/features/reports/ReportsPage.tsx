import { AlertTriangle, CalendarClock, Layers, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { MetricCard } from "@/components/cards/MetricCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { PlatformBadge } from "@/components/content/PlatformBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/dates";
import { reportService, platformService } from "@/services";
import type { DashboardMetrics } from "@/services/report-service";
import type { ContentItem, ContentPlatform } from "@/types";

type Tab = "scheduled" | "posted" | "overdue";

export function ReportsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("scheduled");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [scheduled, setScheduled] = useState<ContentItem[]>([]);
  const [posted, setPosted] = useState<ContentItem[]>([]);
  const [overdue, setOverdue] = useState<ContentItem[]>([]);
  const [platformMap, setPlatformMap] = useState<Record<string, ContentPlatform[]>>({});

  useEffect(() => {
    (async () => {
      const [m, sched, post, over] = await Promise.all([
        reportService.dashboard(),
        reportService.scheduled(),
        reportService.posted(),
        reportService.overdue(),
      ]);
      setMetrics(m);
      setScheduled(sched);
      setPosted(post);
      setOverdue(over);

      const allItems = [...sched, ...post, ...over];
      setPlatformMap(await platformService.listForItems([...new Set(allItems.map((item) => item.id))]));
    })();
  }, []);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "scheduled", label: "Scheduled", count: scheduled.length },
    { key: "posted", label: "Posted", count: posted.length },
    { key: "overdue", label: "Overdue", count: overdue.length },
  ];

  const current = tab === "scheduled" ? scheduled : tab === "posted" ? posted : overdue;

  const renderTable = (items: ContentItem[]) => {
    if (items.length === 0) return <EmptyState title="No items" description="Nothing here yet." icon={<Layers className="h-6 w-6" />} />;
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Platforms
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Scheduled
                </span>
              </TableHead>
              {tab === "posted" && (
                <TableHead>
                  <span className="flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Posted
                  </span>
                </TableHead>
              )}
              {tab === "overdue" && (
                <TableHead>
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Due
                  </span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
              {items.map((item) => {
                const plats = platformMap[item.id] ?? [];
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/app/content/${item.id}`)}
                  >
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="capitalize">{item.content_type}</TableCell>
                    <TableCell><ContentStatusBadge status={item.master_status} /></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {plats.map((p) => <PlatformBadge key={p.id} platform={p.platform_name} />)}
                        {plats.length === 0 && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(item.scheduled_at)}</TableCell>
                    {tab === "posted" && <TableCell className="text-muted-foreground">{formatDateTime(item.posted_at)}</TableCell>}
                    {tab === "overdue" && (
                      <TableCell className="font-medium text-destructive">{formatDate(item.due_at)}</TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Reports" description="Content delivery insights." />

      {metrics && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Scheduled" value={scheduled.length} icon={<CalendarClock className="h-4 w-4" />} />
          <MetricCard label="Posted this month" value={metrics.postedThisMonth} icon={<Send className="h-4 w-4" />} />
          <MetricCard label="Overdue" value={overdue.length} icon={<AlertTriangle className="h-4 w-4" />} />
        </div>
      )}

      <div className="mb-4 flex gap-1">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label} <Badge variant="secondary" className="ml-1.5">{t.count}</Badge>
          </Button>
        ))}
      </div>

      {renderTable(current)}
    </>
  );
}
