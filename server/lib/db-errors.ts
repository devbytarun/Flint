/**
 * Walk the error chain looking for a PostgreSQL error code.
 *
 * ORMs and drivers wrap low-level errors (Drizzle wraps postgres.js which
 * wraps DatabaseError), so the meaningful `code` can sit several `cause`
 * levels deep.
 */
export function hasPostgresCode(error: unknown, code: string): boolean {
  let current: unknown = error;
  while (current instanceof Error || typeof current === "object") {
    if (current !== null && (current as { code?: unknown }).code === code) {
      return true;
    }
    current = (current as { cause?: unknown } | null)?.cause;
    if (current === undefined || current === null) return false;
  }
  return false;
}
