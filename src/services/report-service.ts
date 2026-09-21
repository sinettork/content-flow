import { isSupabaseBackend } from "@/lib/backend";
import type { MasterStatus, Platform } from "@/lib/constants";
import { MASTER_STATUSES, PLATFORMS } from "@/lib/constants";
import { getAll } from "@/lib/mock/db";
import { selectMany } from "@/lib/supabase/repository";
import type { ApprovalRequest, ContentItem, ContentPlatform, Notification, PublishingJob } from "@/types";

export interface DashboardMetrics {
  total: number;
  byStatus: Record<MasterStatus, number>;
  scheduledThisWeek: number;
  postedThisMonth: number;
  overdue: number;
  byPlatform: Record<Platform, number>;
}

export interface OperationalMetrics {
  approvalTurnaroundHours: number | null;
  approvalsCompleted: number;
  publishingSucceeded: number;
  publishingFailed: number;
  publishingSuccessRate: number | null;
  overdue: number;
}

export interface DailyDigest {
  unread: number;
  approvals: number;
  publishingFailures: number;
  overdue: number;
  headline: string;
}

export function calculateOperationalMetrics(
  approvals: ApprovalRequest[],
  jobs: PublishingJob[],
  overdue: ContentItem[],
): OperationalMetrics {
  const completed = approvals.filter((approval) => approval.decided_at);
  const turnaround = completed
    .map((approval) => (Date.parse(approval.decided_at!) - Date.parse(approval.created_at)) / 3600000)
    .filter((hours) => Number.isFinite(hours) && hours >= 0);
  const succeeded = jobs.filter((job) => job.status === "succeeded").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const total = succeeded + failed;
  return {
    approvalTurnaroundHours: turnaround.length ? turnaround.reduce((sum, hours) => sum + hours, 0) / turnaround.length : null,
    approvalsCompleted: completed.length,
    publishingSucceeded: succeeded,
    publishingFailed: failed,
    publishingSuccessRate: total ? succeeded / total : null,
    overdue: overdue.length,
  };
}

export function buildDailyDigest(notifications: Notification[], metrics: OperationalMetrics): DailyDigest {
  const unread = notifications.filter((notification) => !notification.is_read).length;
  const approvals = notifications.filter((notification) => notification.type.includes("approval") && !notification.is_read).length;
  const publishingFailures = notifications.filter((notification) => notification.type.includes("publish") && !notification.is_read).length;
  const parts = [
    unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "No unread notifications",
    metrics.overdue ? `${metrics.overdue} overdue item${metrics.overdue === 1 ? "" : "s"}` : "No overdue items",
    metrics.publishingFailed ? `${metrics.publishingFailed} publishing failure${metrics.publishingFailed === 1 ? "" : "s"}` : "No publishing failures",
  ];
  return { unread, approvals, publishingFailures, overdue: metrics.overdue, headline: parts.join(" · ") };
}

function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = x.getDay(); // 0 sun .. 6 sat
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
function endOfWeek(d = new Date()): Date {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 7);
  return x;
}
function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export const reportService = {
  async operational(): Promise<OperationalMetrics> {
    const overdue = await this.overdue();
    if (!isSupabaseBackend) return calculateOperationalMetrics(getAll("approval_requests") as ApprovalRequest[], [], overdue);
    const [approvals, jobs] = await Promise.all([
      selectMany<ApprovalRequest>("approval_requests"),
      selectMany<PublishingJob>("publishing_jobs"),
    ]);
    return calculateOperationalMetrics(approvals, jobs, overdue);
  },
  async dashboard(): Promise<DashboardMetrics> {
    const [items, platforms] = isSupabaseBackend
      ? await Promise.all([
          selectMany<ContentItem>("content_items"),
          selectMany<ContentPlatform>("content_platforms"),
        ])
      : [getAll("content_items") as ContentItem[], getAll("content_platforms") as ContentPlatform[]];
    const now = new Date();
    const weekFrom = startOfWeek(now).toISOString();
    const weekTo = endOfWeek(now).toISOString();
    const monthFrom = startOfMonth(now).toISOString();
    const monthTo = endOfMonth(now).toISOString();
    const nowIso = now.toISOString();

    const byStatus = Object.fromEntries(MASTER_STATUSES.map((s) => [s, 0])) as Record<MasterStatus, number>;
    for (const it of items) byStatus[it.master_status]++;

    const byPlatform = Object.fromEntries(PLATFORMS.map((p) => [p, 0])) as Record<Platform, number>;
    for (const p of platforms) byPlatform[p.platform_name]++;

    const scheduledThisWeek = items.filter(
      (i) => i.scheduled_at && i.scheduled_at >= weekFrom && i.scheduled_at < weekTo
    ).length;

    const postedThisMonth = items.filter(
      (i) => i.posted_at && i.posted_at >= monthFrom && i.posted_at < monthTo
    ).length;

    const overdue = items.filter(
      (i) => i.due_at && i.due_at < nowIso && i.master_status !== "posted" && i.master_status !== "archived"
    ).length;

    return {
      total: items.length,
      byStatus,
      scheduledThisWeek,
      postedThisMonth,
      overdue,
      byPlatform,
    };
  },

  async scheduled(): Promise<ContentItem[]> {
    if (isSupabaseBackend) {
      return selectMany<ContentItem>("content_items", (q) =>
        q.not("scheduled_at", "is", null).order("scheduled_at")
      );
    }
    return (getAll("content_items") as ContentItem[])
      .filter((i) => i.scheduled_at)
      .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  },

  async posted(): Promise<ContentItem[]> {
    if (isSupabaseBackend) {
      return selectMany<ContentItem>("content_items", (q) =>
        q.eq("master_status", "posted").order("posted_at", { ascending: false })
      );
    }
    return (getAll("content_items") as ContentItem[])
      .filter((i) => i.master_status === "posted")
      .sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? ""));
  },

  async overdue(): Promise<ContentItem[]> {
    const nowIso = new Date().toISOString();
    if (isSupabaseBackend) {
      return selectMany<ContentItem>("content_items", (q) =>
        q.lt("due_at", nowIso).not("master_status", "in", '("posted","archived")').order("due_at")
      );
    }
    return (getAll("content_items") as ContentItem[])
      .filter((i) => i.due_at && i.due_at < nowIso && i.master_status !== "posted" && i.master_status !== "archived")
      .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));
  },
};
