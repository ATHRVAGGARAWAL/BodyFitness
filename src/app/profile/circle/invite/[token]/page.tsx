import { AcceptInvitePanel } from "@/components/profile/accept-invite-panel";
import { Card, CardContent } from "@/components/ui/card";
import { clerkEnabled } from "@/lib/cloud-sync";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="page-shell flex min-h-[100dvh] items-center">
      <div className="mx-auto w-full md:max-w-[640px]">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <p className="page-kicker">BodyFitness Circle</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Private connection invite</h1>
            <AcceptInvitePanel enabled={clerkEnabled} inviteToken={token} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
