import { createHash } from "node:crypto";

/** Number of buckets in the rollout space. 10,000 gives 0.01% granularity. */
export const TOTAL_BUCKETS = 10000;

/**
 * Assign a stable bucket (0–9999) to a targeting key for a given
 * flag/environment pair.
 *
 * Algorithm: SHA-256 over `env:{environmentId}:flag:{flagId}:key:{targetingKey}`,
 * first 4 bytes interpreted as an unsigned 32-bit integer, modulo 10000.
 *
 * Properties:
 *  - Deterministic: identical inputs always produce the identical bucket,
 *    across processes, restarts, and regions.
 *  - Uniform-ish: SHA-256 output distribution makes buckets approximately
 *    equally populated; the modulo bias (~7e-8 relative) is negligible.
 *  - Independent per flag and per environment: including both ids in the
 *    salt means a user's assignment for one flag/environment says nothing
 *    about another, enabling independent gradual rollouts.
 *  - Stable across renames: uses `flagId`, never the mutable `flagKey`.
 */
export function computeBucket(environmentId: string, flagId: string, targetingKey: string): number {
  const digest = createHash("sha256")
    .update(`env:${environmentId}:flag:${flagId}:key:${targetingKey}`)
    .digest();

  // First 4 bytes, big-endian, as unsigned 32-bit integer.
  const value = digest.readUInt32BE(0);
  return value % TOTAL_BUCKETS;
}
