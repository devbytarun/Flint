import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id with OWASP-recommended baseline parameters:
 * 19 MiB memory, 2 iterations, 1 parallelism.
 *
 * Encoded hashes embed their own salt and parameters, so future parameter
 * upgrades can be rolled out per-user at login time without a migration
 * (verify-then-rehash).
 */
const ARGON2_OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS);
}

export function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  return verify(hashValue, password, ARGON2_OPTS);
}
