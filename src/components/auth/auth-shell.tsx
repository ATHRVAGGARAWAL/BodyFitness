import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Two-column editorial frame around Clerk's sign-in / sign-up components. */
export function AuthShell({ children, create = false }: { children: React.ReactNode; create?: boolean }) {
  return (
    <main className="page-shell flex items-start justify-center">
      <div className="grid w-full max-w-[1000px] gap-10 pt-6 lg:grid-cols-[1fr_auto] lg:items-center lg:pt-16">
        <section className="max-w-lg">
          <p className="page-kicker mb-3">BodyFitness · Account</p>
          <h1 className="page-title">{create ? "Start saving your progress." : "Keep your progress on every device."}</h1>
          <p className="mt-4 text-base text-muted-foreground">Meals, sets, weight and AI plans are saved to your account and restored wherever you sign in. Everything still works offline on this device.</p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" /> Sign in with Google, Apple or email. Authentication is handled by Clerk.</li>
            <li className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" /> Physique photos never leave this device.</li>
          </ul>
          <p className="mt-6 text-xs text-muted-foreground"><Link href="/" className="underline-offset-2 hover:underline">Continue without an account</Link></p>
        </section>
        <div className="flex justify-center lg:justify-end">{children}</div>
      </div>
    </main>
  );
}

export function AccountsDisabled() {
  return (
    <main className="page-shell flex items-start justify-center">
      <Card className="mt-10 w-full max-w-md">
        <CardContent className="space-y-3 pt-5">
          <Badge>Device only</Badge>
          <p className="text-sm font-medium">Accounts are not enabled on this deployment.</p>
          <p className="text-sm text-muted-foreground">Your data is stored in this browser. To enable sign-in, set the Clerk keys and a database URL on the server.</p>
          <Button asChild variant="secondary" block><Link href="/">Back to the app</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
