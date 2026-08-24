import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 1.5 15 9l7.5 3L15 15l-3 7.5L9 15 1.5 12 9 9l3-7.5Z" className="fill-accent" />
      </svg>
      <span className="text-[17px] font-semibold tracking-tight text-text-primary">Flint</span>
    </Link>
  );
}
