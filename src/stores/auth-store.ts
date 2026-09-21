import { create } from "zustand";

import type { AppSession } from "@/lib/auth-service";
import type { Profile } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  session: AppSession | null;
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  setSession: (session: AppSession | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  error: null,
  setSession: (session) =>
    set({
      session,
      user: session ? { id: session.userId, email: session.email } : null,
    }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ session: null, user: null, profile: null, loading: false, error: null }),
}));
