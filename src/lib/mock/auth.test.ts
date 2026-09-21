import { describe, expect, it } from "vitest";

import { isValidMockSession } from "@/lib/mock/auth";

describe("mock session validation", () => {
  it("accepts only the required session fields", () => {
    expect(isValidMockSession({ userId: "u1", email: "a@example.com", createdAt: "2026-01-01" })).toBe(true);
    expect(isValidMockSession({ userId: "u1", email: "a@example.com" })).toBe(false);
    expect(isValidMockSession(null)).toBe(false);
  });
});
