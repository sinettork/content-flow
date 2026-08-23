import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseBackend } from "@/lib/backend";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (isSupabaseBackend && (!url || !publishableKey)) {
  throw new Error(
    "Supabase mode requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Never expose a secret or service-role key in VITE_* variables."
  );
}

export const supabase: SupabaseClient | null =
  isSupabaseBackend && url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured for this environment.");
  return supabase;
}
