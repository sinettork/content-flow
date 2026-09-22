export const CAMBODIA_LOCALE = "km-KH";
export const CAMBODIA_GREGORIAN_LOCALE = "km-KH-u-ca-gregory";
export const CAMBODIA_BUDDHIST_LOCALE = "km-KH-u-ca-buddhist";
export const CAMBODIA_TIME_ZONE = "Asia/Phnom_Penh";

const DATE_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  calendar: "gregory",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: CAMBODIA_TIME_ZONE,
});

function parseValue(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function numericPart(value: Date, type: Intl.DateTimeFormatPartTypes) {
  const part = DATE_KEY_FORMAT.formatToParts(value).find((item) => item.type === type)?.value;
  return part ? Number(part) : null;
}

export function getCambodiaDateParts(value: string | Date | null | undefined) {
  const date = parseValue(value);
  if (!date) return null;

  const year = numericPart(date, "year");
  const month = numericPart(date, "month");
  const day = numericPart(date, "day");
  if (!year || !month || !day) return null;

  return { year, month, day };
}

export function toCambodiaDateKey(value: string | Date | null | undefined) {
  const parts = getCambodiaDateParts(value);
  if (!parts) return null;
  return [parts.year, String(parts.month).padStart(2, "0"), String(parts.day).padStart(2, "0")].join("-");
}

export function getCambodiaTodayDate() {
  const parts = getCambodiaDateParts(new Date());
  if (!parts) return new Date();
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function isSameCambodiaDay(a: string | Date, b: string | Date) {
  return toCambodiaDateKey(a) === toCambodiaDateKey(b);
}

export function isSameCambodiaMonth(a: string | Date, b: string | Date) {
  const left = getCambodiaDateParts(a);
  const right = getCambodiaDateParts(b);
  return Boolean(left && right && left.year === right.year && left.month === right.month);
}

export const CAMBODIA_WEEKDAYS = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 8, 21 + index));
  return new Intl.DateTimeFormat(CAMBODIA_LOCALE, {
    weekday: "short",
    timeZone: CAMBODIA_TIME_ZONE,
  }).format(date);
});

export const CAMBODIA_MONTH_FORMAT = new Intl.DateTimeFormat(CAMBODIA_GREGORIAN_LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: CAMBODIA_TIME_ZONE,
});

const CAMBODIA_BUDDHIST_YEAR_FORMAT = new Intl.DateTimeFormat(CAMBODIA_BUDDHIST_LOCALE, {
  year: "numeric",
  timeZone: CAMBODIA_TIME_ZONE,
});

export function formatCambodiaMonth(value: string | Date) {
  const date = parseValue(value);
  return date ? CAMBODIA_MONTH_FORMAT.format(date) : "—";
}

export function formatCambodiaBuddhistYear(value: string | Date) {
  const date = parseValue(value);
  if (!date) return "—";
  const year = CAMBODIA_BUDDHIST_YEAR_FORMAT.format(date).replace(/\\s*BE$/, "");
  return `ព.ស. ${year}`;
}

export function formatCambodiaDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
  const date = parseValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(CAMBODIA_GREGORIAN_LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CAMBODIA_TIME_ZONE,
    ...options,
  }).format(date);
}

export function formatCambodiaDateTime(value: string | Date | null | undefined) {
  const date = parseValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(CAMBODIA_GREGORIAN_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CAMBODIA_TIME_ZONE,
  }).format(date);
}

export function formatCambodiaTime(value: string | Date | null | undefined) {
  const date = parseValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(CAMBODIA_GREGORIAN_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CAMBODIA_TIME_ZONE,
  }).format(date);
}
