import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { PlatformBadge } from "@/components/content/PlatformBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ContentItem, ContentPlatform, Profile } from "@/types";

interface ContentCardProps {
  item: ContentItem;
  platforms?: ContentPlatform[];
  assignee?: Profile | null;
  className?: string;
  onClick?: () => void;
}

export function ContentCard({ item, platforms = [], assignee, className, onClick }: ContentCardProps) {
  const initials = assignee?.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card
      className={cn("cursor-pointer transition-shadow hover:shadow-md", className)}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight">{item.title}</CardTitle>
          <ContentStatusBadge status={item.master_status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {platforms.map((p) => (
              <PlatformBadge key={p.id} platform={p.platform_name} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>{item.scheduled_at ? formatDate(item.scheduled_at) : "Not scheduled"}</span>
          {assignee && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
