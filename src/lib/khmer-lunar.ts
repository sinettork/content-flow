import { formatKhmerDate } from "khmer-chhankitek-calendar";

export function formatKhmerLunarDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    const input = value instanceof Date ? value : value.slice(0, 10);
    return formatKhmerDate(input, { format: "short" });
  } catch {
    return "—";
  }
}
