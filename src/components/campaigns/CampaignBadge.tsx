import { Badge } from "@/components/ui/badge";

interface CampaignBadgeProps {
  name: string;
  color: string;
  className?: string;
}

export function CampaignBadge({ name, color, className }: CampaignBadgeProps) {
  return (
    <Badge className={className} style={{ backgroundColor: `${color}18`, color }}>
      {name}
    </Badge>
  );
}
