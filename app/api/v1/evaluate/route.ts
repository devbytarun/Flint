import { z } from "zod";

import { errorResponse, extractApiToken, jsonResponse, preflightResponse } from "@/server/api/http";
import { evaluateForEnvironment } from "@/server/api/evaluation";
import { authenticateApiKey } from "@/server/services/api-key-service";
import { rateLimiter } from "@/server/rate-limit";

/**
 * POST /api/v1/evaluate
 *
 * Auth:    Authorization: Bearer <token>   (or X-Flint-Key header)
 * Body:    { context: { targetingKey?, attributes? }, flagKeys?: string[] }
 *          Omitting flagKeys evaluates every flag in the environment.
 *
 * Rate limit: 120 requests/minute per key, sliding window.
 */
export const runtime = "nodejs";

const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

const bodySchema = z
  .object({
    context: z
      .object({
        targetingKey: z.string().min(1).max(200).optional(),
        attributes: z.record(z.string(), z.string().max(500)).optional(),
      })
      .default({}),
    flagKeys: z.array(z.string().min(1).max(80)).max(200).nullish(),
  })
  .refine((body) => !body.context.attributes || Object.keys(body.context.attributes).length <= 64, {
    message: "At most 64 attributes are allowed",
  });

export async function OPTIONS(): Promise<Response> {
  return preflightResponse();
}

export async function POST(request: Request): Promise<Response> {
  const token = extractApiToken(request);
  const auth = await authenticateApiKey(token);

  if (!auth) {
    return errorResponse(401, "UNAUTHORIZED", "Provide a valid Flint API key.");
  }

  const limit = rateLimiter.hit(`api:${auth.apiKeyId}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.success) {
    return errorResponse(429, "RATE_LIMITED", "Too many requests. Slow down.", {
      "Retry-After": String(limit.retryAfterSeconds),
      "X-RateLimit-Limit": String(RATE_LIMIT),
      "X-RateLimit-Remaining": "0",
    });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return errorResponse(400, "VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const parsed = bodySchema.safeParse(parsedBody);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      `Invalid request${firstIssue ? `: ${firstIssue.message}` : "."}`,
    );
  }

  try {
    const { evaluations } = await evaluateForEnvironment(
      auth,
      {
        targetingKey: parsed.data.context.targetingKey,
        attributes: parsed.data.context.attributes,
      },
      parsed.data.flagKeys ?? null,
    );

    return jsonResponse(
      { evaluations },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      },
    );
  } catch {
    // Fail closed but never leak internals.
    return errorResponse(500, "INTERNAL_ERROR", "Evaluation failed. Try again shortly.");
  }
}
