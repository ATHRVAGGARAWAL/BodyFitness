import { NextResponse } from "next/server";
import { describeAi } from "@/lib/ai/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness + capability probe for Vercel/Railway health checks. Never leaks secrets. */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "bodyfitness-web",
      time: new Date().toISOString(),
      ai: describeAi(),
      cloudApi: Boolean(process.env.NEXT_PUBLIC_API_BASE_URL),
      auth: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
