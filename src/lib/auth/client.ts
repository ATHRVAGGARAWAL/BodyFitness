import { z } from "zod";

/** Browser helpers for synced state. Clerk's session cookie authenticates the calls. */

export class SyncClientError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "SyncClientError";
  }
}

async function parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = z.object({ error: z.string(), code: z.string().optional() }).safeParse(body);
    throw new SyncClientError(err.success ? err.data.error : `Request failed (${response.status})`, response.status, err.success ? err.data.code ?? "unknown" : "unknown");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new SyncClientError("Unexpected response from the server.", 502, "client_schema_mismatch");
  return parsed.data;
}

export const RemoteStateSchema = z.object({
  state: z.record(z.string(), z.unknown()).nullable(),
  revision: z.number(),
  updatedAt: z.string().nullable(),
});
export type RemoteState = z.infer<typeof RemoteStateSchema>;

export function fetchState() {
  return fetch("/api/state", { credentials: "same-origin", cache: "no-store" }).then((r) => parse(r, RemoteStateSchema));
}

export class StateConflict extends Error {
  constructor(readonly remote: RemoteState) {
    super("conflict");
  }
}

export async function pushState(state: Record<string, unknown>, revision: number | null) {
  const response = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state, revision }), credentials: "same-origin" });
  if (response.status === 409) {
    const body = RemoteStateSchema.extend({ error: z.string() }).parse(await response.json());
    throw new StateConflict({ state: body.state, revision: body.revision, updatedAt: body.updatedAt });
  }
  return parse(response, z.object({ revision: z.number(), updatedAt: z.string() }));
}

export function deleteState() {
  return fetch("/api/state", { method: "DELETE", credentials: "same-origin" }).then((r) => parse(r, z.object({ ok: z.boolean() })));
}
