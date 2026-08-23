import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type CalendarView = "month" | "week" | "day";

interface CalendarToolbarProps {
  title: string;
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarToolbar({ title, view, onViewChange, onPrev, onNext, onToday }: CalendarToolbarProps) {
  const views: CalendarView[] = ["month", "week", "day"];
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={onToday}>Today</Button>
        <h2 className="ml-2 text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex gap-1">
        {views.map((v) => (
          <Button key={v} variant={view === v ? "default" : "outline"} size="sm" onClick={() => onViewChange(v)} className="capitalize">
            {v}
          </Button>
        ))}
      </div>
    </div>
  );
}
