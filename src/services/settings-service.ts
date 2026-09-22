import { isSupabaseBackend } from "@/lib/backend";
import type { ContentType, Priority } from "@/lib/constants";
import { findById, update } from "@/lib/mock/db";
import { requireSupabase } from "@/lib/supabase/client";

export interface AutomationRule {
  label: string;
  active: boolean;
}

export interface WorkspaceSettings {
  workspace_id: string;
  workspace_name: string;
  timezone: string;
  default_content_type: ContentType;
  default_priority: Priority;
  approval_required: boolean;
  checklist_required: boolean;
  brand_notes: string;
  notification_preferences: Record<string, boolean>;
  automation_rules: AutomationRule[];
  working_days: number[];
  khmer_lunar_enabled: boolean;
}

const STORAGE_KEY = "contentflow.workspace-settings.v1";

function defaults(workspaceId: string, workspaceName = "ContentFlow"): WorkspaceSettings {
  return {
    workspace_id: workspaceId,
    workspace_name: workspaceName,
    timezone: "Asia/Phnom_Penh",
    default_content_type: "image",
    default_priority: "medium",
    approval_required: true,
    checklist_required: true,
    brand_notes: "",
    notification_preferences: { approval: true, schedule: true, comments: true, overdue: true },
    automation_rules: [],
    working_days: [1, 2, 3, 4, 5],
    khmer_lunar_enabled: true,
  };
}

export const settingsService = {
  async get(workspaceId: string): Promise<WorkspaceSettings> {
    if (isSupabaseBackend) {
      const client = requireSupabase();
      const [{ data: workspace, error: workspaceError }, { data: settings, error: settingsError }] = await Promise.all([
        client.from("workspaces").select("name").eq("id", workspaceId).single(),
        client.from("workspace_settings").select("*").eq("workspace_id", workspaceId).maybeSingle(),
      ]);
      if (workspaceError) throw new Error(workspaceError.message);
      if (settingsError) throw new Error(settingsError.message);
      if (!workspace) throw new Error("Workspace not found.");
      return { ...defaults(workspaceId, workspace.name), ...(settings ?? {}), workspace_name: workspace.name } as WorkspaceSettings;
    }

    const workspace = findById("workspaces", workspaceId);
    const fallback = defaults(workspaceId, workspace?.name ?? "ContentFlow");
    const raw = localStorage.getItem(`${STORAGE_KEY}.${workspaceId}`);
    if (!raw) return fallback;
    try {
      return { ...fallback, ...JSON.parse(raw) } as WorkspaceSettings;
    } catch {
      return fallback;
    }
  },

  async save(settings: WorkspaceSettings): Promise<WorkspaceSettings> {
    if (isSupabaseBackend) {
      const client = requireSupabase();
      const { workspace_name, ...record } = settings;
      const [{ error: workspaceError }, { error: settingsError }] = await Promise.all([
        client.from("workspaces").update({ name: workspace_name }).eq("id", settings.workspace_id),
        client.from("workspace_settings").upsert({ ...record, updated_at: new Date().toISOString() }),
      ]);
      if (workspaceError) throw new Error(workspaceError.message);
      if (settingsError) throw new Error(settingsError.message);
      return settings;
    }

    update("workspaces", settings.workspace_id, { name: settings.workspace_name });
    localStorage.setItem(`${STORAGE_KEY}.${settings.workspace_id}`, JSON.stringify(settings));
    return settings;
  },
};
