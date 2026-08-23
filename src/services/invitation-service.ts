import { isSupabaseBackend } from "@/lib/backend";
import type { Role } from "@/lib/constants";
import { requireSupabase } from "@/lib/supabase/client";

export const invitationService = {
  async invite(email: string, role: Role): Promise<void> {
    if (!isSupabaseBackend) throw new Error("Team invitations require the Supabase backend.");
    const { error } = await requireSupabase().functions.invoke("invite-member", {
      body: { email: email.trim().toLowerCase(), role, redirectTo: `${window.location.origin}/auth/sign-in` },
    });
    if (error) throw new Error(error.message);
  },
};
