"use client";

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CircleCloudPanel } from "@/components/profile/circle-cloud-panel";
import { LargeTitle } from "@/components/large-title";
import { Button } from "@/components/ui/button";
import { clerkEnabled } from "@/lib/cloud-sync";

export default function CirclePage() {
  return (
    <main className="page-shell">
      <div className="mx-auto w-full md:max-w-[640px]">
        <LargeTitle
          eyebrow="Private mutual tracking"
          title="Your Circle"
          description="Only accepted connections. No public profiles, location, meal details, weight or physique photos. Either person can revoke access immediately."
          action={
            <Button asChild variant="secondary" size="icon" aria-label="Back to profile">
              <Link href="/profile"><ArrowLeft /></Link>
            </Button>
          }
        />
        <CircleCloudPanel enabled={clerkEnabled} />
        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-subtle-foreground">
          <ShieldCheck size={13} aria-hidden="true" /> Designed for friends and family, not surveillance.
        </p>
      </div>
    </main>
  );
}
