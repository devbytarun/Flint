import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { getCurrentUser } from "@/server/auth/current-user";

/**
 * Authenticated application shell. This layout is the first authoritative
 * gate: unauthenticated visitors never reach child pages because the
 * session is resolved server-side here.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
