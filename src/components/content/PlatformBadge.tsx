import { Badge } from "@/components/ui/badge";
import { PLATFORM_COLORS, type Platform } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  telegram: "Telegram",
  youtube_shorts: "YouTube Shorts",
};

export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  return <Badge className={cn(PLATFORM_COLORS[platform], className)}>{LABELS[platform]}</Badge>;
}
