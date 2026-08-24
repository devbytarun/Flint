import { describe, expect, it } from "vitest";

import { createMemoryRateLimiter } from "@/server/rate-limit";

describe("memory rate limiter", () => {
  it("allows up to the limit within the window", () => {
    const limiter = createMemoryRateLimiter();
    for (let i = 0; i < 5; i++) {
      expect(limiter.hit("k1", 5, 60_000).success).toBe(true);
    }
    const blocked = limiter.hit("k1", 5, 60_000);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const limiter = createMemoryRateLimiter();
    for (let i = 0; i < 3; i++) limiter.hit("a", 3, 60_000);
    expect(limiter.hit("a", 3, 60_000).success).toBe(false);
    expect(limiter.hit("b", 3, 60_000).success).toBe(true);
  });

  it("reports remaining attempts", () => {
    const limiter = createMemoryRateLimiter();
    expect(limiter.hit("r", 3, 60_000).remaining).toBe(2);
    expect(limiter.hit("r", 3, 60_000).remaining).toBe(1);
  });

  it("recovers after the window elapses", async () => {
    const limiter = createMemoryRateLimiter();
    for (let i = 0; i < 2; i++) limiter.hit("w", 2, 10);
    expect(limiter.hit("w", 2, 10).success).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(limiter.hit("w", 2, 10).success).toBe(true);
  });
});
