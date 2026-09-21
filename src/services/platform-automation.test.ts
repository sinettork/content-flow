import { describe, expect, it } from "vitest";

import { dryRunRule } from "@/services/automation-service";
import { validatePlatformContent } from "@/services/platform-service";

describe("platform intelligence", () => {
  it("flags empty captions and previews content", () => {
    const result = validatePlatformContent("instagram", "", "#launch");
    expect(result.valid).toBe(false);
    expect(result.preview).toBe("#launch");
    expect(result.warnings).toContain("Caption is empty.");
  });

  it("keeps automation dry runs bounded", () => {
    expect(dryRunRule({ trigger_type: "manual", actions: [{ type: "notify_team" }], conditions: [] }).safe).toBe(true);
    expect(dryRunRule({ trigger_type: "manual", actions: [], conditions: [] }).safe).toBe(false);
  });
});
