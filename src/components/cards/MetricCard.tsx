import { type CSSProperties, type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  className?: string;
}

const CARD_ACCENTS = ["blue", "cyan", "teal", "green", "yellow", "orange", "rose", "violet"];

export function MetricCard({ label, value, icon, trend, className }: MetricCardProps) {
  const accent = CARD_ACCENTS[Math.abs(label.length + String(value).length) % CARD_ACCENTS.length];

  return (
    <Card
      style={{ "--metric-color": `var(--palette-${accent})` } as CSSProperties & Record<string, string>}
      className={cn("colorful-card group overflow-hidden", className)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="animate-count-up text-3xl font-bold tracking-tight tabular-nums">{value}</p>
            {trend && <p className="text-[13px] text-muted-foreground">{trend}</p>}
          </div>
          {icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--metric-color)/0.12)] text-[hsl(var(--metric-color))] transition-all duration-200 group-hover:scale-105 group-hover:bg-[hsl(var(--metric-color)/0.18)]">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-5 h-1 rounded-full bg-[hsl(var(--metric-color)/0.22)]">
          <div className="h-full w-12 rounded-full bg-[hsl(var(--metric-color))]" />
        </div>
      </CardContent>
    </Card>
  );
}
