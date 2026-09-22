import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CalendarToolbar } from "@/components/calendar/CalendarToolbar";
import { PlatformLegend } from "@/components/calendar/PlatformLegend";
import { PageHeader } from "@/components/common/PageHeader";
import { ContentWorkspaceNav } from "@/components/content/ContentWorkspaceNav";
import { PlatformBadge } from "@/components/content/PlatformBadge";
import { Button } from "@/components/ui/button";
import {
  CAMBODIA_GREGORIAN_LOCALE,
  CAMBODIA_TIME_ZONE,
  CAMBODIA_WEEKDAYS,
  formatCambodiaBuddhistYear,
  formatCambodiaMonth,
  formatCambodiaTime,
  getCambodiaTodayDate,
  isSameCambodiaMonth,
  toCambodiaDateKey,
} from "@/lib/cambodia-locale";
import { cn } from "@/lib/utils";
import { contentService, platformService } from "@/services";
import type { ContentItem, ContentPlatform } from "@/types";

interface ScheduledEntry {
  item: ContentItem;
  platforms: ContentPlatform[];
}

const CAMBODIA_AGENDA_DATE_FORMAT = new Intl.DateTimeFormat(CAMBODIA_GREGORIAN_LOCALE, {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: CAMBODIA_TIME_ZONE,
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function toCalendarDateKey(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function isSameCalendarMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isToday(date: Date) {
  return toCalendarDateKey(date) === toCalendarDateKey(getCambodiaTodayDate());
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  const mondayOffset = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(getCambodiaTodayDate());
  const [entries, setEntries] = useState<ScheduledEntry[]>([]);
  const [view, setView] = useState<"month" | "agenda">("month");

  useEffect(() => {
    (async () => {
      const items = await contentService.list({});
      const scheduled = items.filter((i) => i.scheduled_at);
      const platformMap = await platformService.listForItems(scheduled.map((item) => item.id));
      setEntries(scheduled.map((item) => ({ item, platforms: platformMap[item.id] ?? [] })));
    })();
  }, []);

  const days = useMemo(() => monthDays(currentDate), [currentDate]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, ScheduledEntry[]> = {};
    for (const entry of entries) {
      const dateKey = toCambodiaDateKey(entry.item.scheduled_at);
      if (!dateKey) continue;
      (map[dateKey] ??= []).push(entry);
    }
    return map;
  }, [entries]);

  const weekDays = CAMBODIA_WEEKDAYS;

  const hasScheduledContent = entries.some(
    (entry) => entry.item.scheduled_at && isSameCambodiaMonth(entry.item.scheduled_at, currentDate)
  );

  return (
    <>
      <ContentWorkspaceNav />
      <PageHeader
        title="Calendar"
        description="Plan and review when content is scheduled to publish."
        actions={
          <Button onClick={() => navigate("/app/content/new")}>
            New content
          </Button>
        }
      />
      <CalendarToolbar
        title={formatCambodiaMonth(currentDate)}
        secondaryTitle={formatCambodiaBuddhistYear(currentDate)}
        view={view}
        onViewChange={setView}
        onPrev={() => setCurrentDate(addMonths(currentDate, -1))}
        onNext={() => setCurrentDate(addMonths(currentDate, 1))}
        onToday={() => setCurrentDate(getCambodiaTodayDate())}
      />
      <PlatformLegend />

      {view === "agenda" ? (
        <div className="mt-4 space-y-3">
          {Object.entries(entriesByDate)
            .filter(([key]) => isSameCalendarMonth(new Date(`${key}T00:00:00`), currentDate))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, dayEntries]) => (
              <div key={key} className="rounded-lg border bg-card p-3">
                <h3 className="mb-2 text-sm font-semibold">
                  {CAMBODIA_AGENDA_DATE_FORMAT.format(new Date(`${key}T00:00:00`))}
                </h3>
                <div className="space-y-1">
                  {dayEntries.map((entry) => (
                    <Button
                      key={entry.item.id}
                      variant="ghost"
                      className="h-auto w-full justify-start gap-2 px-2 py-2 text-left"
                      onClick={() => navigate(`/app/content/${entry.item.id}`)}
                    >
                      {entry.platforms[0] && (
                        <PlatformBadge platform={entry.platforms[0].platform_name} className="scale-75" />
                      )}
                      <span className="truncate font-medium">{entry.item.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatCambodiaTime(entry.item.scheduled_at)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          {!hasScheduledContent && (
            <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              Nothing scheduled this month.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {weekDays.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = toCalendarDateKey(day);
              const dayEntries = entriesByDate[key] ?? [];
              const inMonth = isSameCalendarMonth(day, currentDate);

              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1.5 text-xs",
                    !inMonth && "bg-muted/20 text-muted-foreground/50"
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <Button
                        type="button"
                        variant="ghost"
                        key={entry.item.id}
                        className="h-auto w-full justify-start gap-1 truncate rounded px-1 py-0.5 text-left text-xs font-normal hover:bg-accent"
                        onClick={() => navigate(`/app/content/${entry.item.id}`)}
                      >
                        {entry.platforms[0] && (
                          <PlatformBadge platform={entry.platforms[0].platform_name} className="scale-75" />
                        )}
                        <span className="truncate">{entry.item.title}</span>
                      </Button>
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="px-1 text-muted-foreground">+{dayEntries.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
