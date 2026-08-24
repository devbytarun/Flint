/**
 * Flint TypeScript client.
 *
 * Zero-dependency fetch wrapper around the public evaluation API
 * (/api/v1). Works in Node 18+, edge runtimes, and browsers — though
 * browser use exposes your API key to visitors, so prefer server-side
 * evaluation.
 *
 * Copy this file into your project or import it from a path alias;
 * it has no build-time dependencies.
 */

export interface EvaluationResult {
  enabled: boolean;
  reason: string;
}

export type Evaluations = Record<string, EvaluationResult>;

export interface EvaluationContext {
  targetingKey?: string;
  attributes?: Record<string, string>;
}

export interface FlintClientOptions {
  /** Base URL, e.g. https://flint.example.com */
  baseUrl: string;
  /** Environment-scoped API token: flint_<env>_<secret> */
  apiKey: string;
  /** Request timeout in milliseconds. Default 5000. */
  timeoutMs?: number;
  /**
   * Behavior when the request fails (network, 5xx, timeout):
   *  - "throw" (default): surface the error to the caller.
   *  - "disabled": resolve with all-disabled results so the consuming app
   *    keeps working when Flint is unreachable.
   */
  onError?: "throw" | "disabled";
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export class FlintApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "FlintApiError";
  }
}

const DEFAULT_TIMEOUT_MS = 5000;

export class FlintClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly onError: "throw" | "disabled";

  constructor(options: FlintClientOptions) {
    if (!options.apiKey) throw new Error("Flint: apiKey is required");
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onError = options.onError ?? "throw";
  }

  /**
   * Evaluate specific flags for a context.
   * Keys that do not exist resolve to { enabled: false, reason: FLAG_NOT_FOUND }.
   */
  async evaluate(flagKeys: string[], context: EvaluationContext = {}): Promise<Evaluations> {
    try {
      const body = await this.request<{ evaluations: Evaluations }>("/api/v1/evaluate", {
        context,
        flagKeys,
      });
      return fillMissing(body.evaluations, flagKeys);
    } catch (error) {
      return this.handleFailure(error, flagKeys);
    }
  }

  /** Evaluate every flag in the environment (bootstrap mode). */
  async evaluateAll(context: EvaluationContext = {}): Promise<Evaluations> {
    try {
      const body = await this.request<{ evaluations: Evaluations }>("/api/v1/evaluate", {
        context,
      });
      return body.evaluations;
    } catch (error) {
      return this.handleFailure(error, []);
    }
  }

  /** List flag metadata for the authenticated environment. */
  async listFlags(): Promise<Array<{ key: string; name: string; description: string | null }>> {
    const body = await this.request<{
      environment: string;
      flags: Array<{ key: string; name: string; description: string | null }>;
    }>("/api/v1/flags", undefined, "GET");
    return body.flags;
  }

  /* ------------------------------------------------------------------------ */

  private async request<T>(
    path: string,
    body?: unknown,
    method: "GET" | "POST" = "POST",
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let code = "UNKNOWN";
        let message = `HTTP ${response.status}`;
        try {
          const parsed = (await response.json()) as ApiErrorBody;
          code = parsed.error?.code ?? code;
          message = parsed.error?.message ?? message;
        } catch {
          // keep defaults
        }
        throw new FlintApiError(response.status, code, message);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private handleFailure(error: unknown, flagKeys: string[]): Evaluations {
    if (this.onError === "throw") {
      throw error;
    }
    const fallback: Evaluations = {};
    for (const key of flagKeys) {
      fallback[key] = { enabled: false, reason: "CLIENT_ERROR" };
    }
    return fallback;
  }
}

function fillMissing(evaluations: Evaluations, keys: string[]): Evaluations {
  const result = { ...evaluations };
  for (const key of keys) {
    result[key] ??= { enabled: false, reason: "FLAG_NOT_FOUND" };
  }
  return result;
}
