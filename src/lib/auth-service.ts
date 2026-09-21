import { isSupabaseBackend } from "@/lib/backend";
import * as mock from "@/lib/mock/auth";
import { requireSupabase } from "@/lib/supabase/client";
import type { Profile } from "@/types";

export interface AppSession {
  userId: string;
  email: string;
  createdAt: string;
}

function toAppSession(session: { user: { id: string; email?: string; created_at: string }; access_token: string } | null): AppSession | null {
  if (!session) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    createdAt: session.user.created_at,
  };
}

export async function getSession(): Promise<AppSession | null> {
  if (!isSupabaseBackend) return mock.getSession();
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) return null;
  const { data: verified, error: verificationError } = await client.auth.getUser();
  if (verificationError) throw verificationError;
  if (!verified.user || verified.user.id !== data.session.user.id) {
    await client.auth.signOut();
    return null;
  }
  return toAppSession(data.session);
}

export function onAuthChange(listener: (session: AppSession | null) => void | Promise<void>) {
  if (!isSupabaseBackend) return mock.onAuthChange(listener);
  const { data } = requireSupabase().auth.onAuthStateChange((_event, session) => {
    void listener(toAppSession(session));
  });
  return () => data.subscription.unsubscribe();
}

export async function signUp(email: string, password: string, fullName: string) {
  if (!isSupabaseBackend) {
    return {
      error: { message: "Registration is unavailable in the local demo." },
      needsEmailConfirmation: false,
    };
  }

  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/sign-in`,
    },
  });

  return {
    error: error ? { message: error.message } : null,
    needsEmailConfirmation: !data.session,
  };
}

export async function signIn(email: string, password: string) {
  if (!isSupabaseBackend) return mock.signIn(email, password);
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
  return { error: error ? { message: error.message } : null };
}

export async function signOut() {
  if (!isSupabaseBackend) return mock.signOut();
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function sendResetEmail(email: string) {
  if (!isSupabaseBackend) return mock.sendResetEmail(email);
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/update-password`,
  });
  return { error: error ? { message: error.message } : null };
}

export async function updatePassword(password: string) {
  if (!isSupabaseBackend) {
    return { error: { message: "Password updates are unavailable in the local demo." } };
  }
  const { error } = await requireSupabase().auth.updateUser({ password });
  return { error: error ? { message: error.message } : null };
}

export async function getProfileForUser(userId: string): Promise<Profile | null> {
  if (!isSupabaseBackend) return mock.getProfileForUser(userId);
  const client = requireSupabase();
  const { data, error } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}
