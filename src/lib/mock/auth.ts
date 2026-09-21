import type { Profile } from "@/types";

import { findBy, getAll } from "./db";
import type { MockUser } from "./seed";

const SESSION_KEY = "contentflow.session.v1";

export interface MockSession {
  userId: string;
  email: string;
  createdAt: string;
}

type Listener = (session: MockSession | null) => void;
const listeners = new Set<Listener>();

export function isValidMockSession(value: unknown): value is MockSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<MockSession>;
  return typeof session.userId === "string" &&
    typeof session.email === "string" &&
    typeof session.createdAt === "string";
}

function emit(session: MockSession | null) {
  for (const l of listeners) l(session);
}

export function getSession(): MockSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidMockSession(parsed)) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function onAuthChange(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function signIn(
  email: string,
  password: string
): Promise<{ error: { message: string } | null }> {
  // Simulate async network
  await new Promise((r) => setTimeout(r, 150));
  const users = getAll("users") as MockUser[];
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    return { error: { message: "Invalid email or password." } };
  }
  const session: MockSession = {
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit(session);
  return { error: null };
}

export async function signOut(): Promise<void> {
  window.localStorage.removeItem(SESSION_KEY);
  emit(null);
}

export async function sendResetEmail(
  _email: string
): Promise<{ error: { message: string } | null }> {
  await new Promise((r) => setTimeout(r, 200));
  return { error: null };
}

export function getProfileForUser(userId: string): Profile | null {
  const rows = findBy("profiles", (p) => p.id === userId);
  return (rows[0] as Profile | undefined) ?? null;
}
