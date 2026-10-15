import { describe, expect, it } from "vitest";

import { buildAutomationNotifications } from "../../supabase/functions/_shared/automation-notifications";

describe("buildAutomationNotifications", () => {
  it("creates one notification per unique recipient with an idempotency key", () => {
    const rows = buildAutomationNotifications({
      workspaceId: "workspace-1",
      runId: "run-1",
      ruleName: "Reply to pricing questions",
      message: "  A new matching comment was received.  ",
      memberIds: ["user-1", "user-2", "user-1", "  "],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      workspace_id: "workspace-1",
      user_id: "user-1",
      type: "automation",
      title: "Automation: Reply to pricing questions",
      body: "A new matching comment was received.",
      is_read: false,
      entity_type: "automation_run",
      entity_id: "run-1",
      automation_run_id: "run-1",
    });
    expect(rows[1].user_id).toBe("user-2");
  });

  it("uses a useful fallback when the optional action message is blank", () => {
    const [row] = buildAutomationNotifications({
      workspaceId: "workspace-1",
      runId: "run-2",
      ruleName: "Team alert",
      message: " ",
      memberIds: ["user-1"],
    });
    expect(row.body).toBe('Automation "Team alert" was triggered.');
  });

  it("caps notification text lengths", () => {
    const [row] = buildAutomationNotifications({
      workspaceId: "workspace-1",
      runId: "run-3",
      ruleName: "R".repeat(300),
      message: "M".repeat(1500),
      memberIds: ["user-1"],
    });
    expect(row.title.length).toBe(160);
    expect(row.body.length).toBe(1000);
  });

  it("rejects an empty recipient set instead of reporting a successful delivery", () => {
    expect(() => buildAutomationNotifications({
      workspaceId: "workspace-1",
      runId: "run-4",
      ruleName: "Team alert",
      memberIds: [],
    })).toThrow("No workspace members are available to notify.");
  });
});
