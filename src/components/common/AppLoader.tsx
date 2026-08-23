import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface AppLoaderProps {
  label?: string;
  description?: string;
  fullScreen?: boolean;
  delay?: number;
  className?: string;
}

export function AppLoader({
  label = "Loading",
  description,
  fullScreen = false,
  delay = 350,
  className,
}: AppLoaderProps) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen ? "fixed left-1/2 top-4 z-[100] -translate-x-1/2" : "min-h-[160px] py-8",
        className
      )}
    >
      <div className="flex items-center gap-3 rounded-full border border-border/80 bg-background/95 px-4 py-2.5 text-sm shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
        <div className="text-left">
          <p className="font-medium leading-none">{label}</p>
          {description && <p className="mt-1 text-xs leading-none text-muted-foreground">{description}</p>}
        </div>
      </div>
    </div>
  );
}
