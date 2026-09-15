import { VOICE_SET_INSTRUCTIONS } from "@/lib/ai/prompts";
import { VoiceSetSchema } from "@/lib/ai/schemas";
import { AiError, enforceRateLimit, getClient, jsonError, jsonOk, requireApiKeyOrThrow, structured } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const allowedTypes = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg", "audio/x-m4a", "audio/m4a"]);

export async function POST(request: Request) {
  try {
    requireApiKeyOrThrow();
    enforceRateLimit(request, "voice", 30);

    const form = await request.formData();
    const audio = form.get("audio");
    const activeExercise = String(form.get("activeExercise") || "the active exercise").slice(0, 80);
    if (!(audio instanceof File) || audio.size === 0) throw new AiError("An audio recording is required.", 400, "empty_input");
    const baseType = audio.type.split(";")[0];
    if (!allowedTypes.has(baseType)) throw new AiError("Unsupported audio format.", 400, "bad_type");
    if (audio.size > 10 * 1024 * 1024) throw new AiError("Recordings must be under 10 MB.", 400, "too_large");

    const { client, config } = getClient();
    const transcription = await client.audio.transcriptions.create({ file: audio, model: config.transcribeModel });
    const transcript = transcription.text.trim();
    if (!transcript) throw new AiError("Nothing was heard. Try again closer to the microphone.", 422, "silent");

    const parsed = await structured({
      schema: VoiceSetSchema,
      schemaName: "voice_set",
      instructions: VOICE_SET_INSTRUCTIONS,
      input: `Active exercise: ${activeExercise}\nSpoken log: ${transcript}`,
      effort: config.effort.fast,
      maxOutputTokens: 200,
    });

    return jsonOk({ transcript, ...parsed.value });
  } catch (error) {
    return jsonError(error);
  }
}
