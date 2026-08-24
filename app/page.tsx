import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-10 px-6 text-center">
      <Logo className="scale-125" />
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Feature flags &amp; controlled rollouts
        </h1>
        <p className="text-text-secondary">
          Ship new features gradually, target the right users, and flip the switch instantly —
          without redeploying.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <Link href="/projects">
            <Button>Open dashboard</Button>
          </Link>
        ) : (
          <>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
