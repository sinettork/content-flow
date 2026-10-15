import { describe, expect, it } from "vitest";

import { buildGlobalSearchResults } from "@/lib/global-search";
import type { Campaign, ContentAsset, ContentItem, Profile } from "@/types";

const workspaceId = "workspace-1";

const content = [
  {
    id: "content-1",
    workspace_id: workspaceId,
    title: "Launch announcement",
    slug: "launch-announcement",
    content_type: "post" as ContentItem["content_type"],
    master_status: "draft" as const,
    brief: "Spring launch copy",
  },
  {
    id: "foreign-content",
    workspace_id: "workspace-2",
    title: "Launch from another workspace",
    slug: "foreign-launch",
    content_type: "post" as ContentItem["content_type"],
    master_status: "draft" as const,
    brief: "Do not expose",
  },
];

const campaigns = [
  { id: "campaign-1", workspace_id: workspaceId, name: "Spring launch", description: "Product rollout", status: "active" as Campaign["status"] },
  { id: "foreign-campaign", workspace_id: "workspace-2", name: "Launch elsewhere", description: "Private", status: "active" as Campaign["status"] },
];

const people = [
  { id: "person-1", workspace_id: workspaceId, full_name: "Rina Sok", email: "rina@example.com", job_title: "Launch coordinator", role: "editor" as Profile["role"] },
  { id: "foreign-person", workspace_id: "workspace-2", full_name: "Other Launch", email: "other@example.com", job_title: null, role: "viewer" as Profile["role"] },
];

const assets = [
  { id: "asset-1", workspace_id: workspaceId, original_filename: "launch-cover.png", category: "design", asset_type: "image" } as ContentAsset,
  { id: "foreign-asset", workspace_id: "workspace-2", original_filename: "launch-private.png", category: "design", asset_type: "image" } as ContentAsset,
];

function search(query: string, canCreateContent = false) {
  return buildGlobalSearchResults({
    query,
    workspaceId,
    content,
    campaigns,
    people,
    assets,
    canCreateContent,
  });
}

describe("global search", () => {
  it("returns matching content, campaigns, people, and assets only from the active workspace", () => {
    const results = search("launch");

    expect(results.map((result) => result.group)).toEqual(["Content", "Campaigns", "People", "Assets"]);
    expect(results.map((result) => result.id)).toEqual([
      "content:content-1",
      "campaign:campaign-1",
      "person:person-1",
      "asset:asset-1",
    ]);
    expect(results.find((result) => result.group === "People")?.href).toContain("/app/team?search=");
    expect(results.find((result) => result.group === "Assets")?.href).toContain("/app/assets?search=");
  });

  it("offers searchable navigation commands and hides create content without permission", () => {
    expect(search("calendar").map((result) => result.title)).toContain("Calendar");
    expect(search("create").some((result) => result.href === "/app/content/new")).toBe(false);
    expect(search("create", true).some((result) => result.href === "/app/content/new")).toBe(true);
  });

  it("returns no results for a blank query", () => {
    expect(search("   ")).toEqual([]);
  });
});
