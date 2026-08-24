/**
 * Shared plumbing for the public API (/api/v1/*).
 *
 * Error envelope: every non-200 response is
 *   { "error": { "code": string, "message": string } }
 * so clients can branch on a stable machine code.
 */

export type ApiErrorCode = "UNAUTHORIZED" | "VALIDATION_ERROR" | "RATE_LIMITED" | "INTERNAL_ERROR";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Flint-Key",
  "Access-Control-Max-Age": "86400",
} as const;

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse({ error: { code, message } }, { status, headers: extraHeaders });
}

export function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Extract the API token from either accepted header styles. */
export function extractApiToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  const customHeader = request.headers.get("x-flint-key");
  if (customHeader) return customHeader.trim();
  return null;
}
