"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { clerkEnabled } from "@/lib/cloud-sync";

export type SyncState = "idle" | "syncing" | "synced" | "error" | "offline";

export interface AccountUser {
  id: string;
  email: string;
  displayName: string | null;
  imageUrl: string | null;
}

interface SessionContextValue {
  /** `unavailable` = Clerk not configured on this deployment; app runs device-only. */
  status: "loading" | "unavailable" | "signed-out" | "signed-in";
  user: AccountUser | null;
  sync: SyncState;
  syncError: string | null;
  lastSyncedAt: string | null;
  signOut: () => Promise<void>;
  setSync: (sync: SyncState, error?: string | null, at?: string | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

function useSyncStatus() {
  const [sync, setSyncState] = useState<SyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const setSync = useCallback((next: SyncState, error: string | null = null, at: string | null = null) => {
    setSyncState(next);
    setSyncError(error);
    if (at) setLastSyncedAt(at);
  }, []);
  return { sync, syncError, lastSyncedAt, setSync };
}

/** Chooses the implementation once per build; Clerk hooks only run inside ClerkProvider. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return clerkEnabled ? <ClerkSession>{children}</ClerkSession> : <LocalSession>{children}</LocalSession>;
}

function LocalSession({ children }: { children: React.ReactNode }) {
  const { sync, syncError, lastSyncedAt, setSync } = useSyncStatus();
  const value = useMemo<SessionContextValue>(() => ({ status: "unavailable", user: null, sync, syncError, lastSyncedAt, setSync, signOut: async () => {} }), [lastSyncedAt, setSync, sync, syncError]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function ClerkSession({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const { sync, syncError, lastSyncedAt, setSync } = useSyncStatus();

  const signOut = useCallback(async () => {
    await clerk.signOut({ redirectUrl: "/" });
  }, [clerk]);

  const value = useMemo<SessionContextValue>(() => ({
    status: !isLoaded ? "loading" : isSignedIn ? "signed-in" : "signed-out",
    user: isSignedIn && user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      displayName: user.fullName || user.firstName || user.username || null,
      imageUrl: user.imageUrl || null,
    } : null,
    sync, syncError, lastSyncedAt, setSync, signOut,
  }), [isLoaded, isSignedIn, lastSyncedAt, setSync, signOut, sync, syncError, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
