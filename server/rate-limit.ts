/**
 * In-memory sliding-window rate limiter.
 *
 * Deliberately dependency-free and process-local: it protects this single
 * Next.js deployment adequately and keeps the design honest about its
 * limits — a multi-instance production deployment should swap the storage
 * backend for Redis (the call-site contract stays identical).
 */
import type { RateLimitResult, RateLimitStore } from "./types";

const CLEANUP_THRESHOLD = 10_000;

export function createMemoryRateLimiter(): RateLimitStore {
  // key -> timestamps of accepted-and-rejected attempts inside the window
  const hits = new Map<string, number[]>();

  function sweep(now: number): void {
    if (hits.size < CLEANUP_THRESHOLD) return;
    for (const [key, times] of hits) {
      const alive = times.filter((t) => now - t < 60 * 60 * 1000);
      if (alive.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, alive);
      }
    }
  }

  return {
    hit(key: string, limit: number, windowMs: number): RateLimitResult {
      const now = Date.now();
      const windowStart = now - windowMs;
      const previous = (hits.get(key) ?? []).filter((t) => t > windowStart);

      if (previous.length >= limit) {
        const oldest = previous[0];
        return {
          success: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
        };
      }

      previous.push(now);
      hits.set(key, previous);
      sweep(now);

      return { success: true, remaining: limit - previous.length, retryAfterSeconds: 0 };
    },
  };
}

const globalForLimiter = globalThis as unknown as { flintRateLimiter?: RateLimitStore };

/** Shared limiter instance; survives hot reloads in development. */
export const rateLimiter = globalForLimiter.flintRateLimiter ?? createMemoryRateLimiter();

if (process.env.NODE_ENV !== "production") {
  globalForLimiter.flintRateLimiter = rateLimiter;
}
