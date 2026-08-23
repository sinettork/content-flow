import * as React from "react";

import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-md bg-foreground/90 px-2.5 py-1 text-xs text-background shadow-md group-hover:block",
          side === "top" && "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
          side === "bottom" && "top-full left-1/2 mt-1.5 -translate-x-1/2",
          side === "left" && "right-full top-1/2 mr-1.5 -translate-y-1/2",
          side === "right" && "left-full top-1/2 ml-1.5 -translate-y-1/2"
        )}
      >
        {content}
      </span>
    </span>
  );
}
