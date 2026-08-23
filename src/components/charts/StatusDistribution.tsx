import { Progress } from "@/components/ui/progress";
import { MASTER_STATUSES, STATUS_COLORS, type MasterStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LABELS: Record<MasterStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes req.",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  archived: "Archived",
};

interface StatusDistributionProps {
  counts: Record<MasterStatus, number>;
}

export function StatusDistribution({ counts }: StatusDistributionProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-3">
      {MASTER_STATUSES.map((s) => {
        const pct = Math.round((counts[s] / total) * 100);
        return (
          <div key={s} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{LABELS[s]}</span>
              <span className="text-muted-foreground tabular-nums">
                {counts[s]} <span className="opacity-60">({pct}%)</span>
              </span>
            </div>
            <Progress value={pct} indicatorClassName={cn("transition-all duration-500", STATUS_COLORS[s].split(" ")[0])} />
          </div>
        );
      })}
    </div>
  );
}
