"use client";

import { ArrowLeft, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { CircleCloudPanel } from "@/components/profile/circle-cloud-panel";
import { LargeTitle } from "@/components/large-title";
import { clerkEnabled } from "@/lib/cloud-sync";

export default function CirclePage() {
  return (
    <main className="page-shell">
      <LargeTitle eyebrow="Private mutual tracking" title="Your Circle" action={<Link href="/profile" aria-label="Back to profile" className="profile-button pressable text-inherit"><ArrowLeft size={19} /></Link>} />
      <div className="panel mb-4 flex items-start gap-3 p-4"><span className="icon-tile text-[var(--success)]"><ShieldCheck size={18} /></span><div><p className="m-0 text-sm font-black">Only accepted connections</p><p className="mt-1 text-[10px] leading-4 text-white/38">No public profiles, location, meal details, weight, or physique photos. Either person can revoke access immediately.</p></div></div>
      <CircleCloudPanel enabled={clerkEnabled} />
      <div className="mt-5 flex items-center justify-center gap-2 text-[9px] font-bold text-white/25"><UsersRound size={13} /> Designed for friends and family, not surveillance.</div>
    </main>
  );
}
