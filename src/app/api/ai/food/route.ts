import { z } from "zod";
import { sniffImageType } from "@/lib/ai/image";
import { guardFoodAnalysis } from "@/lib/ai/nutrition-guard";
import { FOOD_IMAGE_TASK, foodInstructions, foodTextTask } from "@/lib/ai/prompts";
import { FoodAnalysisSchema, FoodContextSchema } from "@/lib/ai/schemas";
import { AiError, enforceRateLimit, getClient, jsonError, jsonOk, requireApiKeyOrThrow, structured } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DESCRIPTION = 1_200;

function parseContext(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return FoodContextSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * POST multipart/form-data
 *   image?: File                 photo of the meal
 *   description?: string         text description (used alone, or alongside the photo)
 *   context?: JSON FoodContext   optional personalisation
 * At least one of image / description is required.
 */
export async function POST(request: Request) {
  try {
    requireApiKeyOrThrow();
    enforceRateLimit(request, "food", 20);

    const form = await request.formData();
    const image = form.get("image");
    const description = String(form.get("description") ?? "").trim().slice(0, MAX_DESCRIPTION);
    const context = parseContext(form.get("context"));
    const hasImage = image instanceof File && image.size > 0;

    if (!hasImage && description.length < 3) {
      throw new AiError("Add a photo or describe the meal.", 400, "empty_input");
    }
    if (hasImage) {
      if (!allowedTypes.has(image.type)) throw new AiError("Use a JPEG, PNG, WebP or HEIC image.", 400, "bad_type");
      if (image.size > MAX_IMAGE_BYTES) throw new AiError("Images must be under 8 MB.", 400, "too_large");
    }

    const { config } = getClient();
    const content: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "high" }> = [];
    if (hasImage) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const sniffed = sniffImageType(new Uint8Array(buffer.buffer, buffer.byteOffset, Math.min(buffer.length, 16)));
      if (!sniffed) throw new AiError("That file is not a readable image. Use a JPEG, PNG, WebP or HEIC photo.", 400, "bad_image");
      content.push({ type: "input_text", text: description ? `${FOOD_IMAGE_TASK}\n\nThe user added: "${description}"` : FOOD_IMAGE_TASK });
      content.push({ type: "input_image", image_url: `data:${sniffed};base64,${buffer.toString("base64")}`, detail: "high" });
    } else {
      content.push({ type: "input_text", text: foodTextTask(description) });
    }

    const result = await structured({
      schema: FoodAnalysisSchema,
      schemaName: "food_analysis",
      instructions: foodInstructions(context),
      input: content,
      effort: config.effort.analysis,
      verbosity: "low",
    });

    const guarded = guardFoodAnalysis(result.value);
    return jsonOk({
      ...guarded.value,
      adjustments: guarded.adjustments,
      meta: { model: result.model, latencyMs: result.latencyMs, source: hasImage ? "image" : "text" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return jsonError(new AiError("The model returned an unexpected shape.", 502, "schema_mismatch"));
    return jsonError(error);
  }
}
