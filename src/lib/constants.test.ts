import { describe, expect, it } from "vitest";

import { PERMISSIONS, canTransition, hasMinRole } from "@/lib/constants";

describe("workflow transitions", () => {
  it("allows the intended review path", () => {
    expect(canTransition("draft", "in_review")).toBe(true);
    expect(canTransition("in_review", "approved")).toBe(true);
    expect(canTransition("approved", "scheduled")).toBe(true);
    expect(canTransition("scheduled", "posted")).toBe(true);
  });

  it("blocks invalid shortcuts", () => {
    expect(canTransition("draft", "posted")).toBe(false);
    expect(canTransition("posted", "draft")).toBe(false);
  });
});

describe("role hierarchy", () => {
  it("enforces minimum roles", () => {
    expect(hasMinRole("admin", PERMISSIONS.manageSettings)).toBe(true);
    expect(hasMinRole("manager", PERMISSIONS.approveContent)).toBe(true);
    expect(hasMinRole("editor", PERMISSIONS.approveContent)).toBe(false);
    expect(hasMinRole("viewer", PERMISSIONS.createContent)).toBe(false);
  });
});
