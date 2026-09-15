"use client";

import { UserButton } from "@clerk/nextjs";
import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/auth/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

/** Profile card: sign-in prompt, or identity + saved-data status. Auth by Clerk. */
export function AccountCard() {
  const { status, user, sync, syncError, lastSyncedAt, signOut } = useSession();

  if (status === "unavailable") {
    return (
      <Card>
        <CardHeader>
          <div className="min-w-0"><CardTitle>Device only</CardTitle><CardDescription>Accounts are not enabled on this deployment. Data stays in this browser.</CardDescription></div>
          <span className="icon-tile"><CloudOff size={16} aria-hidden="true" /></span>
        </CardHeader>
        <CardContent><Badge>Offline · device only</Badge></CardContent>
      </Card>
    );
  }

  if (status !== "signed-in" || !user) {
    return (
      <Card>
        <CardHeader>
          <div className="min-w-0"><CardTitle>Save your progress</CardTitle><CardDescription>Sign in to keep meals, sets, weight and AI plans in sync across devices.</CardDescription></div>
          <span className="icon-tile"><Cloud size={16} aria-hidden="true" /></span>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="primary" className="flex-1"><Link href="/login"><LogIn /> Sign in</Link></Button>
          <Button asChild variant="secondary" className="flex-1"><Link href="/sign-up">Create account</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const badge =
    sync === "error" ? <Badge variant="destructive">Sync failed</Badge>
    : sync === "offline" ? <Badge variant="warning">Offline</Badge>
    : sync === "syncing" ? <Badge><RefreshCw size={11} className="animate-spin" /> Syncing</Badge>
    : sync === "synced" ? <Badge variant="success">Saved to account</Badge>
    : <Badge>Signed in</Badge>;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-3">
          <UserButton appearance={{ elements: { avatarBox: "size-10 rounded-md" } }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight">{user.displayName || user.email}</p>
            {user.displayName && user.email ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
          </div>
          {badge}
        </div>
        {syncError ? <p className="mt-3 text-xs leading-relaxed text-destructive">{syncError}</p> : null}
      </CardContent>
      <CardFooter className="justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck size={14} className="text-success" aria-hidden="true" />
          {lastSyncedAt ? `Saved ${relativeTime(lastSyncedAt)}` : sync === "error" ? "Not saved yet" : "Waiting for first save"}
        </span>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}><LogOut /> Sign out</Button>
      </CardFooter>
    </Card>
  );
}

export function AccountNudge() {
  const { status } = useSession();
  if (status !== "signed-out") return null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center">
      <span className="icon-tile"><Cloud size={16} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Your data lives only in this browser right now.</p>
        <p className="text-xs text-muted-foreground">Sign in to save it to your account and pick up on any device.</p>
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="primary"><Link href="/login">Sign in</Link></Button>
        <Button asChild size="sm" variant="ghost"><Link href="/sign-up">Create account</Link></Button>
      </div>
    </div>
  );
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : new Date(value).toLocaleDateString();
}
