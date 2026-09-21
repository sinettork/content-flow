import { describe, expect, it } from "vitest";

import { MONDAY_API_VERSION } from "./monday";

describe("monday integration contract", () => {
  it("pins the API version outside browser credentials", () => {
    expect(MONDAY_API_VERSION).toMatch(/^\d{4}-\d{2}$/);
  });
});
