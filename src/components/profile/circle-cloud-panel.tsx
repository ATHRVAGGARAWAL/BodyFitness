"use client";

import { useAuth, SignInButton } from "@clerk/nextjs";
import { QRCodeSVG } from "qrcode.react";
import { Copy, LogIn, Plus, RefreshCw, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";
import { createInvite, fetchCircle, removeConnection, updateConnectionSharing } from "@/lib/cloud-sync";
import { useBodyFitnessStore } from "@/lib/store";
import type { SharingPolicy } from "@/lib/types";

export function CircleCloudPanel({ enabled }: { enabled: boolean }) {
  if (!enabled) return <UnavailablePanel />;
  return <CircleAuthenticatedPanel />;
}

function UnavailablePanel() {
  return (
    <div className="panel p-5 text-center">
      <UsersRound className="mx-auto text-[var(--accent-strong)]" size={28} />
      <p className="mb-0 mt-3 text-base font-black">Circle needs cloud configuration</p>
      <p className="mx-auto mt-2 max-w-[290px] text-[11px] leading-5 text-white/40">Configure Clerk and the Railway API to create private mutual connections. Personal tracking remains local.</p>
    </div>
  );
}

function CircleAuthenticatedPanel() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const circle = useBodyFitnessStore((state) => state.account.circle);
  const setCircle = useBodyFitnessStore((state) => state.setCircle);
  const [handle, setHandle] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isLoaded) return <div className="panel h-28 animate-pulse" />;
  if (!isSignedIn) {
    return (
      <div className="panel p-5 text-center">
        <LogIn className="mx-auto text-[var(--accent-strong)]" size={27} />
        <p className="mb-0 mt-3 text-base font-black">Sign in to create your Circle</p>
        <p className="mx-auto mt-2 max-w-[285px] text-[11px] leading-5 text-white/40">Connections are mutual and private. No public profiles or contact-book upload.</p>
        <SignInButton mode="modal"><button className="primary-action pressable mt-4 min-h-12 w-full rounded-[14px] text-xs font-black">Sign in</button></SignInButton>
      </div>
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

  return (
    <>
      <div className="panel p-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile text-[var(--accent-strong)]"><UserPlus size={18} /></span>
          <div className="min-w-0 flex-1"><p className="m-0 text-sm font-black">Invite someone you trust</p><p className="mt-1 text-[10px] text-white/38">Use an exact handle, or create a private expiring link.</p></div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="relative min-w-0 flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30">@</span><input aria-label="Friend handle" className="ios-field min-h-12 pl-7 text-sm font-bold" placeholder="handle or leave blank" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} /></div>
          <button disabled={busy} onClick={invite} className="primary-action pressable flex min-h-12 items-center gap-1.5 rounded-[14px] px-4 text-[10px] font-black"><Plus size={15} /> Invite</button>
        </div>
        {message ? <p className="mb-0 mt-3 text-[10px] leading-4 text-white/45">{message}</p> : null}
      </div>

      {inviteUrl ? (
        <div className="panel mt-3 p-4">
          <div className="flex gap-4">
            <div className="rounded-[14px] bg-white p-2"><QRCodeSVG value={inviteUrl} size={92} /></div>
            <div className="min-w-0 flex-1"><p className="m-0 text-sm font-black">Private invite</p><p className="mt-1 break-all text-[9px] leading-4 text-white/35">{inviteUrl}</p><button onClick={() => void navigator.clipboard.writeText(inviteUrl)} className="pressable mt-2 flex min-h-11 items-center gap-1.5 rounded-[12px] border border-[var(--border)] px-3 text-[10px] font-black"><Copy size={14} /> Copy link</button></div>
          </div>
        </div>
      ) : null}

      <div className="mb-3 mt-8 flex items-center justify-between px-1">
        <div><p className="section-index m-0">02</p><h2 className="section-title mt-1">Connected people</h2></div>
        <button aria-label="Refresh Circle" disabled={busy} onClick={refresh} className="icon-button pressable"><RefreshCw size={16} className={busy ? "animate-spin" : ""} /></button>
      </div>

      {circle.members.length ? <div className="space-y-3">{circle.members.map((member) => <MemberCard key={member.connection.id} member={member} disabled={busy} onSharing={(sharing) => void updateSharing(member.connection.id, sharing)} onRemove={() => void disconnect(member.connection.id)} />)}</div> : (
        <div className="panel p-6 text-center"><UsersRound className="mx-auto text-white/25" size={28} /><p className="mb-0 mt-3 text-sm font-black">Your Circle is empty</p><p className="mx-auto mt-2 max-w-[250px] text-[10px] leading-4 text-white/35">Accepted friends and family will appear here with only the data they chose to share.</p></div>
      )}
    </>
  );
}

function MemberCard({ member, disabled, onSharing, onRemove }: { member: ReturnType<typeof useBodyFitnessStore.getState>["account"]["circle"]["members"][number]; disabled: boolean; onSharing: (sharing: SharingPolicy) => void; onRemove: () => void }) {
  const { connection, summary, achievements } = member;
  return (
    <article className="panel overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[var(--accent-soft)] text-[var(--accent-strong)]"><UsersRound size={21} /></span>
        <div className="min-w-0 flex-1"><p className="m-0 truncate text-sm font-black">{connection.displayName}</p><p className="mt-1 text-[9px] text-white/35">@{connection.handle} · {summary?.syncedAt ? `updated ${new Date(summary.syncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "no recent sync"}</p></div>
        <button disabled={disabled} aria-label={`Remove ${connection.displayName}`} onClick={onRemove} className="icon-button pressable text-[var(--danger)]"><Trash2 size={15} /></button>
      </div>
      <div className="grid grid-cols-3 border-y border-[var(--border)] bg-[var(--surface-soft)] p-3 text-center">
        <Metric value={summary?.steps === null || summary?.steps === undefined ? `${Math.round((summary?.stepGoalPercent ?? 0) * 100)}%` : summary.steps.toLocaleString("en-IN")} label={summary?.steps === null || summary?.steps === undefined ? "Step goal" : "Steps"} />
        <Metric value={summary?.workoutCompleted ? "Done" : "—"} label="Workout" bordered />
        <Metric value={`${summary?.streakDays ?? 0}d`} label="Streak" bordered />
      </div>
      {achievements[0] ? <div className="flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[color-mix(in_srgb,var(--success)_13%,transparent)] text-[var(--success)]">✓</span><div><p className="m-0 text-[11px] font-black">{achievements[0].title}</p><p className="mt-1 text-[9px] text-white/32">{achievements[0].description}</p></div></div> : null}
      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3"><div><p className="m-0 text-[10px] font-black">Share exact steps</p><p className="mt-1 text-[8px] text-white/30">Goal progress remains shared</p></div><button disabled={disabled} role="switch" aria-checked={connection.sharing.exactSteps} onClick={() => onSharing({ ...connection.sharing, exactSteps: !connection.sharing.exactSteps })} className={`relative h-8 w-[52px] rounded-[11px] p-0.5 ${connection.sharing.exactSteps ? "bg-[var(--success)]" : "toggle-off"}`}><span className={`block h-7 w-7 rounded-[9px] bg-white shadow transition-transform ${connection.sharing.exactSteps ? "translate-x-5" : ""}`} /></button></div>
    </article>
  );
}

function Metric({ value, label, bordered = false }: { value: string; label: string; bordered?: boolean }) { return <div className={bordered ? "border-l border-[var(--border)]" : ""}><p className="number-font m-0 text-sm font-black">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[0.06em] text-white/27">{label}</p></div>; }
