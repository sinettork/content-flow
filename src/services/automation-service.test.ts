import { describe, expect, it } from "vitest";

import { connectionHealth, dryRunRule, publishingReadiness, type SocialConnection } from "./automation-service";

const connection = (patch: Partial<SocialConnection> = {}): SocialConnection => ({
  id: "c1", workspace_id: "w1", provider: "facebook", account_type: "page",
  external_account_id: "page-1", name: "Acme Page", username: null, avatar_url: null,
  status: "active", credentials_ref: "secret", metadata: {}, last_synced_at: "2026-01-10T00:00:00.000Z",
  created_by: "u1", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-10T00:00:00.000Z", ...patch,
});

describe("social publishing readiness", () => {
  it("distinguishes healthy, stale, and action-required connections", () => {
    expect(connectionHealth(connection(), Date.parse("2026-01-10T12:00:00Z"))).toBe("healthy");
    expect(connectionHealth(connection({ last_synced_at: null }))).toBe("stale");
    expect(connectionHealth(connection({ status: "error" }))).toBe("action_required");
  });

  it("does not claim publishing is available from OAuth alone", () => {
    const result = publishingReadiness("facebook", [connection()]);
    expect(result.canPublish).toBe(false);
    expect(result.connection).toBe("connected");
    expect(result.reason).toContain("publishing worker");
  });
});


describe("automation dry-run readiness", () => {
  it("allows an executable team notification without an optional message", () => {
    const result = dryRunRule({
      trigger_type: "incoming_comment",
      conditions: [],
      actions: [{ type: "notify_team" }],
    });

    expect(result.safe).toBe(true);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("blocks actions that do not have an execution handler", () => {
    const result = dryRunRule({
      trigger_type: "incoming_comment",
      conditions: [],
      actions: [{ type: "share_content", message: "Share this post" }],
    });

    expect(result.safe).toBe(false);
    expect(result.checks.find((check) => check.label === "Actions supported")?.detail)
      .toContain("share_content");
  });

  it.each(["reply_comment", "send_message"])("requires a message for %s", (type) => {
    const result = dryRunRule({
      trigger_type: "incoming_comment",
      conditions: [],
      actions: [{ type, message: " " }],
    });

    expect(result.safe).toBe(false);
    expect(result.checks.find((check) => check.label === "Required action fields")?.passed).toBe(false);
  });

  it("rejects unsupported or empty conditions instead of treating them as safe", () => {
    const result = dryRunRule({
      trigger_type: "incoming_comment",
      conditions: [{ type: "matches_regex", value: "price" }, { type: "contains", value: " " }],
      actions: [{ type: "notify_team" }],
    });

    expect(result.safe).toBe(false);
    expect(result.checks.find((check) => check.label === "Conditions supported")?.passed).toBe(false);
  });

  it("enforces the maximum of five conditions", () => {
    const result = dryRunRule({
      trigger_type: "incoming_comment",
      conditions: Array.from({ length: 6 }, () => ({ type: "contains", value: "price" })),
      actions: [{ type: "notify_team" }],
    });

    expect(result.safe).toBe(false);
    expect(result.checks.find((check) => check.label === "Conditions supported")?.detail)
      .toContain("five conditions");
  });
});
