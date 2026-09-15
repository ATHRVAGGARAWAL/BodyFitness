import { z } from "zod";
import { coachInstructions, coachTask } from "@/lib/ai/prompts";
import { CoachInsightSchema, CoachRequestSchema } from "@/lib/ai/schemas";
import { AiError, enforceRateLimit, getClient, jsonError, jsonOk, readJson, requireApiKeyOrThrow, structured } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST application/json  CoachRequest → CoachInsight + meta */
export async function POST(request: Request) {
  try {
    requireApiKeyOrThrow();
    enforceRateLimit(request, "coach", 8);

    const parsed = CoachRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new AiError(`Invalid review request: ${parsed.error.issues[0]?.path.join(".") ?? "body"}`, 400, "bad_request");
    }
    const { config } = getClient();
    const result = await structured({
      schema: CoachInsightSchema,
      schemaName: "coach_insight",
      instructions: coachInstructions(),
      input: coachTask(parsed.data),
      effort: config.effort.coach,
      verbosity: "medium",
      maxOutputTokens: 3_000,
    });

    return jsonOk({ ...result.value, meta: { model: result.model, latencyMs: result.latencyMs, generatedAt: new Date().toISOString() } });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(new AiError("The model returned an unexpected shape.", 502, "schema_mismatch"));
    return jsonError(error);
  }
}
