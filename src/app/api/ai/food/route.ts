import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FoodAnalysisSchema = z.object({
  name: z.string(),
  items: z.array(z.object({
    name: z.string(),
    portion: z.string(),
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
  })).min(1),
  totals: z.object({
    calories: z.number().nonnegative(),
    proteinG: z.number().nonnegative(),
    carbsG: z.number().nonnegative(),
    fatG: z.number().nonnegative(),
  }),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()),
});

const SYSTEM_CONTEXT = "Context: This is Indian hostel mess food. Account for hidden oils in gravies, identify roti vs naan, and expect standard Indian portions.";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Add OPENAI_API_KEY to enable meal analysis." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "An image is required." }, { status: 400 });
    }
    if (!allowedTypes.has(image.type) || image.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Use a JPEG, PNG or WebP image under 8 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const dataUrl = `data:${image.type};base64,${buffer.toString("base64")}`;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000 });
    const response = await client.responses.parse({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
      instructions: "You are a cautious sports nutrition estimator. Return realistic rounded values, include cooking-oil assumptions, and never claim laboratory precision.",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: `${SYSTEM_CONTEXT}\nIdentify every visible food, estimate portions and return itemized macros. Ensure totals equal the sum of items.` },
          { type: "input_image", image_url: dataUrl, detail: "high" },
        ],
      }],
      text: { format: zodTextFormat(FoodAnalysisSchema, "food_analysis") },
    });

    if (!response.output_parsed) throw new Error("The model did not return a structured result.");
    return NextResponse.json(response.output_parsed, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meal analysis failed.";
    return NextResponse.json({ error: message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
