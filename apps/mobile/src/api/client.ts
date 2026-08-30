import { ApiErrorSchema } from "@bodyfitness/contracts";

export const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const webBaseUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/$/, "");
export const apiConfigured = /^https?:\/\//.test(apiBaseUrl);

export class ApiRequestError extends Error {
  constructor(message: string, public status: number, public code = "REQUEST_FAILED") {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: { token: string; method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown }) {
  if (!apiConfigured) throw new ApiRequestError("Set EXPO_PUBLIC_API_URL to connect cloud features.", 503, "API_NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: { Authorization: `Bearer ${options.token}`, Accept: "application/json", ...(options.body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const parsed = ApiErrorSchema.safeParse(await response.json().catch(() => null));
      throw new ApiRequestError(parsed.success ? parsed.data.message : `Request failed (${response.status})`, response.status, parsed.success ? parsed.data.error : "REQUEST_FAILED");
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ApiRequestError("The server took too long to respond.", 408, "TIMEOUT");
    throw new ApiRequestError(error instanceof Error ? error.message : "Network request failed.", 0, "NETWORK_ERROR");
  } finally {
    clearTimeout(timer);
  }
}
