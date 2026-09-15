"use client";

import { useAuth, SignInButton } from "@clerk/nextjs";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, LogIn, Plus, RefreshCw, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionHeader } from "@/components/ui/section-header";
import { Switch } from "@/components/ui/switch";
import { createInvite, fetchCircle, removeConnection, updateConnectionSharing } from "@/lib/cloud-sync";
import { useBodyFitnessStore } from "@/lib/store";
import type { SharingPolicy } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CircleCloudPanel({ enabled }: { enabled: boolean }) {
  if (!enabled) return <UnavailablePanel />;
  return <CircleAuthenticatedPanel />;
}

function UnavailablePanel() {
  return (
    <EmptyState
      title="Circle needs cloud configuration"
      body="Configure Clerk and the Railway API to create private mutual connections. Personal tracking remains local."
    />
  );
}

function CircleAuthenticatedPanel() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const circle = useBodyFitnessStore((state) => state.account.circle);
  const setCircle = useBodyFitnessStore((state) => state.setCircle);
  const { showToast } = useAppChrome();
  const [handle, setHandle] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isLoaded) return <Card className="h-28 animate-pulse bg-muted" aria-hidden="true" />;
  if (!isSignedIn) {
    return (
      <EmptyState
        title="Sign in to create your Circle"
        body="Connections are mutual and private. No public profiles or contact-book upload."
        action={
          <SignInButton mode="modal">
            <Button variant="primary"><LogIn /> Sign in</Button>
          </SignInButton>
        }
      />
    );
  }

  const withToken = async <T,>(action: (token: string) => Promise<T>) => {
    const token = await getToken();
    if (!token) throw new Error("No active Clerk session");
    return action(token);
  };

  const refresh = async () => {
    setBusy(true); setMessage(null);
    try { setCircle(await withToken(fetchCircle)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not refresh Circle"); }
    finally { setBusy(false); }
  };

  const invite = async () => {
    setBusy(true); setMessage(null);
    try {
      const result = await withToken((token) => createInvite(token, handle.trim() || undefined));
      setInviteUrl(result.inviteUrl);
      setMessage(handle.trim() ? `Invite created for @${handle.trim()}` : "Private invite link created");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create invite"); }
    finally { setBusy(false); }
  };

  const updateSharing = async (connectionId: string, sharing: SharingPolicy) => {
    setBusy(true); setMessage(null);
    try { await withToken((token) => updateConnectionSharing(token, connectionId, sharing)); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not update privacy"); setBusy(false); }
  };

  const disconnect = async (connectionId: string) => {
    if (!window.confirm("Remove this connection and revoke shared access?")) return;
    setBusy(true); setMessage(null);
    try { await withToken((token) => removeConnection(token, connectionId)); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove connection"); setBusy(false); }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showToast("Invite link copied");
    } catch {
      setMessage("Could not copy the link. Long-press or select it to copy.");
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader index="01" title="Invite" caption="Use an exact handle, or create a private expiring link." />
        <Card>
          <CardContent className="pt-5">
            <form
              className="flex gap-2"
              onSubmit={(event) => { event.preventDefault(); void invite(); }}
            >
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle-foreground">@</span>
                <Input
                  aria-label="Friend handle"
                  className="pl-7"
                  placeholder="handle, or leave blank"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                />
              </div>
              <Button type="submit" variant="primary" disabled={busy} className="h-10">
                <Plus /> Invite
              </Button>
            </form>
            {message ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground" role="status">{message}</p> : null}
          </CardContent>
        </Card>

        {inviteUrl ? (
          <Card className="mt-4">
            <CardContent className="flex gap-4 pt-5">
              <div className="shrink-0 overflow-hidden rounded-lg border border-border">
                <QRCodeSVG value={inviteUrl} size={96} marginSize={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Private invite</p>
                <p className="mt-1 break-all font-mono text-xs leading-relaxed text-muted-foreground">{inviteUrl}</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => void copyInvite()}>
                  <Copy /> Copy link
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section>
        <SectionHeader
          index="02"
          title="Connected people"
          caption={circle.members.length ? `${circle.members.length} ${circle.members.length === 1 ? "connection" : "connections"}` : undefined}
          action={
            <Button variant="ghost" size="icon" aria-label="Refresh Circle" disabled={busy} onClick={() => void refresh()}>
              <RefreshCw className={cn(busy && "animate-spin")} />
            </Button>
          }
        />
        {circle.members.length ? (
          <div className="grid gap-4 md:gap-6">
            {circle.members.map((member) => (
              <MemberCard
                key={member.connection.id}
                member={member}
                disabled={busy}
                onSharing={(sharing) => void updateSharing(member.connection.id, sharing)}
                onRemove={() => void disconnect(member.connection.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Your Circle is empty" body="Accepted friends and family will appear here with only the data they chose to share." />
        )}
      </section>
    </div>
  );
}

type CircleMember = ReturnType<typeof useBodyFitnessStore.getState>["account"]["circle"]["members"][number];

function MemberCard({ member, disabled, onSharing, onRemove }: { member: CircleMember; disabled: boolean; onSharing: (sharing: SharingPolicy) => void; onRemove: () => void }) {
  const { connection, summary, achievements } = member;
  const exactSteps = summary?.steps ?? null;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="icon-tile"><UsersRound size={16} aria-hidden="true" /></span>
          <div className="min-w-0">
            <CardTitle className="truncate">{connection.displayName}</CardTitle>
            <CardDescription className="mt-0 truncate text-xs">
              @{connection.handle} · {summary?.syncedAt ? `updated ${new Date(summary.syncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "no recent sync"}
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" disabled={disabled} aria-label={`Remove ${connection.displayName}`} onClick={onRemove} className="text-destructive hover:text-destructive">
          <Trash2 />
        </Button>
      </CardHeader>
      <div className="mt-4 grid grid-cols-3 border-y border-border bg-muted">
        <Metric
          value={exactSteps === null ? `${Math.round((summary?.stepGoalPercent ?? 0) * 100)}%` : exactSteps.toLocaleString("en-IN")}
          label={exactSteps === null ? "Step goal" : "Steps"}
        />
        <Metric value={summary?.workoutCompleted ? "Done" : "—"} label="Workout" bordered />
        <Metric value={`${summary?.streakDays ?? 0}d`} label="Streak" bordered />
      </div>
      {achievements[0] ? (
        <div className="flex items-start gap-3 px-5 py-3">
          <Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{achievements[0].title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{achievements[0].description}</p>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Share exact steps</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Goal progress remains shared</p>
        </div>
        <Switch
          disabled={disabled}
          checked={connection.sharing.exactSteps}
          aria-label={`Share exact steps with ${connection.displayName}`}
          onCheckedChange={(exactSteps) => onSharing({ ...connection.sharing, exactSteps })}
        />
      </div>
    </Card>
  );
}

function Metric({ value, label, bordered = false }: { value: string; label: string; bordered?: boolean }) {
  return (
    <div className={cn("px-4 py-3", bordered && "border-l border-border")}>
      <p className="number-font text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">{label}</p>
    </div>
  );
}
