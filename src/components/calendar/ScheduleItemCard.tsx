import { ContentStatusBadge } from "@/components/content/ContentStatusBadge";
import { PlatformBadge } from "@/components/content/PlatformBadge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import type { ContentItem, ContentPlatform } from "@/types";

interface ScheduleItemCardProps {
  item: ContentItem;
  platform?: ContentPlatform;
  onClick?: () => void;
}

export function ScheduleItemCard({ item, platform, onClick }: ScheduleItemCardProps) {
  const time = platform?.scheduled_at ?? item.scheduled_at;
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto w-full items-start justify-start gap-2 bg-card p-2 text-left text-xs font-normal hover:bg-accent"
    >
      <div className="flex-1 space-y-1">
        <div className="font-medium text-sm">{item.title}</div>
        <div className="text-muted-foreground">{time ? formatDateTime(time) : "—"}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {platform && <PlatformBadge platform={platform.platform_name} />}
        <ContentStatusBadge status={item.master_status} />
      </div>
    </Button>
  );
}
