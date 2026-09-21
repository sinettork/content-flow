import { describe, expect, it } from "vitest";

import type { ApprovalRequest, Notification, PublishingJob } from "@/types";

import { buildDailyDigest, calculateOperationalMetrics } from "./report-service";

describe("operational reporting", () => {
  it("calculates approval turnaround and publishing success rate", () => {
    const approval = { created_at: "2026-01-01T00:00:00Z", decided_at: "2026-01-01T02:00:00Z" } as ApprovalRequest;
    const jobs = [{ status: "succeeded" }, { status: "failed" }] as PublishingJob[];
    expect(calculateOperationalMetrics([approval], jobs, [])).toMatchObject({
      approvalTurnaroundHours: 2, approvalsCompleted: 1, publishingSuccessRate: 0.5,
    });
  });

  it("builds a concise daily digest headline", () => {
    const notification = { type: "approval_requested", is_read: false } as Notification;
    const digest = buildDailyDigest([notification], { overdue: 2, publishingFailed: 0 } as ReturnType<typeof calculateOperationalMetrics>);
    expect(digest.headline).toContain("1 unread notification");
    expect(digest.headline).toContain("2 overdue items");
  });
});
