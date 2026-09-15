import { z } from "zod";
import { calculateTargets } from "@/lib/calculations";
import { guardNutritionPlan, planBounds } from "@/lib/ai/nutrition-guard";
import { planInstructions, planTask } from "@/lib/ai/prompts";
import { NutritionPlanSchema, PlanRequestSchema, type PlanResponse } from "@/lib/ai/schemas";
import { AiError, enforceRateLimit, getClient, jsonError, jsonOk, readJson, requireApiKeyOrThrow, structured } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST application/json  PlanRequest → PlanResponse
 *
 * The formula baseline is computed here (not trusted from the client), the model tunes
 * it within a safety envelope, and the guard clamps the result so the identity
 * calories ≈ 4P + 4C + 9F always holds.
 */
export async function POST(request: Request) {
  try {
    requireApiKeyOrThrow();
    enforceRateLimit(request, "plan", 10);

    const parsed = PlanRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new AiError(`Invalid profile: ${parsed.error.issues[0]?.path.join(".") ?? "body"} ${parsed.error.issues[0]?.message ?? ""}`.trim(), 400, "bad_request");
    }
    const body = parsed.data;
    if (body.profile.age < 13) throw new AiError("BodyFitness is for ages 13 and up.", 400, "underage");

    const baseline = calculateTargets(body.profile);
    const bounds = planBounds(body.profile, baseline);
    const { config } = getClient();

    const result = await structured({
      schema: NutritionPlanSchema,
      schemaName: "nutrition_plan",
      instructions: planInstructions(),
      input: planTask(body, baseline as unknown as Record<string, number>, bounds),
      effort: config.effort.analysis,
      verbosity: "medium",
      maxOutputTokens: 3_000,
    });

    const guarded = guardNutritionPlan(result.value, body.profile, bounds);
    const response: PlanResponse = {
      plan: guarded.value,
      baseline,
      adjustments: guarded.adjustments,
      model: result.model,
    };
    return jsonOk(response);
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(new AiError("The model returned an unexpected shape.", 502, "schema_mismatch"));
    return jsonError(error);
  }
}
