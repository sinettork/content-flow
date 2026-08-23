import type { Role } from "@/lib/constants";

export type Action =
  | "content.create"
  | "content.edit"
  | "content.delete"
  | "content.approve"
  | "campaign.manage"
  | "team.manage"
  | "workspace.manage";

const MATRIX: Record<Role, Action[]> = {
  admin: [
    "content.create",
    "content.edit",
    "content.delete",
    "content.approve",
    "campaign.manage",
    "team.manage",
    "workspace.manage",
  ],
  manager: ["content.create", "content.edit", "content.delete", "content.approve", "campaign.manage"],
  editor: ["content.create", "content.edit"],
  viewer: [],
};

export function can(role: Role | undefined | null, action: Action): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(action) ?? false;
}
