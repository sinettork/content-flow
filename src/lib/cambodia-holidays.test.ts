import { describe, expect, it } from "vitest";

import {
  CAMBODIA_PUBLIC_HOLIDAYS_2026,
  getCambodiaPublicHoliday,
} from "@/lib/cambodia-holidays";

describe("Cambodia public holidays", () => {
  it("includes the official 2026 holiday dates", () => {
    expect(getCambodiaPublicHoliday("2026-04-14")?.nameKhmer).toContain("ចូលឆ្នាំថ្មី");
    expect(getCambodiaPublicHoliday("2026-10-12")?.nameKhmer).toBe("ពិធីបុណ្យភ្ជុំបិណ្ឌ");
    expect(getCambodiaPublicHoliday("2026-11-25")?.nameKhmer).toContain("បុណ្យអុំទូក");
  });

  it("keeps the 2026 source set explicit", () => {
    expect(CAMBODIA_PUBLIC_HOLIDAYS_2026).toHaveLength(18);
    expect(getCambodiaPublicHoliday("2027-01-01")).toBeNull();
  });
});
