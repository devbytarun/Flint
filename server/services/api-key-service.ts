import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { apiKeys, auditLogs, environments, type ApiKey, type Environment } from "@/db/schema";

/**
 * API keys authenticate consuming applications against one environment.
 *
 * Token anatomy: `flint.<environmentKey>.<secret>`
 *  - Dots are the delimiters because they cannot occur in base64url
 *    secrets or environment keys, making parsing unambiguous.
 *  - The full token is the credential. Only its SHA-256 hash is stored.
 *  - `displayToken` keeps a non-secret prefix (secret truncated to 8 chars)
 *    so presented keys can be looked up directly, then verified with a
 *    constant-time hash comparison.
 */

const SECRET_BYTES = 32;
const TOKEN_PREFIX = "flint";
/** last_used_at is refreshed at most once per hour per key (write throttle). */
const LAST_USED_WRITE_INTERVAL_MS = 60 * 60 * 1000;

export class ApiKeyNotFoundError extends Error {
  name = "ApiKeyNotFoundError";
}

function sha256(input: string): Buffer {
  return createHash("sha256").update(input).digest();
}

function buildToken(environmentKey: string, secret: string): string {
  return `${TOKEN_PREFIX}.${environmentKey}.${secret}`;
}

export interface CreatedApiKey {
  apiKey: ApiKey;
  /** The only time the raw token is available. */
  token: string;
}

export async function createApiKey(input: {
  actorId: string;
  actorEmail: string;
  projectId: string;
  environmentId: string;
  name: string;
}): Promise<CreatedApiKey> {
  const [environment] = await db
    .select()
    .from(environments)
    .where(eq(environments.id, input.environmentId))
    .limit(1);

  if (!environment || environment.projectId !== input.projectId) {
    throw new ApiKeyNotFoundError("Environment does not belong to this project");
  }

  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const token = buildToken(environment.key, secret);
  const displayToken = buildToken(environment.key, secret.slice(0, 8));

  return db.transaction(async (tx) => {
    const [apiKey] = await tx
      .insert(apiKeys)
      .values({
        projectId: input.projectId,
        environmentId: input.environmentId,
        name: input.name,
        displayToken,
        keyHash: sha256(token).toString("hex"),
      })
      .returning();

    await tx.insert(auditLogs).values({
      projectId: input.projectId,
      environmentId: input.environmentId,
      environmentKey: environment.key,
      actorUserId: input.actorId,
      actorEmail: input.actorEmail,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: apiKey.id,
      resourceLabel: apiKey.name,
      changes: { after: { name: apiKey.name, displayToken } },
    });

    return { apiKey, token };
  });
}

export interface ApiKeyWithEnvironment {
  apiKey: Pick<ApiKey, "id" | "name" | "displayToken" | "lastUsedAt" | "revokedAt" | "createdAt">;
  environment: Pick<Environment, "id" | "key" | "name">;
}

/** List keys across the project (all environments), newest first. */
export async function listApiKeys(projectId: string): Promise<ApiKeyWithEnvironment[]> {
  return db
    .select({
      apiKey: {
        id: apiKeys.id,
        name: apiKeys.name,
        displayToken: apiKeys.displayToken,
        lastUsedAt: apiKeys.lastUsedAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      },
      environment: {
        id: environments.id,
        key: environments.key,
        name: environments.name,
      },
    })
    .from(apiKeys)
    .innerJoin(environments, eq(environments.id, apiKeys.environmentId))
    .where(eq(apiKeys.projectId, projectId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(input: {
  actorId: string;
  actorEmail: string;
  projectId: string;
  apiKeyId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [key] = await tx.select().from(apiKeys).where(eq(apiKeys.id, input.apiKeyId)).limit(1);

    if (!key || key.projectId !== input.projectId) {
      throw new ApiKeyNotFoundError("API key not found in this project");
    }
    if (key.revokedAt) return; // idempotent

    const [environment] = await tx
      .select({ key: environments.key })
      .from(environments)
      .where(eq(environments.id, key.environmentId))
      .limit(1);

    await tx.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, input.apiKeyId));

    await tx.insert(auditLogs).values({
      projectId: input.projectId,
      environmentId: key.environmentId,
      environmentKey: environment?.key ?? null,
      actorUserId: input.actorId,
      actorEmail: input.actorEmail,
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: key.id,
      resourceLabel: key.name,
      changes: { before: { revokedAt: null }, after: { revokedAt: new Date().toISOString() } },
    });
  });
}

export interface AuthenticatedApiKey {
  apiKeyId: string;
  projectId: string;
  environmentId: string;
  environmentKey: string;
}

/**
 * Authenticate a raw token presented to the public API.
 *
 * Flow: split off the non-secret display prefix → direct index lookup →
 * constant-time comparison of SHA-256 digests. Invalid, unknown, and
 * revoked keys are indistinguishable from the outside (same 401).
 */
export async function authenticateApiKey(
  rawToken: string | undefined | null,
): Promise<AuthenticatedApiKey | null> {
  if (!rawToken || typeof rawToken !== "string") return null;

  // Expected shape: flint.<envKey>.<secret> — split into exactly 3 parts.
  const parts = rawToken.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;

  const [, environmentKey, secret] = parts;
  if (!environmentKey || !secret) return null;

  const displayToken = buildToken(environmentKey, secret.slice(0, 8));

  const [row] = await db
    .select({
      apiKey: {
        id: apiKeys.id,
        keyHash: apiKeys.keyHash,
        revokedAt: apiKeys.revokedAt,
        lastUsedAt: apiKeys.lastUsedAt,
      },
      projectId: apiKeys.projectId,
      environmentId: environments.id,
      environmentKey: environments.key,
    })
    .from(apiKeys)
    .innerJoin(environments, eq(environments.id, apiKeys.environmentId))
    .where(eq(apiKeys.displayToken, displayToken))
    .limit(1);

  if (!row) return null;

  const presentedHash = sha256(rawToken);
  const storedHash = Buffer.from(row.apiKey.keyHash, "hex");
  if (presentedHash.length !== storedHash.length || !timingSafeEqual(presentedHash, storedHash)) {
    return null;
  }

  if (row.apiKey.revokedAt) return null;

  // Throttled usage tracking: skip writes when fresh enough.
  const lastUsed = row.apiKey.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - lastUsed > LAST_USED_WRITE_INTERVAL_MS) {
    void db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, row.apiKey.id))
      .catch(() => undefined);
  }

  return {
    apiKeyId: row.apiKey.id,
    projectId: row.projectId,
    environmentId: row.environmentId,
    environmentKey: row.environmentKey,
  };
}
