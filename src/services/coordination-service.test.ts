import { describe, expect, it } from "vitest";

import type { ContentItem, Profile } from "@/types";

import { buildWorkload } from "./coordination-service";

const profile = { id: "p1", full_name: "Alex", role: "editor", workspace_id: "w1" } as Profile;
const item = (id: string, due_at: string | null): ContentItem => ({
  id, workspace_id: "w1", assigned_to: "p1", due_at, master_status: "draft",
} as ContentItem);

describe("coordination metrics", () => {
  it("summarizes active, overdue, and due-soon work", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const result = buildWorkload([profile], [item("a", "2026-01-09T00:00:00Z"), item("b", "2026-01-12T00:00:00Z")], now);
    expect(result[0]).toMatchObject({ active: 2, overdue: 1, dueSoon: 1, capacity: "light" });
  });
});
