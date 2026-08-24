import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

import { hashPassword, verifyPassword } from "@/server/auth/password";
import { pruneExpiredSessions } from "@/server/auth/session";
import { hasPostgresCode } from "@/server/lib/db-errors";

/**
 * Authentication business logic. Deliberately framework-free: no cookies,
 * no React, only domain outcomes as discriminated unions so callers (server
 * actions, future API endpoints) handle presentation concerns themselves.
 */

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
};

export type RegisterResult = { ok: true; userId: string } | { ok: false; error: "EMAIL_TAKEN" };

export type LoginResult =
  { ok: true; userId: string } | { ok: false; error: "INVALID_CREDENTIALS" };

/** Normalize emails to a canonical lowercase form before storage/lookup. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  try {
    const [user] = await db
      .insert(users)
      .values({ email, name: input.name.trim(), passwordHash })
      .returning({ id: users.id });
    return { ok: true, userId: user.id };
  } catch (error) {
    if (hasPostgresCode(error, "23505")) {
      return { ok: false, error: "EMAIL_TAKEN" };
    }
    throw error;
  }
}

export async function authenticateUser(email: string, password: string): Promise<LoginResult> {
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  // Same generic error for unknown email and wrong password (no account
  // enumeration). A dummy verify keeps timing roughly constant for the
  // unknown-email case.
  if (!user) {
    await verifyPassword(
      "$argon2id$v=19$m=19456,t=2,p=1$deadbeef$invalidhashvaluehere000000000",
      password,
    );
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return { ok: false, error: "INVALID_CREDENTIALS" };

  // Opportunistic housekeeping on successful login.
  void pruneExpiredSessions().catch(() => undefined);

  return { ok: true, userId: user.id };
}
