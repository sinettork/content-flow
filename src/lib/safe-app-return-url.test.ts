import { describe, expect, it } from "vitest";
import { safeAppReturnUrl } from "../../supabase/functions/_shared/safe-app-return-url";

describe("safeAppReturnUrl", () => {
  it("accepts a URL on the configured production origin", () => {
    expect(safeAppReturnUrl("https://content.example/app/settings", "https://content.example")?.toString())
      .toBe("https://content.example/app/settings");
  });

  it("rejects a different origin, including a deceptive prefix", () => {
    expect(safeAppReturnUrl("https://evil.example/redirect", "https://content.example")).toBeNull();
    expect(safeAppReturnUrl("https://content.example.evil.test/", "https://content.example")).toBeNull();
  });

  it("rejects non-HTTPS protocols outside localhost", () => {
    expect(safeAppReturnUrl("http://content.example/", "https://content.example")).toBeNull();
    expect(safeAppReturnUrl("javascript:alert(1)", "https://content.example")).toBeNull();
  });

  it("allows local development on the exact configured origin", () => {
    expect(safeAppReturnUrl("http://localhost:5173/auth/sign-in", "http://localhost:5173")?.origin)
      .toBe("http://localhost:5173");
    expect(safeAppReturnUrl("http://localhost:3000/", "http://localhost:5173")).toBeNull();
  });

  it("rejects missing configuration and credential-bearing URLs", () => {
    expect(safeAppReturnUrl("https://content.example/", undefined)).toBeNull();
    expect(safeAppReturnUrl("https://user:pass@content.example/", "https://content.example")).toBeNull();
  });
});
