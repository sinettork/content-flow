import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ delay = 700 }: { delay?: number }) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <div className="animate-slide-up-fade space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 rounded-md" />
        <Skeleton className="h-5 w-80 rounded-md" />
      </div>
      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border/70 bg-card/95 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        ))}
      </div>
      {/* Content rows */}
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded-md" />
              <Skeleton className="h-3 w-1/3 rounded-md" />
            </div>
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border border-border/70 bg-card/95 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-2/3 rounded-md" />
        </div>
      ))}
    </div>
  );
}
