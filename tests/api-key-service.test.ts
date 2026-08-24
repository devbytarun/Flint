/**
 * Integration tests for API key lifecycle and authentication.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { db, sql } from "@/db";
import { auditLogs, environments, users } from "@/db/schema";
import { createProject } from "@/server/services/project-service";
import {
  authenticateApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@/server/services/api-key-service";

const suffix = randomBytes(3).toString("hex");
const ownerEmail = `it-keys-${suffix}@example.com`;
const passwordHash = "integration-test-no-login";

let userId: string;
let projectId: string;
let environmentId: string;
let environmentKey = "";

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: ownerEmail, name: "Keys Integration", passwordHash })
    .returning({ id: users.id });
  userId = user.id;

  const project = await createProject({
    ownerId: userId,
    ownerEmail,
    name: `Keys Test ${suffix}`,
  });
  projectId = project.id;

  const [env] = await db.select().from(environments).where(eq(environments.projectId, projectId));
  environmentId = env.id;
  environmentKey = env.key;
});

afterAll(async () => {
  await sql`delete from projects where id = ${projectId}`;
  await db.delete(users).where(eq(users.id, userId));
  await sql.end();
});

describe("api key lifecycle", () => {
  it("creates an environment-scoped key whose raw token authenticates", async () => {
    const { apiKey, token } = await createApiKey({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      environmentId,
      name: `backend-${suffix}`,
    });

    // Token format embeds the environment key with dot delimiters.
    expect(token).toMatch(new RegExp(`^flint\\.${environmentKey}\\.[A-Za-z0-9_-]+$`));
    // Stored hash never equals the raw token.
    expect(apiKey.keyHash).not.toContain(token);

    const auth = await authenticateApiKey(token);
    expect(auth).not.toBeNull();
    expect(auth?.environmentKey).toBe(environmentKey);
    expect(auth?.projectId).toBe(projectId);
  });

  it("rejects garbage, tampered, and unknown tokens uniformly", async () => {
    expect(await authenticateApiKey(null)).toBeNull();
    expect(await authenticateApiKey("")).toBeNull();
    expect(await authenticateApiKey("garbage")).toBeNull();

    const { token } = await createApiKey({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      environmentId,
      name: `tamper-${suffix}`,
    });

    // Flip one character of the secret part.
    const lastChar = token.slice(-1);
    const replacement = lastChar === "A" ? "B" : "A";
    expect(await authenticateApiKey(`${token.slice(0, -1)}${replacement}`)).toBeNull();
  });

  it("revocation is idempotent and immediately invalidates the key", async () => {
    const { apiKey, token } = await createApiKey({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      environmentId,
      name: `revoke-${suffix}`,
    });

    expect(await authenticateApiKey(token)).not.toBeNull();

    await revokeApiKey({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      apiKeyId: apiKey.id,
    });
    // Second call must be a no-op, not an error.
    await revokeApiKey({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      apiKeyId: apiKey.id,
    });

    expect(await authenticateApiKey(token)).toBeNull();

    const [event] = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.resourceId, apiKey.id), eq(auditLogs.action, "api_key.revoked")));
    expect(event).toBeDefined();
  });

  it("lists keys without exposing hashes", async () => {
    const keys = await listApiKeys(projectId);
    expect(keys.length).toBeGreaterThanOrEqual(3);
    for (const entry of keys) {
      expect(entry.apiKey.displayToken).toBeDefined();
      expect(JSON.stringify(entry)).not.toContain("keyHash");
    }
  });
});
