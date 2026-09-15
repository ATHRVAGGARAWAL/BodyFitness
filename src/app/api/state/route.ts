import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured, requireDb, StorageUnavailableError } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whole-app state per Clerk user. Tens of KB, so one JSONB row is the right shape. */

const MAX_STATE_BYTES = 2 * 1024 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

const PutSchema = z.object({
  state: z.record(z.string(), z.unknown()),
  /** Revision the client last saw; a mismatch returns 409 with the server copy. */
  revision: z.number().int().nonnegative().nullable().default(null),
});

type StateRow = { state: Record<string, unknown>; revision: number; updated_at: Date };

class HttpError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

async function requireUserId() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) throw new HttpError("Accounts are not enabled on this deployment.", 503, "auth_unavailable");
  if (!isDatabaseConfigured()) throw new StorageUnavailableError();
  const { userId } = await auth();
  if (!userId) throw new HttpError("Sign in to sync your data.", 401, "unauthenticated");
  return userId;
}

function fail(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: NO_STORE });
  if (error instanceof StorageUnavailableError) return NextResponse.json({ error: error.message, code: "storage_unavailable" }, { status: 503, headers: NO_STORE });
  if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input.", code: "bad_request" }, { status: 400, headers: NO_STORE });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Request body must be JSON.", code: "bad_json" }, { status: 400, headers: NO_STORE });
  console.error("[state]", error);
  return NextResponse.json({ error: "Something went wrong.", code: "unknown" }, { status: 500, headers: NO_STORE });
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const sql = await requireDb();
    const rows = await sql<StateRow[]>`SELECT state, revision, updated_at FROM app_state WHERE user_id = ${userId}`;
    const row = rows[0];
    return NextResponse.json(row ? { state: row.state, revision: row.revision, updatedAt: row.updated_at.toISOString() } : { state: null, revision: 0, updatedAt: null }, { headers: NO_STORE });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireUserId();
    const text = await request.text();
    if (text.length > MAX_STATE_BYTES) throw new HttpError("State is too large to store.", 413, "too_large");
    const body = PutSchema.parse(JSON.parse(text));
    const sql = await requireDb();

    const result = await sql.begin(async (tx) => {
      const current = await tx<StateRow[]>`SELECT state, revision, updated_at FROM app_state WHERE user_id = ${userId} FOR UPDATE`;
      const row = current[0];
      if (row && body.revision !== null && body.revision !== row.revision) {
        return { conflict: true as const, state: row.state, revision: row.revision, updatedAt: row.updated_at.toISOString() };
      }
      const revision = (row?.revision ?? 0) + 1;
      const saved = await tx<Array<{ updated_at: Date }>>`
        INSERT INTO app_state (user_id, state, revision, updated_at)
        VALUES (${userId}, ${tx.json(body.state as never)}, ${revision}, now())
        ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, revision = EXCLUDED.revision, updated_at = now()
        RETURNING updated_at`;
      return { conflict: false as const, revision, updatedAt: saved[0].updated_at.toISOString() };
    });

    if (result.conflict) return NextResponse.json({ error: "Your data changed elsewhere.", code: "conflict", state: result.state, revision: result.revision, updatedAt: result.updatedAt }, { status: 409, headers: NO_STORE });
    return NextResponse.json({ revision: result.revision, updatedAt: result.updatedAt }, { headers: NO_STORE });
  } catch (error) {
    return fail(error);
  }
}

/** Erases the user's synced state (account deletion flow). */
export async function DELETE() {
  try {
    const userId = await requireUserId();
    const sql = await requireDb();
    await sql`DELETE FROM app_state WHERE user_id = ${userId}`;
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return fail(error);
  }
}
