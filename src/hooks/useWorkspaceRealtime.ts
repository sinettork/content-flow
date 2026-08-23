import { useEffect } from "react";

import { isSupabaseBackend } from "@/lib/backend";
import { subscribeToWorkspace } from "@/lib/supabase/realtime";

export function useWorkspaceRealtime(workspaceId: string, onChange: () => void) {
  useEffect(() => {
    if (!isSupabaseBackend || !workspaceId) return;
    return subscribeToWorkspace(workspaceId, onChange);
  }, [onChange, workspaceId]);
}
