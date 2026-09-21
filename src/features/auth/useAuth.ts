import { useEffect } from "react";

import {
  getProfileForUser,
  getSession,
  onAuthChange,
  signIn as appSignIn,
  signOut as appSignOut,
  sendResetEmail as appSendReset,
  updatePassword as appUpdatePassword,
  signUp as appSignUp,
} from "@/lib/auth-service";
import { useAuthStore } from "@/stores/auth-store";

export function useAuthInit() {
  const { setSession, setProfile, setLoading, setError } = useAuthStore();

  useEffect(() => {
    let active = true;
    let revision = 0;
    const apply = async (userId: string | null, currentRevision: number) => {
      const nextProfile = userId ? await getProfileForUser(userId) : null;
      if (active && currentRevision === revision) setProfile(nextProfile);
    };

    void (async () => {
      try {
        setError(null);
        const initial = await getSession();
        if (!active) return;
        const currentRevision = ++revision;
        setSession(initial);
        await apply(initial?.userId ?? null, currentRevision);
      } catch (error) {
        if (active) {
          setSession(null);
          setProfile(null);
          setError(error instanceof Error ? error.message : "Unable to restore your session.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    const unsub = onAuthChange((session) => {
      const currentRevision = ++revision;
      setSession(session);
      // Supabase invokes this callback while holding its auth lock. Do not await
      // any Supabase work here; defer profile loading until that lock is released.
      window.setTimeout(() => {
        void apply(session?.userId ?? null, currentRevision).catch((error: unknown) => {
          if (active && currentRevision === revision) {
            setError(error instanceof Error ? error.message : "Unable to load your workspace profile.");
          }
        });
      }, 0);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [setSession, setProfile, setLoading, setError]);
}

export async function signUp(email: string, password: string, fullName: string) {
  return appSignUp(email, password, fullName);
}

export async function signIn(email: string, password: string) {
  return appSignIn(email, password);
}

export async function signOut() {
  return appSignOut();
}

export async function sendResetEmail(email: string) {
  return appSendReset(email);
}

export async function updatePassword(password: string) {
  return appUpdatePassword(password);
}
