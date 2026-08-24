import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthVisual } from "@/components/auth/auth-visual";
import { Logo } from "@/components/brand/logo";
import { getCurrentUser } from "@/server/auth/current-user";

/**
 * Split authentication shell (DESIGN.md §4): product story left, form
 * right. The visual panel disappears below 1024px; the form stays centered.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/projects");

  return (
    <div className="flex min-h-svh">
      {/* Left: product identity */}
      <aside className="relative hidden w-1/2 flex-col justify-between border-r border-border-subtle bg-surface px-12 py-10 lg:flex xl:px-16">
        <Logo />
        <div
          className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-accent/[0.04] to-transparent"
          aria-hidden="true"
        />
        <div className="relative mt-14 flex flex-1 items-center">
          <div className="w-full max-w-md">
            <AuthVisual />
          </div>
        </div>
        <p className="text-xs text-text-muted">Control releases. Roll out safely.</p>
      </aside>

      {/* Right: form */}
      <main className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 sm:px-10 lg:pt-0">
          <div className="w-full max-w-sm animate-[flint-fade-in_240ms_ease-out]">{children}</div>
        </div>
      </main>
    </div>
  );
}
