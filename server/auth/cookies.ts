/**
 * Session cookie contract. Kept in one module so the client boundary,
 * proxy, and server actions all agree on the name and lifetime.
 */
export const SESSION_COOKIE_NAME = "flint_session";

/** Sessions expire after 30 days of inactivity. */
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  } as const;
}
