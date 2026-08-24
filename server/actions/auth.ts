"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { loginSchema, registerSchema, type RegisterValues } from "@/lib/validation/auth";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/server/auth/cookies";
import { createSession, destroySession } from "@/server/auth/session";
import { authenticateUser, registerUser } from "@/server/services/auth-service";
import { rateLimiter } from "@/server/rate-limit";
import { getRequestMetadata } from "@/server/request-metadata";

/**
 * Server actions for the authentication flows.
 *
 * Security notes:
 *  - Validation happens here (the trust boundary), not only in the form.
 *  - Login attempts are rate limited per IP and per email.
 *  - Errors are generic to prevent account enumeration.
 */

export interface AuthFormState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "password", string[]>>;
  values?: Partial<RegisterValues>;
}

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

function rateLimitKey(scope: string, identity: string): string {
  return `${scope}:${identity.toLowerCase()}`;
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: zodFieldErrors(parsed.error),
      values: Object.fromEntries(formData) as Partial<RegisterValues>,
    };
  }

  const result = await registerUser(parsed.data);

  if (!result.ok) {
    return {
      error: "An account with this email already exists.",
      values: { email: parsed.data.email },
    };
  }

  await establishSession(result.userId);
  redirect("/projects");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: zodFieldErrors(parsed.error),
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  const metadata = await getRequestMetadata();
  const ipKey = rateLimitKey("login-ip", metadata.ipAddress ?? "unknown");
  const emailKey = rateLimitKey("login-email", parsed.data.email);

  const byIp = rateLimiter.hit(ipKey, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS);
  const byEmail = rateLimiter.hit(emailKey, LOGIN_ATTEMPT_LIMIT, LOGIN_ATTEMPT_WINDOW_MS);

  if (!byIp.success || !byEmail.success) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const result = await authenticateUser(parsed.data.email, parsed.data.password);

  if (!result.ok) {
    // Deliberately vague: unknown email vs wrong password is indistinguishable.
    return { error: "Invalid email or password." };
  }

  await establishSession(result.userId);
  redirect("/projects");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  await destroySession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  cookieStore.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(0), maxAge: 0 });
  redirect("/login");
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                            */
/* -------------------------------------------------------------------------- */

async function establishSession(userId: string): Promise<void> {
  const metadata = await getRequestMetadata();
  const { token, expiresAt } = await createSession(userId, metadata);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieOptions(Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}

function zodFieldErrors(error: z.ZodError): AuthFormState["fieldErrors"] {
  const result: NonNullable<AuthFormState["fieldErrors"]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "name" || field === "email" || field === "password") {
      result[field] ??= [];
      result[field].push(issue.message);
    }
  }
  return result;
}
