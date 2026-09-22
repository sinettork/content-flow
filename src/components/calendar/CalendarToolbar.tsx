import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type CalendarView = "month" | "agenda";

interface CalendarToolbarProps {
  title: string;
  secondaryTitle?: string;
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: "ខែ",
  agenda: "របៀបវារៈ",
};

export function CalendarToolbar({
  title,
  secondaryTitle,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: CalendarToolbarProps) {
  const views: CalendarView[] = ["month", "agenda"];

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous month" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next month" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToday}>
          ថ្ងៃនេះ
        </Button>
        <div className="ml-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {secondaryTitle && (
            <p className="text-xs text-muted-foreground">{secondaryTitle}</p>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        {views.map((value) => (
          <Button
            key={value}
            variant={view === value ? "default" : "outline"}
            size="sm"
            onClick={() => onViewChange(value)}
          >
            {VIEW_LABELS[value]}
          </Button>
        ))}
      </div>
    </div>
  );
}
