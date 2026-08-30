import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-provider";
import { CloudSyncBridge } from "@/components/cloud-sync-bridge";

export const metadata: Metadata = {
  title: {
    default: "BodyFitness",
    template: "%s · BodyFitness",
  },
  description: "A private, local-first body recomposition and fitness tracker.",
  applicationName: "BodyFitness",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BodyFitness",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090d",
};

const themeBootstrap = `
(() => {
  try {
    const persisted = window.localStorage.getItem("bodyfitness-store");
    const preference = persisted
      ? JSON.parse(persisted)?.state?.themePreference ?? "system"
      : "system";
    const theme = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {
    const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <AuthProvider>
          {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <CloudSyncBridge /> : null}
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
