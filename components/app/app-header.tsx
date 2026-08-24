import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/app/user-menu";
import type { User } from "@/db/schema";

export function AppHeader({
  user,
  children,
}: {
  user: Pick<User, "name" | "email">;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-6">
          <Logo href="/projects" />
          {children ? <div className="flex min-w-0 items-center">{children}</div> : null}
        </div>
        <UserMenu name={user.name} email={user.email} />
      </div>
    </header>
  );
}
