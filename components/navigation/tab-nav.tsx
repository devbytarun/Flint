"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface TabNavItem {
  href: string;
  label: string;
}

export function TabNav({ items }: { items: TabNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Project sections" className="flex items-center gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-surface-raised text-text-primary"
                : "text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
