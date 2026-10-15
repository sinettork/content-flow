import {
  BarChart3,
  Bot,
  Calendar,
  FileText,
  FolderOpen,
  Kanban,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Plus,
  Settings,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Campaign, ContentAsset, ContentItem, Profile } from "@/types";

export type GlobalSearchGroup = "Commands" | "Content" | "Campaigns" | "People" | "Assets";

export interface GlobalSearchResult {
  id: string;
  group: GlobalSearchGroup;
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  status?: ContentItem["master_status"];
}

type SearchableContent = Pick<ContentItem, "id" | "workspace_id" | "title" | "slug" | "content_type" | "master_status" | "brief">;
type SearchableCampaign = Pick<Campaign, "id" | "workspace_id" | "name" | "description" | "status">;
type SearchableProfile = Pick<Profile, "id" | "workspace_id" | "full_name" | "email" | "job_title" | "role">;
type SearchableAsset = Pick<ContentAsset, "id" | "workspace_id" | "original_filename" | "category" | "asset_type">;

interface GlobalSearchInput {
  query: string;
  workspaceId: string;
  content: SearchableContent[];
  campaigns: SearchableCampaign[];
  people: SearchableProfile[];
  assets: SearchableAsset[];
  canCreateContent: boolean;
}

const commands: Array<{
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string;
  Icon: LucideIcon;
  requiresCreatePermission?: boolean;
}> = [
  { id: "dashboard", title: "Dashboard", description: "Open workspace overview", href: "/app/dashboard", keywords: "home overview", Icon: LayoutDashboard },
  { id: "my-work", title: "My Work", description: "Open your work queue", href: "/app/my-work", keywords: "tasks due assigned queue", Icon: UserCheck },
  { id: "content", title: "Content", description: "Browse content items", href: "/app/content", keywords: "posts library drafts", Icon: FileText },
  { id: "new-content", title: "Create new content", description: "Start a draft", href: "/app/content/new", keywords: "new create draft post", Icon: Plus, requiresCreatePermission: true },
  { id: "board", title: "Board", description: "Open workflow board", href: "/app/board", keywords: "kanban status workflow", Icon: Kanban },
  { id: "calendar", title: "Calendar", description: "Open publishing calendar", href: "/app/calendar", keywords: "schedule dates agenda", Icon: Calendar },
  { id: "campaigns", title: "Campaigns", description: "Browse campaigns", href: "/app/campaigns", keywords: "campaign planning", Icon: Megaphone },
  { id: "assets", title: "Assets", description: "Open creative library", href: "/app/assets", keywords: "files images videos documents", Icon: FolderOpen },
  { id: "operations", title: "Approvals & Publishing", description: "Review approvals and publishing jobs", href: "/app/operations", keywords: "approval review publish operations", Icon: ListChecks },
  { id: "automation", title: "Automation", description: "Open rules and channel readiness", href: "/app/automation", keywords: "rules triggers channels", Icon: Bot },
  { id: "reports", title: "Reports", description: "Open operational reports", href: "/app/reports", keywords: "analytics metrics insights", Icon: BarChart3 },
  { id: "team", title: "Team", description: "Browse workspace members", href: "/app/team", keywords: "people members staff", Icon: Users },
  { id: "settings", title: "Settings", description: "Open workspace settings", href: "/app/settings", keywords: "preferences configuration", Icon: Settings },
];

function matches(query: string, ...values: Array<string | null | undefined>): boolean {
  const normalized = query.trim().toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(normalized));
}

export function buildGlobalSearchResults({
  query,
  workspaceId,
  content,
  campaigns: campaignRows,
  people,
  assets,
  canCreateContent,
}: GlobalSearchInput): GlobalSearchResult[] {
  const normalized = query.trim();
  if (!normalized) return [];

  const commandResults: GlobalSearchResult[] = commands
    .filter((command) => (!command.requiresCreatePermission || canCreateContent) && matches(normalized, command.title, command.description, command.keywords))
    .slice(0, 6)
    .map(({ id, title, description, href, Icon }) => ({
      id: `command:${id}`,
      group: "Commands",
      title,
      description,
      href,
      Icon,
    }));

  const contentResults: GlobalSearchResult[] = content
    .filter((item) => item.workspace_id === workspaceId && matches(normalized, item.title, item.slug, item.brief))
    .slice(0, 5)
    .map((item) => ({
      id: `content:${item.id}`,
      group: "Content",
      title: item.title,
      description: `${item.content_type.replace(/_/g, " ")} · ${item.slug}`,
      href: `/app/content/${encodeURIComponent(item.id)}`,
      Icon: FileText,
      status: item.master_status,
    }));

  const campaignResults: GlobalSearchResult[] = campaignRows
    .filter((campaign) => campaign.workspace_id === workspaceId && matches(normalized, campaign.name, campaign.description, campaign.status))
    .slice(0, 5)
    .map((campaign) => ({
      id: `campaign:${campaign.id}`,
      group: "Campaigns",
      title: campaign.name,
      description: [campaign.status, campaign.description].filter(Boolean).join(" · "),
      href: `/app/campaigns/${encodeURIComponent(campaign.id)}`,
      Icon: Megaphone,
    }));

  const peopleResults: GlobalSearchResult[] = people
    .filter((person) => person.workspace_id === workspaceId && matches(normalized, person.full_name, person.email, person.job_title, person.role))
    .slice(0, 5)
    .map((person) => ({
      id: `person:${person.id}`,
      group: "People",
      title: person.full_name,
      description: [person.job_title, person.role, person.email].filter(Boolean).join(" · "),
      href: `/app/team?search=${encodeURIComponent(person.full_name)}`,
      Icon: Users,
    }));

  const assetResults: GlobalSearchResult[] = assets
    .filter((asset) => asset.workspace_id === workspaceId && matches(normalized, asset.original_filename, asset.category, asset.asset_type))
    .slice(0, 5)
    .map((asset) => ({
      id: `asset:${asset.id}`,
      group: "Assets",
      title: asset.original_filename,
      description: `${asset.category.replace(/_/g, " ")} · ${asset.asset_type}`,
      href: `/app/assets?search=${encodeURIComponent(asset.original_filename)}`,
      Icon: FolderOpen,
    }));

  return [...commandResults, ...contentResults, ...campaignResults, ...peopleResults, ...assetResults];
}
