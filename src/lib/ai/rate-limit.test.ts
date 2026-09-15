import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/ai/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit inside the window and then blocks", () => {
    const now = 1_000_000;
    expect(rateLimit("k", 3, 60_000, now).allowed).toBe(true);
    expect(rateLimit("k", 3, 60_000, now + 1).allowed).toBe(true);
    expect(rateLimit("k", 3, 60_000, now + 2).allowed).toBe(true);
    const blocked = rateLimit("k", 3, 60_000, now + 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("frees capacity once the window slides past the oldest hit", () => {
    const now = 1_000_000;
    rateLimit("k", 1, 10_000, now);
    expect(rateLimit("k", 1, 10_000, now + 5_000).allowed).toBe(false);
    expect(rateLimit("k", 1, 10_000, now + 10_001).allowed).toBe(true);
  });

  it("isolates keys", () => {
    rateLimit("a", 1, 60_000, 0);
    expect(rateLimit("b", 1, 60_000, 0).allowed).toBe(true);
  });
});
