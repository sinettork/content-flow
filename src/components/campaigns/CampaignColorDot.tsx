import { cn } from "@/lib/utils";

interface CampaignColorDotProps {
  color: string;
  className?: string;
}

export function CampaignColorDot({ color, className }: CampaignColorDotProps) {
  return (
    <span
      className={cn("inline-block h-3 w-3 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
