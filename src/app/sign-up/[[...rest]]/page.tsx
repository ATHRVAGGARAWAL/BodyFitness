import { SignUp } from "@clerk/nextjs";
import { AccountsDisabled, AuthShell } from "@/components/auth/auth-shell";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <AccountsDisabled />;
  return (
    <AuthShell create>
      <SignUp path="/sign-up" routing="path" signInUrl="/login" />
    </AuthShell>
  );
}
