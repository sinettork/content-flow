import { useEffect } from "react";

import {
  getProfileForUser,
  getSession,
  onAuthChange,
  signIn as appSignIn,
  signOut as appSignOut,
  sendResetEmail as appSendReset,
} from "@/lib/auth-service";
import { useAuthStore } from "@/stores/auth-store";

export function useAuthInit() {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;
    const apply = async (userId: string | null) => {
      const nextProfile = userId ? await getProfileForUser(userId) : null;
      if (active) setProfile(nextProfile);
    };

    void (async () => {
      try {
        const initial = await getSession();
        if (!active) return;
        setSession(initial);
        await apply(initial?.userId ?? null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    const unsub = onAuthChange((session) => {
      setSession(session);
      return apply(session?.userId ?? null);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [setSession, setProfile, setLoading]);
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
