"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { Check, Link2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { acceptInvite } from "@/lib/cloud-sync";

export function AcceptInvitePanel({ enabled, inviteToken }: { enabled: boolean; inviteToken: string }) {
  if (!enabled) return <p className="text-sm text-white/45">Cloud connections are not configured.</p>;
  return <AcceptInviteAuthenticated inviteToken={inviteToken} />;
}

function AcceptInviteAuthenticated({ inviteToken }: { inviteToken: string }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("Review the invitation, then accept to create a mutual private connection.");
  if (!isLoaded) return <LoaderCircle className="mx-auto animate-spin" />;
  if (!isSignedIn) return <SignInButton mode="modal"><button className="primary-action pressable min-h-12 w-full rounded-[14px] text-xs font-black">Sign in to review invite</button></SignInButton>;
  const accept = async () => {
    setState("busy");
    try { const token = await getToken(); if (!token) throw new Error("No active session"); await acceptInvite(token, inviteToken); setState("done"); setMessage("Connection accepted. Their approved progress will appear in your Circle."); }
    catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "Could not accept invite"); }
  };
  return <div><span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] ${state === "done" ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]" : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"}`}>{state === "done" ? <Check size={25} /> : <Link2 size={24} />}</span><p className="mx-auto mt-4 max-w-[280px] text-[11px] leading-5 text-white/42">{message}</p>{state !== "done" ? <button disabled={state === "busy"} onClick={accept} className="primary-action pressable mt-4 min-h-12 w-full rounded-[14px] text-xs font-black">{state === "busy" ? "Accepting…" : "Accept connection"}</button> : null}</div>;
}
