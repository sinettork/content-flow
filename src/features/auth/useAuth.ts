import { useEffect } from "react";

import {
  getProfileForUser,
  getSession,
  onAuthChange,
  signIn as mockSignIn,
  signOut as mockSignOut,
  sendResetEmail as mockSendReset,
} from "@/lib/mock/auth";
import { useAuthStore } from "@/stores/auth-store";

export function useAuthInit() {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const apply = (userId: string | null) => {
      setProfile(userId ? getProfileForUser(userId) : null);
    };

    const initial = getSession();
    setSession(initial);
    apply(initial?.userId ?? null);
    setLoading(false);

    const unsub = onAuthChange((session) => {
      setSession(session);
      apply(session?.userId ?? null);
    });

    return () => {
      unsub();
    };
  }, [setSession, setProfile, setLoading]);
}

export async function signIn(email: string, password: string) {
  return mockSignIn(email, password);
}

export async function signOut() {
  return mockSignOut();
}

export async function sendResetEmail(email: string) {
  return mockSendReset(email);
}
