"use client";

import { AccountCard } from "@/components/auth/account-card";

/** Account section of the profile. Authentication is Clerk; saved data is Postgres. */
export function ProfileAuthCard({ enabled: _enabled }: { enabled?: boolean }) {
  void _enabled;
  return <AccountCard />;
}
