"use client";

import { LayoutGrid, ScrollText, Settings2, Flag, KeyRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Project workspace navigation. Renders as a left sidebar ≥1024px and as
 * horizontal tabs below that — same component so order/labels never drift
 * (DESIGN.md §14).
 */

export function projectNavItems(slug: string) {
  return [
    { href: `/project/${slug}`, label: "Overview", icon: LayoutGrid },
    { href: `/project/${slug}/flags`, label: "Flags", icon: Flag },
    { href: `/project/${slug}/keys`, label: "API keys", icon: KeyRound },
    { href: `/project/${slug}/audit`, label: "Audit log", icon: ScrollText },
    { href: `/project/${slug}/settings`, label: "Settings", icon: Settings2 },
  ];
}

export function ProjectNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const items = projectNavItems(slug);

  function isActive(href: string): boolean {
    return pathname === href;
  }

  return (
    <>
      {/* Sidebar ≥1024px */}
      <nav
        aria-label="Project"
        className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-52 shrink-0 border-r border-border-subtle py-6 pr-3 lg:block"
      >
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-surface-raised text-text-primary"
                    : "text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary",
                )}
              >
                {isActive(item.href) ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                  />
                ) : null}
                <item.icon aria-hidden="true" className="size-4 opacity-80" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Tabs <1024px */}
      <nav
        aria-label="Project"
        className="flex items-center gap-1 overflow-x-auto border-b border-border-subtle pb-2 lg:hidden"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              isActive(item.href)
                ? "bg-surface-raised text-text-primary"
                : "text-text-secondary hover:bg-surface-raised/60 hover:text-text-primary",
            )}
          >
            <item.icon aria-hidden="true" className="size-3.5 opacity-80" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
