import "server-only";

/**
 * Server-side AI configuration.
 *
 * Mirrors the operator's Codex setup: Azure AI Foundry, Responses API, `gpt-5.6-sol`.
 * The Foundry resource speaks the OpenAI v1 wire format at `/openai/v1`, so the stock
 * OpenAI SDK works against it with a Bearer key and no proxy.
 *
 * Every value can be overridden through the environment so the same code runs against
 * OpenAI directly (set AI_BASE_URL to https://api.openai.com/v1) or any compatible host.
 */

const DEFAULT_AZURE_RESOURCE = "satvikxs-8248-resource";

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type Verbosity = "low" | "medium" | "high";

export interface AiConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  transcribeModel: string;
  provider: "azure-foundry" | "openai" | "custom";
  serviceTier: "auto" | "default" | "flex" | "priority" | null;
  effort: {
    fast: ReasoningEffort;
    analysis: ReasoningEffort;
    coach: ReasoningEffort;
  };
  timeoutMs: number;
}

function parseEffort(value: string | undefined, fallback: ReasoningEffort): ReasoningEffort {
  const allowed: ReasoningEffort[] = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];
  return value && (allowed as string[]).includes(value) ? (value as ReasoningEffort) : fallback;
}

function parseTier(value: string | undefined): AiConfig["serviceTier"] {
  if (!value) return null;
  // Codex names the priority tier "fast"; accept both spellings.
  if (value === "fast") return "priority";
  const allowed = ["auto", "default", "flex", "priority"];
  return allowed.includes(value) ? (value as AiConfig["serviceTier"]) : null;
}

function resolveBaseUrl(): { baseURL: string; provider: AiConfig["provider"] } {
  const explicit = process.env.AI_BASE_URL?.replace(/\/$/, "");
  if (explicit) {
    if (explicit.includes("api.openai.com")) return { baseURL: explicit, provider: "openai" };
    if (explicit.includes(".azure.com")) return { baseURL: explicit, provider: "azure-foundry" };
    return { baseURL: explicit, provider: "custom" };
  }
  const resource = process.env.AZURE_AI_RESOURCE || DEFAULT_AZURE_RESOURCE;
  return {
    baseURL: `https://${resource}.services.ai.azure.com/openai/v1`,
    provider: "azure-foundry",
  };
}

let cached: AiConfig | null | undefined;

/** Returns the resolved config, or null when no API key is present. */
export function getAiConfig(): AiConfig | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.AI_API_KEY || process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    cached = null;
    return cached;
  }
  const { baseURL, provider } = resolveBaseUrl();
  cached = {
    apiKey,
    baseURL,
    provider,
    model: process.env.AI_MODEL || "gpt-5.6-sol",
    transcribeModel: process.env.AI_TRANSCRIBE_MODEL || process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe",
    serviceTier: parseTier(process.env.AI_SERVICE_TIER),
    effort: {
      fast: parseEffort(process.env.AI_EFFORT_FAST, "low"),
      analysis: parseEffort(process.env.AI_EFFORT_ANALYSIS, "medium"),
      coach: parseEffort(process.env.AI_EFFORT_COACH, "high"),
    },
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) > 0 ? Number(process.env.AI_TIMEOUT_MS) : 55_000,
  };
  return cached;
}

/** Safe-to-expose summary for health checks and the UI. Never includes the key. */
export function describeAi() {
  const config = getAiConfig();
  if (!config) return { configured: false as const };
  return {
    configured: true as const,
    provider: config.provider,
    model: config.model,
    effort: config.effort,
    serviceTier: config.serviceTier,
  };
}
