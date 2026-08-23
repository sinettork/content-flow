import { useAuthStore } from "@/stores/auth-store";

/**
 * Current user's workspace id. Returns null when unauthenticated.
 * Feature code should pass this into service calls so multi-tenant filtering works.
 */
export function useWorkspaceId(): string | null {
  return useAuthStore((s) => s.profile?.workspace_id ?? null);
}
