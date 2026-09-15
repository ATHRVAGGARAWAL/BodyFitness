import { SignIn } from "@clerk/nextjs";
import { AccountsDisabled, AuthShell } from "@/components/auth/auth-shell";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <AccountsDisabled />;
  return (
    <AuthShell>
      <SignIn path="/login" routing="path" signUpUrl="/sign-up" />
    </AuthShell>
  );
}
