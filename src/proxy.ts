import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Clerk session handling for every request that can reach a route handler or page.
 * Auth is enforced inside the handlers themselves (`auth()`), so the app stays usable
 * signed-out; this just makes the session available. Without keys it passes through.
 */
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

export default clerkEnabled ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static assets; include API routes.
    "/((?!_next|sw\\.js|manifest\\.webmanifest|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|webp|ico|css|js|woff2?)$).*)",
    "/(api|trpc)(.*)",
  ],
};
