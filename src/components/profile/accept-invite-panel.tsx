"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { Check, Link2, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/cloud-sync";
import { cn } from "@/lib/utils";

export function AcceptInvitePanel({ enabled, inviteToken }: { enabled: boolean; inviteToken: string }) {
  if (!enabled) return <p className="mt-4 text-sm text-muted-foreground">Cloud connections are not configured.</p>;
  return <AcceptInviteAuthenticated inviteToken={inviteToken} />;
}

function AcceptInviteAuthenticated({ inviteToken }: { inviteToken: string }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("Review the invitation, then accept to create a mutual private connection.");

  if (!isLoaded) return <LoaderCircle className="mx-auto mt-6 animate-spin text-muted-foreground" aria-label="Loading" />;
  if (!isSignedIn) {
    return (
      <div className="mt-6">
        <SignInButton mode="modal">
          <Button variant="primary" size="lg" block>Sign in to review invite</Button>
        </SignInButton>
      </div>
    );
  }

  const accept = async () => {
    setState("busy");
    try {
      const token = await getToken();
      if (!token) throw new Error("No active session");
      await acceptInvite(token, inviteToken);
      setState("done");
      setMessage("Connection accepted. Their approved progress will appear in your Circle.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not accept invite");
    }
  };

  return (
    <div className="mt-6">
      <span
        className={cn(
          "mx-auto flex size-12 items-center justify-center rounded-lg border border-border",
          state === "done" ? "bg-muted text-success" : "bg-brand-soft text-brand",
        )}
        aria-hidden="true"
      >
        {state === "done" ? <Check size={22} /> : <Link2 size={20} />}
      </span>
      <p className={cn("mx-auto mt-4 max-w-sm text-sm leading-relaxed", state === "error" ? "text-destructive" : "text-muted-foreground")} role="status">
        {message}
      </p>
      {state !== "done" ? (
        <Button variant="primary" size="lg" block className="mt-5" disabled={state === "busy"} onClick={() => void accept()}>
          {state === "busy" ? "Accepting…" : "Accept connection"}
        </Button>
      ) : null}
    </div>
  );
}
