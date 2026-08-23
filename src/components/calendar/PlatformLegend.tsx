import { PLATFORM_COLORS, PLATFORMS, type Platform } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  telegram: "Telegram",
  youtube_shorts: "YT Shorts",
};

export function PlatformLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {PLATFORMS.map((p) => (
        <div key={p} className="flex items-center gap-1.5">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", PLATFORM_COLORS[p].split(" ")[0])} />
          <span>{LABELS[p]}</span>
        </div>
      ))}
    </div>
  );
}
