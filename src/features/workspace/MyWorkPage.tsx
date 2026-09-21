import { CalendarClock, CheckCircle2, Clock3 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { contentService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import type { ContentItem } from "@/types";

function dayStart(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function MyWorkPage() {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    contentService.list({ assigned_to: userId }).then(setItems).catch(() => setItems([]));
  }, [userId]);

  const groups = useMemo(() => {
    const today = dayStart();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const overdue: ContentItem[] = [];
    const todayItems: ContentItem[] = [];
    const upcoming: ContentItem[] = [];
    for (const item of items) {
      if (!item.due_at) {
        upcoming.push(item);
        continue;
      }
      const due = new Date(item.due_at);
      if (due < today) overdue.push(item);
      else if (due < tomorrow) todayItems.push(item);
      else if (due < weekEnd) upcoming.push(item);
    }
    return { overdue, todayItems, upcoming };
  }, [items]);

  const section = (title: string, list: ContentItem[], icon: ReactNode) => (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm">{icon}{title}<span className="text-xs font-normal text-muted-foreground">({list.length})</span></CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {list.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nothing here.</p>}
        {list.map((item) => (
          <Button key={item.id} variant="ghost" className="h-auto w-full justify-between gap-3 px-3 py-2 text-left" onClick={() => navigate(`/app/content/${item.id}`)}>
            <span className="min-w-0 truncate font-medium">{item.title}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <ContentStatusBadge status={item.master_status} /> {item.due_at && formatDate(item.due_at, "MMM d")}
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageHeader title="My Work" description="A focused queue of content assigned to you, starting with what needs attention today." />
      <div className="grid gap-4 md:grid-cols-3">
        {section("Overdue", groups.overdue, <Clock3 className="h-4 w-4 text-destructive" />)}
        {section("Due today", groups.todayItems, <CheckCircle2 className="h-4 w-4 text-amber-500" />)}
        {section("Next 7 days", groups.upcoming, <CalendarClock className="h-4 w-4 text-primary" />)}
      </div>
    </>
  );
}
