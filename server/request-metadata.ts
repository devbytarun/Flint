import { headers } from "next/headers";

/**
 * Best-effort client metadata for sessions and audit logs.
 * Behind proxies/Vercel the real IP arrives via x-forwarded-for.
 */
export async function getRequestMetadata(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ipAddress = forwarded ? (forwarded.split(",")[0]?.trim() ?? null) : null;
  return { ipAddress, userAgent: headerList.get("user-agent") };
}
