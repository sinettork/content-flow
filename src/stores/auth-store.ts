import { create } from "zustand";

import type { MockSession } from "@/lib/mock/auth";
import type { Profile } from "@/types";

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  session: MockSession | null;
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: MockSession | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  setSession: (session) =>
    set({
      session,
      user: session ? { id: session.userId, email: session.email } : null,
    }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ session: null, user: null, profile: null, loading: false }),
}));
