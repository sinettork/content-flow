import { hasMinRole, PERMISSIONS, type Role } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Returns true if the current user's role meets the minimum required for the action.
 */
export function usePermission(action: PermissionKey): boolean {
  const role = useAuthStore((s) => s.profile?.role) as Role | undefined;
  if (!role) return false;
  return hasMinRole(role, PERMISSIONS[action]);
}

/**
 * Returns the user's role and a checker function.
 */
export function useRole() {
  const role = (useAuthStore((s) => s.profile?.role) ?? "viewer") as Role;
  return {
    role,
    can: (action: PermissionKey) => hasMinRole(role, PERMISSIONS[action]),
    isAtLeast: (minRole: Role) => hasMinRole(role, minRole),
  };
}
