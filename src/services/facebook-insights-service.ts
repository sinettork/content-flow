import { isSupabaseBackend } from "@/lib/backend";
import { getFacebookInsightsWindow, type FacebookDailyInsight } from "@/lib/facebook-insights";
import { requireSupabase } from "@/lib/supabase/client";

export type InsightsRange = 30 | 90;

export interface FacebookInsightsSyncResult {
  connection_id: string;
  days: InsightsRange;
  since: string;
  through: string;
  synced_days: number;
  synced_at: string;
}

export const facebookInsightsService = {
  async listDaily(connectionId: string, days: InsightsRange): Promise<FacebookDailyInsight[]> {
    if (!isSupabaseBackend) return [];

    const { since, until } = getFacebookInsightsWindow(days);
    const { data, error } = await requireSupabase()
      .from("facebook_page_insights_daily")
      .select("metric_date,unique_viewers,daily_follows,daily_unfollows,total_followers,updated_at")
      .eq("connection_id", connectionId)
      .gte("metric_date", since)
      .lt("metric_date", until)
      .order("metric_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as FacebookDailyInsight[];
  },

  async syncPage(connectionId: string, days: InsightsRange): Promise<FacebookInsightsSyncResult> {
    if (!isSupabaseBackend) throw new Error("Facebook Insights requires the Supabase backend.");

    const { data, error } = await requireSupabase().functions.invoke("facebook-insights-sync", {
      body: { connection_id: connectionId, days },
    });
    if (error) {
      const context = (error as unknown as { context?: Response }).context;
      if (context && typeof context.json === "function") {
        let body: { error?: string } | null = null;
        try {
          body = await context.clone().json() as { error?: string };
        } catch { /* Fall back to the Supabase function error below. */ }
        if (body?.error) throw new Error(body.error);
      }
      throw new Error(error.message);
    }
    if (!data || typeof data !== "object") throw new Error("The Insights sync did not return a result.");
    return data as FacebookInsightsSyncResult;
  },
};
