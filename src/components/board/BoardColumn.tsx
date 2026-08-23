import { useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { type ReactNode } from "react";

import type { MasterStatus } from "@/lib/constants";
import { STATUS_ACCENTS, STATUS_SOFT_BACKGROUNDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BoardColumnProps {
  status: MasterStatus;
  label: string;
  count: number;
  children: ReactNode;
  className?: string;
}

export function BoardColumn({ status, label, count, children, className }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-80 shrink-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200",
        isOver && "scale-[1.01] border-primary/40 ring-2 ring-primary/10",
        className
      )}
    >
      <div className={cn("h-1.5", STATUS_ACCENTS[status])} />
      <div className={cn("flex items-center justify-between px-4 py-3.5", STATUS_SOFT_BACKGROUNDS[status])}>
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/60" />
          <span className={cn("inline-block h-3 w-3 rounded-full", STATUS_ACCENTS[status])} />
          <span className="text-sm font-bold">{label}</span>
        </div>
        <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full border bg-background px-2.5 text-xs font-semibold text-muted-foreground shadow-sm">{count}</span>
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-3 overflow-y-auto bg-muted/20 p-3 scrollbar-thin">
        {children}
      </div>
    </div>
  );
}
