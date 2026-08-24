import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/projects");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <Logo />
      <div className="mt-8 w-full max-w-sm">{children}</div>
    </div>
  );
}
