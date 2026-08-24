import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "./cookies";
import { validateSession } from "./session";

/**
 * Resolve the authenticated user for the current request.
 * Returns null when unauthenticated or when the session expired.
 * Every server component/action/handler that needs identity must call
 * this — there is no ambient global login state.
 */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  const cookieStore = await cookies();
  const result = await validateSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  return result?.user ?? null;
}
