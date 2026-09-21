import { describe, expect, it } from "vitest";

import { workspaceSlug } from "./workspace-service";

describe("workspace onboarding", () => {
  it("creates a stable URL-safe workspace slug", () => {
    expect(workspaceSlug("Acme Marketing")).toBe("acme-marketing");
    expect(workspaceSlug("  Team / Social  ")).toBe("team-social");
    expect(workspaceSlug("")).toBe("workspace");
  });
});
