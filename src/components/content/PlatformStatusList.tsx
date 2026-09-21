import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { validatePlatformContent } from "@/services/platform-service";
import type { ContentPlatform } from "@/types";

import { PlatformBadge } from "./PlatformBadge";

const PS_COLOR: Record<string, string> = {
  not_planned: "bg-gray-100 text-gray-600",
  draft: "bg-slate-200 text-slate-700",
  scheduled: "bg-sky-100 text-sky-700",
  posted: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-zinc-200 text-zinc-600",
};

interface PlatformStatusListProps {
  platforms: ContentPlatform[];
  onEdit?: (p: ContentPlatform) => void;
}

export function PlatformStatusList({ platforms, onEdit }: PlatformStatusListProps) {
  if (platforms.length === 0) return <p className="text-sm text-muted-foreground">No platforms added.</p>;

  return (
    <div className="space-y-3">
      {platforms.map((p) => (
        <div
          key={p.id}
          className={cn("flex items-start justify-between rounded-lg border p-3 text-sm", onEdit && "cursor-pointer hover:bg-accent")}
          onClick={onEdit ? () => onEdit(p) : undefined}
        >
          <div className="space-y-1">
            <PlatformBadge platform={p.platform_name} />
            <div className="text-xs text-muted-foreground">
              {p.scheduled_at ? `Scheduled: ${formatDateTime(p.scheduled_at)}` : "Not scheduled"}
            </div>
            {(() => {
              const validation = validatePlatformContent(p.platform_name, p.caption, p.hashtags);
              return (
                <div className="max-w-md space-y-1 text-xs">
                  <p className="line-clamp-2 text-foreground/80">{validation.preview || "No caption preview"}</p>
                  {validation.warnings.map((warning) => <p key={warning} className="text-amber-600">{warning}</p>)}
                </div>
              );
            })()}
            {p.post_url && (
              <a href={p.post_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                View post ↗
              </a>
            )}
          </div>
          <Badge className={cn(PS_COLOR[p.platform_status] ?? "bg-muted")}>
            {p.platform_status.replace(/_/g, " ")}
          </Badge>
        </div>
      ))}
    </div>
  );
}
