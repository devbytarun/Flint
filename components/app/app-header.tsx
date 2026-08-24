import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth";
import type { User } from "@/db/schema";

export function AppHeader({ user }: { user: Pick<User, "name" | "email"> }) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Logo href="/projects" />
          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            {/* Project-level navigation lands here. */}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-7.5 items-center justify-center rounded-full border border-border bg-surface-raised text-[11px] font-medium text-text-secondary"
            title={user.email}
          >
            {initials || "U"}
          </span>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
