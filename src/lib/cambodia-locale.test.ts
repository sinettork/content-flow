import { describe, expect, it } from "vitest";

import {
  CAMBODIA_WEEKDAYS,
  formatCambodiaBuddhistYear,
  formatCambodiaMonth,
  toCambodiaDateKey,
} from "@/lib/cambodia-locale";

describe("Cambodia locale helpers", () => {
  it("maps timestamps to the Cambodia business date", () => {
    expect(toCambodiaDateKey("2026-09-22T16:59:59Z")).toBe("2026-09-22");
    expect(toCambodiaDateKey("2026-09-22T17:00:00Z")).toBe("2026-09-23");
  });

  it("formats Gregorian and Buddhist-era calendar labels", () => {
    const date = new Date("2026-09-22T08:16:00+07:00");

    expect(formatCambodiaMonth(date)).toContain("កញ្ញា");
    expect(formatCambodiaMonth(date)).toContain("2026");
    expect(formatCambodiaBuddhistYear(date)).toContain("2569");
  });

  it("starts the calendar week on Monday for Cambodia", () => {
    expect(CAMBODIA_WEEKDAYS).toHaveLength(7);
    expect(CAMBODIA_WEEKDAYS[0]).toBe("ចន្ទ");
    expect(CAMBODIA_WEEKDAYS[6]).toBe("អាទិត្យ");
  });
});
