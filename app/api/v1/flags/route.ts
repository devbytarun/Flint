import { errorResponse, extractApiToken, jsonResponse, preflightResponse } from "@/server/api/http";
import { listEnvironmentFlags } from "@/server/api/evaluation";
import { authenticateApiKey } from "@/server/services/api-key-service";

/**
 * GET /api/v1/flags
 *
 * Returns flag metadata for the authenticated environment (bootstrap aid).
 */
export const runtime = "nodejs";

export function OPTIONS(): Response {
  return preflightResponse();
}

export async function GET(request: Request): Promise<Response> {
  const token = extractApiToken(request);
  const auth = await authenticateApiKey(token);

  if (!auth) {
    return errorResponse(401, "UNAUTHORIZED", "Provide a valid Flint API key.");
  }

  try {
    const flags = await listEnvironmentFlags(auth);
    return jsonResponse(
      { environment: auth.environmentKey, flags },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return errorResponse(500, "INTERNAL_ERROR", "Could not list flags. Try again shortly.");
  }
}
