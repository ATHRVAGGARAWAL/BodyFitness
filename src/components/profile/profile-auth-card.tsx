"use client";

import { SignInButton, SignOutButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Cloud, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useBodyFitnessStore } from "@/lib/store";

export function ProfileAuthCard({ enabled }: { enabled: boolean }) {
  if (!enabled) return <LocalModeCard />;
  return <ClerkProfileCard />;
}

function LocalModeCard() {
  return (
    <div className="panel p-4">
      <div className="flex items-start gap-3">
        <span className="icon-tile text-[var(--warning)]"><Cloud size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-black">Local mode</p>
          <p className="mt-1 text-[11px] leading-4 text-white/40">Your data stays on this device. Add Clerk and Railway environment variables to enable secure sync and Circle.</p>
        </div>
      </div>
    </div>
  );
}

function ClerkProfileCard() {
  const { user } = useUser();
  const account = useBodyFitnessStore((state) => state.account);
  return (
    <div className="panel p-4">
      <SignedOut>
        <div className="flex items-start gap-3">
          <span className="icon-tile text-[var(--accent-strong)]"><LogIn size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-black">Sync and share securely</p>
            <p className="mt-1 text-[11px] leading-4 text-white/40">Sign in with Apple, Google, or an email link. Local tracking continues without an account.</p>
          </div>
        </div>
        <SignInButton mode="modal">
          <button className="primary-action pressable mt-4 min-h-12 w-full rounded-[14px] text-xs font-black">Sign in to BodyFitness</button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-3">
          <UserButton appearance={{ elements: { avatarBox: "h-12 w-12" } }} />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-sm font-black">{user?.fullName ?? user?.firstName ?? account.profile.displayName}</p>
            <p className="mt-1 truncate text-[10px] text-white/38">@{account.profile.handle}</p>
          </div>
          <span className={`status-chip ${account.syncStatus === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
            {account.syncStatus === "syncing" ? "Syncing" : account.syncStatus === "error" ? "Needs attention" : "Cloud on"}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <ShieldCheck size={14} className="text-[var(--success)]" />
            {account.lastSyncedAt ? `Synced ${relativeTime(account.lastSyncedAt)}` : "Waiting for first sync"}
          </div>
          <SignOutButton>
            <button className="pressable flex min-h-11 items-center gap-1.5 rounded-[12px] px-3 text-[10px] font-black text-white/45"><LogOut size={14} /> Sign out</button>
          </SignOutButton>
        </div>
        {account.syncError ? <p className="mb-0 mt-3 text-[10px] leading-4 text-[var(--danger)]">{account.syncError}</p> : null}
      </SignedIn>
    </div>
  );
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
