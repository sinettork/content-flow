import type { Role } from "@/lib/constants";
import { findBy, findById, getAll, update } from "@/lib/mock/db";
import type { Profile } from "@/types";

export const profileService = {
  async listForWorkspace(workspaceId: string): Promise<Profile[]> {
    return (findBy("profiles", (p) => p.workspace_id === workspaceId) as Profile[])
      .slice()
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  },

  async get(id: string): Promise<Profile | null> {
    return (findById("profiles", id) as Profile | undefined) ?? null;
  },

  async byIds(ids: string[]): Promise<Record<string, Profile>> {
    const all = getAll("profiles") as Profile[];
    const map: Record<string, Profile> = {};
    for (const p of all) if (ids.includes(p.id)) map[p.id] = p;
    return map;
  },

  async update(id: string, patch: Partial<Profile>): Promise<Profile | null> {
    return (update("profiles", id, patch) as Profile | undefined) ?? null;
  },

  async setRole(id: string, role: Role, actorRole: Role | undefined | null): Promise<Profile | null> {
    const target = await this.get(id);
    if (!target) {
      throw new Error("Team member not found.");
    }

    if (actorRole !== "admin") {
      if (actorRole !== "manager") {
        throw new Error("You do not have permission to manage team roles.");
      }
      if (target.role === "admin" || target.role === "manager") {
        throw new Error("Managers can only update editors and viewers.");
      }
      if (role === "admin" || role === "manager") {
        throw new Error("Managers cannot assign admin or manager roles.");
      }
    }

    return this.update(id, { role });
  },
};
