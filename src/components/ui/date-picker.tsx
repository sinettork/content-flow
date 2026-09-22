import { CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CAMBODIA_GREGORIAN_LOCALE,
  CAMBODIA_MONTH_FORMAT,
  CAMBODIA_TIME_ZONE,
  CAMBODIA_WEEKDAYS,
  getCambodiaTodayDate,
} from "@/lib/cambodia-locale";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface DateTimePickerProps extends DatePickerProps {}

const DISPLAY_DATE_FORMAT = new Intl.DateTimeFormat(CAMBODIA_GREGORIAN_LOCALE, {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: CAMBODIA_TIME_ZONE,
});
const DISPLAY_DATE_TIME_FORMAT = new Intl.DateTimeFormat(CAMBODIA_GREGORIAN_LOCALE, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
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

function parseDateValue(value: string) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function parseDateTimeValue(value: string) {
  if (!value) return null;
  const date = parseDateValue(value);
  if (!date) return null;
  const [, time = ""] = value.split("T");
  const [hours = "0", minutes = "0"] = time.split(":");
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDateTimeValue(date: Date) {
  return `${toDateValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
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

function CalendarPanel({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
}) {
  const [month, setMonth] = useState(selected ?? getCambodiaTodayDate());
  const days = useMemo(() => monthDays(month), [month]);
  const today = getCambodiaTodayDate();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold">
          {CAMBODIA_MONTH_FORMAT.format(month)}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
        {CAMBODIA_WEEKDAYS.map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selectedDay = selected ? isSameDay(day, selected) : false;

          return (
            <Button
              type="button"
              key={day.toISOString()}
              variant={selectedDay ? "default" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8 text-xs font-normal",
                !isSameMonth(day, month) && "text-muted-foreground/45",
                isSameDay(day, today) && !selectedDay && "border border-input"
              )}
              onClick={() => onSelect(day)}
            >
              {day.getDate()}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function DatePicker({
  id,
  value,
  onValueChange,
  placeholder = "Select date",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start bg-background text-left font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="h-4 w-4" />
          {selected ? DISPLAY_DATE_FORMAT.format(selected) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <CalendarPanel
          selected={selected}
          onSelect={(date) => {
            onValueChange(toDateValue(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateTimePicker({
  id,
  value,
  onValueChange,
  placeholder = "Select date and time",
  disabled,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateTimeValue(value);
  const time = selected ? `${pad(selected.getHours())}:${pad(selected.getMinutes())}` : "";

  const updateDate = (date: Date) => {
    const [hours = "09", minutes = "00"] = time.split(":");
    const next = new Date(date);
    next.setHours(Number(hours), Number(minutes), 0, 0);
    onValueChange(toDateTimeValue(next));
  };

  const updateTime = (nextTime: string) => {
    const base = selected ?? getCambodiaTodayDate();
    const [hours = "09", minutes = "00"] = nextTime.split(":");
    const next = new Date(base);
    next.setHours(Number(hours), Number(minutes), 0, 0);
    onValueChange(toDateTimeValue(next));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start bg-background text-left font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="h-4 w-4" />
          {selected ? DISPLAY_DATE_TIME_FORMAT.format(selected) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <CalendarPanel selected={selected} onSelect={updateDate} />
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input
            value={time}
            onChange={(event) => updateTime(event.target.value)}
            placeholder="09:00"
            className="h-9"
            aria-label="Time in 24-hour format"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
