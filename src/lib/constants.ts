export const ROLES = ["admin", "manager", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const CONTENT_TYPES = [
  "image",
  "carousel",
  "video",
  "reel",
  "story",
  "animation",
  "document",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const MASTER_STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "scheduled",
  "posted",
  "archived",
] as const;
export type MasterStatus = (typeof MASTER_STATUSES)[number];

export const PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "telegram",
  "youtube_shorts",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_STATUSES = [
  "not_planned",
  "draft",
  "scheduled",
  "posted",
  "failed",
  "skipped",
] as const;
export type PlatformStatus = (typeof PLATFORM_STATUSES)[number];

export const CAMPAIGN_STATUSES = ["active", "completed", "paused", "archived"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const APPROVAL_DECISIONS = ["approved", "changes_requested", "rejected"] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const STATUS_COLORS: Record<MasterStatus, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_review: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  changes_requested: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  scheduled: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  posted: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  archived: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export const STATUS_ACCENTS: Record<MasterStatus, string> = {
  draft: "bg-slate-500",
  in_review: "bg-amber-500",
  changes_requested: "bg-orange-500",
  approved: "bg-emerald-500",
  scheduled: "bg-sky-500",
  posted: "bg-violet-500",
  archived: "bg-zinc-500",
};

export const STATUS_SOFT_BACKGROUNDS: Record<MasterStatus, string> = {
  draft: "bg-slate-50 dark:bg-slate-950/20",
  in_review: "bg-amber-50 dark:bg-amber-950/20",
  changes_requested: "bg-orange-50 dark:bg-orange-950/20",
  approved: "bg-emerald-50 dark:bg-emerald-950/20",
  scheduled: "bg-sky-50 dark:bg-sky-950/20",
  posted: "bg-violet-50 dark:bg-violet-950/20",
  archived: "bg-zinc-50 dark:bg-zinc-950/20",
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  facebook: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  tiktok: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  telegram: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  youtube_shorts: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

/** Valid workflow transitions from a given status */
export const WORKFLOW_TRANSITIONS: Record<MasterStatus, MasterStatus[]> = {
  draft: ["in_review", "archived"],
  in_review: ["changes_requested", "approved", "draft"],
  changes_requested: ["in_review", "draft", "archived"],
  approved: ["scheduled", "changes_requested", "draft"],
  scheduled: ["posted", "approved", "draft"],
  posted: ["archived"],
  archived: ["draft"],
};

export function canTransition(from: MasterStatus, to: MasterStatus): boolean {
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Role-based permission checks */
export const ROLE_LEVELS: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  manager: 2,
  admin: 3,
};

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minRole];
}

/** Which roles can perform which actions */
export const PERMISSIONS = {
  createContent: "editor" as Role,
  editContent: "editor" as Role,
  deleteContent: "manager" as Role,
  changeStatus: "editor" as Role,
  approveContent: "manager" as Role,
  manageCampaigns: "manager" as Role,
  manageTeam: "manager" as Role,
  manageSettings: "admin" as Role,
};
