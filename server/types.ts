export interface RateLimitResult {
  /** Whether the action should proceed. */
  success: boolean;
  /** Remaining attempts inside the current window. */
  remaining: number;
  /** Seconds until the caller may retry (when blocked). */
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  hit(key: string, limit: number, windowMs: number): RateLimitResult;
}
