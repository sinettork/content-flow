import { requireSupabase } from "@/lib/supabase/client";

const TABLES = [
  "content_items",
  "content_platforms",
  "content_assets",
  "campaigns",
  "comments",
  "notifications",
  "approval_requests",
  "publishing_jobs",
] as const;

export function subscribeToWorkspace(workspaceId: string, onChange: () => void) {
  const client = requireSupabase();
  const channel = client.channel(`workspace:${workspaceId}`);

  for (const table of TABLES) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `workspace_id=eq.${workspaceId}` },
      onChange
    );
  }

  channel.subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
