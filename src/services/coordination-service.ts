import { isSupabaseBackend } from "@/lib/backend";
import { getAll } from "@/lib/mock/db";
import { selectMany } from "@/lib/supabase/repository";
import type { Campaign, ContentItem, Profile } from "@/types";

export interface MemberWorkload {
  profile: Profile;
  active: number;
  overdue: number;
  dueSoon: number;
  capacity: "light" | "balanced" | "heavy";
}

export interface CampaignRisk {
  campaign: Campaign;
  total: number;
  incomplete: number;
  overdue: number;
  risk: "low" | "medium" | "high";
}

export function buildWorkload(profiles: Profile[], items: ContentItem[], now = new Date()): MemberWorkload[] {
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 7);
  return profiles.map((profile) => {
    const assigned = items.filter((item) => item.assigned_to === profile.id && !["posted", "archived"].includes(item.master_status));
    const overdue = assigned.filter((item) => item.due_at && new Date(item.due_at) < now).length;
    const dueSoon = assigned.filter((item) => item.due_at && new Date(item.due_at) >= now && new Date(item.due_at) <= soon).length;
    const active = assigned.length;
    return {
      profile,
      active,
      overdue,
      dueSoon,
      capacity: active >= 10 || overdue >= 3 ? "heavy" : active >= 5 ? "balanced" : "light",
    };
  });
}

export function buildCampaignRisks(campaigns: Campaign[], items: ContentItem[], now = new Date()): CampaignRisk[] {
  return campaigns.map((campaign) => {
    const scoped = items.filter((item) => item.campaign_id === campaign.id);
    const incomplete = scoped.filter((item) => !["posted", "archived"].includes(item.master_status)).length;
    const overdue = scoped.filter((item) => item.due_at && new Date(item.due_at) < now && incomplete > 0).length;
    const risk = overdue > 0 || (campaign.end_date && new Date(campaign.end_date) < now && incomplete > 0)
      ? "high"
      : incomplete >= 5 ? "medium" : "low";
    return { campaign, total: scoped.length, incomplete, overdue, risk };
  });
}

export const coordinationService = {
  async workload(workspaceId: string): Promise<MemberWorkload[]> {
    const [profiles, items] = isSupabaseBackend
      ? await Promise.all([
          selectMany<Profile>("profiles", (q) => q.eq("workspace_id", workspaceId)),
          selectMany<ContentItem>("content_items", (q) => q.eq("workspace_id", workspaceId)),
        ])
      : [
          (getAll("profiles") as Profile[]).filter((profile) => profile.workspace_id === workspaceId),
          (getAll("content_items") as ContentItem[]).filter((item) => item.workspace_id === workspaceId),
        ];
    return buildWorkload(profiles, items);
  },
  async campaignRisks(workspaceId: string): Promise<CampaignRisk[]> {
    const [campaigns, items] = isSupabaseBackend
      ? await Promise.all([
          selectMany<Campaign>("campaigns", (q) => q.eq("workspace_id", workspaceId)),
          selectMany<ContentItem>("content_items", (q) => q.eq("workspace_id", workspaceId)),
        ])
      : [
          (getAll("campaigns") as Campaign[]).filter((campaign) => campaign.workspace_id === workspaceId),
          (getAll("content_items") as ContentItem[]).filter((item) => item.workspace_id === workspaceId),
        ];
    return buildCampaignRisks(campaigns, items);
  },
};
