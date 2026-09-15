import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getAiConfig, type ReasoningEffort, type Verbosity } from "@/lib/ai/config";
import { clientKey, rateLimit } from "@/lib/ai/rate-limit";

export class AiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "AiError";
  }
}

let client: OpenAI | null = null;

export function getClient() {
  const config = getAiConfig();
  if (!config) throw new AiError("AI is not configured. Set AI_API_KEY (or AZURE_OPENAI_API_KEY).", 503, "ai_not_configured");
  if (!client) {
    client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeoutMs,
      maxRetries: 2,
      defaultHeaders: { "api-key": config.apiKey },
    });
  }
  return { client, config };
}

type InputContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "low" | "high" | "auto" };

export interface StructuredRequest<T> {
  schema: ZodType<T>;
  schemaName: string;
  instructions: string;
  input: string | InputContent[];
  effort: ReasoningEffort;
  verbosity?: Verbosity;
  maxOutputTokens?: number;
}

export interface StructuredResult<T> {
  value: T;
  model: string;
  usage: { input: number; output: number; reasoning: number };
  latencyMs: number;
}

/**
 * One structured call: strict JSON schema, reasoning effort, transient-error retry,
 * and a typed result. Everything model-facing goes through here.
 */
export async function structured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>> {
  const { client, config } = getClient();
  const started = Date.now();
  const input = typeof request.input === "string"
    ? request.input
    : [{ role: "user" as const, content: request.input }];

  try {
    const response = await client.responses.parse({
      model: config.model,
      instructions: request.instructions,
      input,
      reasoning: { effort: request.effort },
      text: {
        format: zodTextFormat(request.schema, request.schemaName),
        verbosity: request.verbosity ?? "low",
      },
      max_output_tokens: request.maxOutputTokens ?? 4_000,
      ...(config.serviceTier ? { service_tier: config.serviceTier } : {}),
      store: false,
    });

    const refusal = response.output
      .flatMap((item) => (item.type === "message" ? item.content : []))
      .find((part) => part.type === "refusal");
    if (refusal && refusal.type === "refusal") {
      throw new AiError(refusal.refusal || "The model declined this request.", 422, "refusal");
    }
    if (response.status === "incomplete") {
      throw new AiError(`The model stopped early (${response.incomplete_details?.reason ?? "unknown"}). Try a simpler input.`, 502, "incomplete");
    }
    if (!response.output_parsed) {
      throw new AiError("The model did not return a structured result.", 502, "no_output");
    }

    return {
      value: response.output_parsed,
      model: response.model,
      usage: {
        input: response.usage?.input_tokens ?? 0,
        output: response.usage?.output_tokens ?? 0,
        reasoning: response.usage?.output_tokens_details?.reasoning_tokens ?? 0,
      },
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 502;
      if (status === 401 || status === 403) throw new AiError("The AI key was rejected by the provider.", 502, "auth");
      if (status === 404) throw new AiError(`Model "${config.model}" is not deployed at ${config.baseURL}.`, 502, "model_not_found");
      if (status === 429) throw new AiError("The AI provider is rate limiting requests. Try again in a moment.", 503, "provider_rate_limited");
      throw new AiError(error.message || "The AI provider returned an error.", 502, "provider_error");
    }
    if (error instanceof Error && /timed? ?out|aborted/i.test(error.message)) {
      throw new AiError("The analysis took too long. Try again with a clearer photo or shorter description.", 504, "timeout");
    }
    throw new AiError(error instanceof Error ? error.message : "AI request failed.", 502, "unknown");
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonOk<T>(body: T, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { headers: { ...NO_STORE, ...extra } });
}

export function jsonError(error: unknown) {
  if (error instanceof AiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: NO_STORE });
  }
  const message = error instanceof Error ? error.message : "Request failed.";
  return NextResponse.json({ error: message, code: "unknown" }, { status: 500, headers: NO_STORE });
}

/** Rejects with 429 when the caller has exceeded `limit` requests per `windowMs`. */
export function enforceRateLimit(request: Request, scope: string, limit: number, windowMs = 60_000) {
  const result = rateLimit(`${scope}:${clientKey(request)}`, limit, windowMs);
  if (!result.allowed) {
    throw new AiError(`Too many requests. Try again in ${result.retryAfterSeconds}s.`, 429, "rate_limited");
  }
  return result;
}

/** Guards against oversized JSON bodies before parsing. */
export async function readJson(request: Request, maxBytes = 256 * 1024): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new AiError("Request body is too large.", 413, "too_large");
  const text = await request.text();
  if (text.length > maxBytes) throw new AiError("Request body is too large.", 413, "too_large");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AiError("Request body must be JSON.", 400, "bad_json");
  }
}

export function requireApiKeyOrThrow() {
  if (!getAiConfig()) throw new AiError("AI is not configured on this deployment.", 503, "ai_not_configured");
}
