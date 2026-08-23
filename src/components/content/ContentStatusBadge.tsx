import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, type MasterStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LABELS: Record<MasterStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  archived: "Archived",
};

export function ContentStatusBadge({ status, className }: { status: MasterStatus; className?: string }) {
  return <Badge className={cn("rounded-md px-2.5 font-semibold", STATUS_COLORS[status], className)}>{LABELS[status]}</Badge>;
}
