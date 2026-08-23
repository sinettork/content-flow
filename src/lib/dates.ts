const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const SHORT_DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function parseValue(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | Date | null | undefined, pattern = "MMM d, yyyy"): string {
  const date = parseValue(value);
  if (!date) return "—";
  if (pattern === "MMM d") return SHORT_DATE_FORMAT.format(date);
  if (pattern === "MMM d, h:mm a") return SHORT_DATE_TIME_FORMAT.format(date);
  return DATE_FORMAT.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = parseValue(value);
  return date ? DATE_TIME_FORMAT.format(date) : "—";
}

export function fromNow(value: string | Date | null | undefined): string {
  const date = parseValue(value);
  if (!date) return "—";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const [unit, unitSeconds] = units.find(([, size]) => abs >= size) ?? ["second", 1];

  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    Math.round(seconds / unitSeconds),
    unit
  );
}
