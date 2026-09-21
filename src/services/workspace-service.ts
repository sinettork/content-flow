import { isSupabaseBackend } from "@/lib/backend";
import { genId, getAll, insert } from "@/lib/mock/db";
import { requireSupabase } from "@/lib/supabase/client";
import type { Profile } from "@/types";

export interface CreateWorkspaceInput {
  name: string;
  userId: string;
  email: string;
  fullName?: string;
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "workspace";
}

export const workspaceService = {
  async create(input: CreateWorkspaceInput): Promise<Profile> {
    const name = input.name.trim();
    if (!name) throw new Error("Workspace name is required.");

    if (isSupabaseBackend) {
      const { data, error } = await requireSupabase().rpc("create_workspace_for_current_user", {
        workspace_name: name,
        display_name: input.fullName?.trim() || input.email.split("@")[0],
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Workspace creation did not return a profile.");
      return data as Profile;
    }

    const now = new Date().toISOString();
    const baseSlug = slugify(name);
    const existingSlugs = new Set(getAll("workspaces").map((workspace) => workspace.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (existingSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;

    const workspace = insert("workspaces", {
      id: genId("ws"),
      name,
      slug,
      logo_path: null,
      created_by: input.userId,
      created_at: now,
    });
    return insert("profiles", {
      id: input.userId,
      workspace_id: workspace.id,
      full_name: input.fullName?.trim() || input.email.split("@")[0],
      email: input.email,
      avatar_path: null,
      role: "admin",
      job_title: null,
      created_at: now,
      updated_at: now,
    });
  },
};

export { slugify as workspaceSlug };
