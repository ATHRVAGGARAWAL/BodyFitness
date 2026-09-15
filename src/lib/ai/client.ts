import {
  AiErrorSchema,
  CoachInsightSchema,
  FoodAnalysisSchema,
  PlanResponseSchema,
  type CoachInsight,
  type CoachRequest,
  type FoodAnalysis,
  type FoodContext,
  type PlanRequest,
  type PlanResponse,
} from "@/lib/ai/schemas";
import { z } from "zod";

/** Browser-side helpers. Every response is validated before it reaches the store. */

export class AiClientError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "AiClientError";
  }
}

async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = AiErrorSchema.safeParse(body);
    throw new AiClientError(
      parsed.success ? parsed.data.error : `Request failed (${response.status})`,
      response.status,
      parsed.success ? parsed.data.code ?? "unknown" : "unknown",
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AiClientError("Unexpected response from the AI service.", 502, "client_schema_mismatch");
  return parsed.data;
}

const FoodResultSchema = FoodAnalysisSchema.extend({
  adjustments: z.array(z.string()),
  meta: z.object({ model: z.string(), latencyMs: z.number(), source: z.enum(["image", "text"]) }),
});
export type FoodResult = z.infer<typeof FoodResultSchema>;

export async function analyzeMeal(input: { image?: File | Blob; description?: string; context?: FoodContext }): Promise<FoodResult> {
  const form = new FormData();
  if (input.image) form.append("image", input.image, "meal.jpg");
  if (input.description) form.append("description", input.description);
  if (input.context) form.append("context", JSON.stringify(input.context));
  const response = await fetch("/api/ai/food", { method: "POST", body: form });
  return parseResponse(response, FoodResultSchema);
}

export async function configurePlan(request: PlanRequest): Promise<PlanResponse> {
  const response = await fetch("/api/ai/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseResponse(response, PlanResponseSchema);
}

const CoachResultSchema = CoachInsightSchema.extend({
  meta: z.object({ model: z.string(), latencyMs: z.number(), generatedAt: z.string() }),
});
export type CoachResult = z.infer<typeof CoachResultSchema>;

export async function requestCoachReview(request: CoachRequest): Promise<CoachResult> {
  const response = await fetch("/api/ai/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseResponse(response, CoachResultSchema);
}

export type { CoachInsight, FoodAnalysis };
