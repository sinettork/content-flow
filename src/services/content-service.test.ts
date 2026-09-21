import { describe, expect, it } from "vitest";

import { getContentReadiness } from "@/services/content-service";

const item = {
  title: "Launch post",
  brief: "Explain the launch offer",
  campaign_id: "campaign-1",
  assigned_to: "user-1",
};

describe("content readiness", () => {
  it("reports missing production setup", () => {
    const readiness = getContentReadiness(item);
    expect(readiness.isReady).toBe(false);
    expect(readiness.checks.filter((check) => !check.complete).map((check) => check.key))
      .toEqual(["platform", "checklist"]);
  });

  it("is ready when platforms and checklists are complete", () => {
    expect(getContentReadiness(item, [{ checklist_completed: true }]).isReady).toBe(true);
  });
});
