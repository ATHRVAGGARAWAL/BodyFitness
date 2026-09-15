import { ClerkProvider } from "@clerk/nextjs";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return children;
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/login"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#0c0c0d",
          colorBackground: "var(--card)",
          colorForeground: "var(--foreground)",
          colorMutedForeground: "var(--muted-foreground)",
          colorInput: "var(--card)",
          colorInputForeground: "var(--foreground)",
          colorNeutral: "var(--foreground)",
          colorBorder: "var(--border)",
          borderRadius: "8px",
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
          fontSize: "14px",
        },
        elements: {
          card: "shadow-none border border-border",
          cardBox: "shadow-none",
          formButtonPrimary: "text-sm font-medium",
          footer: "hidden",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
