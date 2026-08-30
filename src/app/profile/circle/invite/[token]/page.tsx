import { AcceptInvitePanel } from "@/components/profile/accept-invite-panel";
import { clerkEnabled } from "@/lib/cloud-sync";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="page-shell flex min-h-[100dvh] items-center">
      <div className="panel w-full p-6 text-center">
        <p className="page-kicker">BodyFitness Circle</p>
        <h1 className="m-0 mt-2 text-[31px] font-black tracking-[-0.055em]">Private connection invite</h1>
        <AcceptInvitePanel enabled={clerkEnabled} inviteToken={token} />
      </div>
    </main>
  );
}
