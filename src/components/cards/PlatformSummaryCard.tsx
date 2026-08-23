import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PLATFORMS, type Platform } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PlatformSummaryCardProps {
  counts: Record<Platform, number>;
}

const LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  telegram: "Telegram",
  youtube_shorts: "YouTube Shorts",
};

const DOT_COLORS: Record<Platform, string> = {
  facebook: "bg-blue-500",
  instagram: "bg-pink-500",
  tiktok: "bg-zinc-800 dark:bg-zinc-300",
  telegram: "bg-sky-500",
  youtube_shorts: "bg-red-500",
};

export function PlatformSummaryCard({ counts }: PlatformSummaryCardProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Platforms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {PLATFORMS.map((p) => {
          const count = counts[p] ?? 0;
          const pct = Math.round((count / total) * 100);

          return (
            <div key={p} className="space-y-1.5">
              <div className="flex items-center gap-3 text-sm">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT_COLORS[p])} />
                <span className="flex-1 font-medium">{LABELS[p]}</span>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </div>
              <Progress value={pct} className="h-1.5" indicatorClassName={DOT_COLORS[p]} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
