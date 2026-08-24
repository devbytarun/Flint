import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "./cookies";

/**
 * Session model: opaque random token in an httpOnly cookie; only its
 * SHA-256 hash is persisted. Stealing the database therefore does not
 * yield usable session tokens ("defense in depth" against dumps).
 */

/** Sessions past 50% of their lifetime are refreshed on access (sliding window). */
const REFRESH_THRESHOLD_SECONDS = SESSION_DURATION_SECONDS / 2;

export interface SessionWithUser {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
  user: Pick<User, "id" | "email" | "name">;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  metadata: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    ipAddress: metadata.ipAddress ?? null,
    userAgent: metadata.userAgent ?? null,
  });

  return { token, expiresAt };
}

/**
 * Validate a raw session token. Returns null for missing/unknown/expired
 * tokens. Valid sessions within the refresh threshold get their expiry
 * extended (write happens only when needed to avoid a write per request).
 */
export async function validateSession(
  rawToken: string | undefined,
): Promise<SessionWithUser | null> {
  if (!rawToken) return null;

  const sessionId = hashToken(rawToken);

  const [row] = await db
    .select({
      session: { id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt },
      user: { id: users.id, email: users.email, name: users.name },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) return null;

  if (row.session.expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_SECONDS * 1000) {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    await db.update(sessions).set({ expiresAt: newExpiresAt }).where(eq(sessions.id, sessionId));
    row.session.expiresAt = newExpiresAt;
  }

  return row;
}

export async function destroySession(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await db.delete(sessions).where(eq(sessions.id, hashToken(rawToken)));
}

/** Remove expired sessions housekeeping — called opportunistically on login. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export { SESSION_COOKIE_NAME };
