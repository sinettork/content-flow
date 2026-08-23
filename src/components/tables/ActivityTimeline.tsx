import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fromNow } from "@/lib/dates";
import type { ActivityLog, Profile } from "@/types";

interface ActivityTimelineProps {
  logs: ActivityLog[];
  profileMap: Record<string, Profile>;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ActivityTimeline({ logs, profileMap }: ActivityTimelineProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="relative border-l border-border pl-4">
      {logs.map((log) => {
        const user = profileMap[log.user_id];
        return (
          <li key={log.id} className="mb-4 last:mb-0">
            <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-background bg-muted-foreground" />
            <div className="flex items-start gap-2">
              <Avatar className="mt-0.5 h-6 w-6">
                <AvatarFallback className="text-[9px]">{user ? initials(user.full_name) : "?"}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <span className="font-medium">{user?.full_name ?? "Unknown"}</span>{" "}
                <span className="text-muted-foreground">{log.action_type.replace(/\./g, " ")}</span>
                <div className="text-xs text-muted-foreground">{fromNow(log.created_at)}</div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
