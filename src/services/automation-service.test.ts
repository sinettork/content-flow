import { describe, expect, it } from "vitest";

import { connectionHealth, publishingReadiness, type SocialConnection } from "./automation-service";

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
