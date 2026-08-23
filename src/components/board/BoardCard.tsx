import { CalendarClock, GripVertical } from "lucide-react";

import { PlatformBadge } from "@/components/content/PlatformBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_ACCENTS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ContentItem, ContentPlatform, Profile } from "@/types";

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

interface BoardCardProps {
  item: ContentItem;
  platforms?: ContentPlatform[];
  assignee?: Profile | null;
  onClick?: () => void;
}

export function BoardCard({ item, platforms = [], assignee, onClick }: BoardCardProps) {
  const initials = assignee?.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card
      className="group relative cursor-grab overflow-hidden border-transparent bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-md active:cursor-grabbing active:shadow-lg"
      onClick={onClick}
    >
      <div className={cn("absolute left-0 top-0 h-full w-1", STATUS_ACCENTS[item.master_status])} />
      <CardContent className="space-y-3 p-4 pl-5 text-[13px]">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/45 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="text-sm font-semibold leading-snug">{item.title}</div>
        </div>
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {platforms.map((p) => (
              <PlatformBadge key={p.id} platform={p.platform_name} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[item.priority] ?? "bg-muted-foreground")} />
            <span className="capitalize text-muted-foreground">{item.priority}</span>
          </div>
          {item.due_at && (
            <span className="flex items-center gap-1 tabular-nums text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {formatDate(item.due_at, "MMM d")}
            </span>
          )}
        </div>
        {assignee && (
          <div className="flex items-center gap-2 pt-0.5">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground truncate">{assignee.full_name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
