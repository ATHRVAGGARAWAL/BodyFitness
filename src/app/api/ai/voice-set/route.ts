import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VoiceSetSchema = z.object({
  weightKg: z.number().nonnegative().nullable(),
  reps: z.number().int().nonnegative().nullable(),
  confidence: z.number().min(0).max(1),
});

const allowedTypes = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg", "audio/x-m4a"]);

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Add OPENAI_API_KEY to enable voice logging." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const activeExercise = String(form.get("activeExercise") || "the active exercise");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "An audio recording is required." }, { status: 400 });
    }
    if (!allowedTypes.has(audio.type) || audio.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Use a supported recording under 10 MB." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000 });
    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-transcribe",
    });
    const parsed = await client.responses.parse({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
      instructions: "Extract a gym set into kilograms and repetitions. Convert pounds to kilograms only when the speaker explicitly says pounds. Do not invent missing values.",
      input: `Active exercise: ${activeExercise}\nSpoken log: ${transcription.text}`,
      text: { format: zodTextFormat(VoiceSetSchema, "voice_set") },
    });
    if (!parsed.output_parsed) throw new Error("The set could not be parsed.");
    return NextResponse.json({ transcript: transcription.text, ...parsed.output_parsed }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice logging failed.";
    return NextResponse.json({ error: message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
