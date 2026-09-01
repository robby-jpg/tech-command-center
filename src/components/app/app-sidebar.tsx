"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { ArrowUpRight, ChevronsUpDown, LogOut, RotateCcw, UserCog } from "lucide-react";
import { DEPARTMENTS, PROJECT_STATUS_META } from "@/domain";
import { useWorkspace } from "@/lib/store/workspace-store";
import { needsAttention, openTickets } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/indicators";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/primitives";
import { BrandMark } from "./brand-mark";
import { signOutAction } from "@/lib/auth/actions";
import { NAV_GROUPS } from "./nav-config";

export function AppSidebar() {
  const pathname = usePathname();
  const { snapshot, dirty, reset } = useWorkspace();

  const counts = React.useMemo(
    () => ({
      openTickets: openTickets(snapshot).length,
      attention: needsAttention(snapshot).filter(
        (i) => i.severity === "critical" || i.severity === "overdue",
      ).length,
      activeProjects: snapshot.projects.filter((p) => PROJECT_STATUS_META[p.status].active)
        .length,
    }),
    [snapshot],
  );

  const currentUser = snapshot.users.find((u) => u.id === snapshot.currentUserId) ?? null;

  return (
    <aside className="flex h-dvh w-56 shrink-0 flex-col border-r border-line bg-surface">
      {/* Identity */}
      <div className="flex items-center gap-2.5 px-3.5 py-3.5">
        <BrandMark className="h-7 w-auto shrink-0" />
        <div className="min-w-0">
          <p className="font-display truncate text-sm leading-tight font-semibold text-fg">
            Tech Command Center
          </p>
          <p className="truncate text-[10px] leading-tight tracking-wide text-fg-subtle uppercase">
            Kind Home Solutions
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-slim flex-1 overflow-y-auto px-2 pb-3" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="px-2 pb-1 text-[10px] font-semibold tracking-[0.07em] text-fg-subtle uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                // "/" must match exactly or it lights up on every page.
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const count = item.badge ? counts[item.badge] : 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-teal-50 font-medium text-fg"
                          : "text-fg-muted hover:bg-subtle hover:text-fg",
                      )}
                    >
                      {active && (
                        <span
                          className="absolute top-1.5 bottom-1.5 -left-2 w-0.5 rounded-r-full bg-teal-500"
                          aria-hidden
                        />
                      )}
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          active
                            ? "text-teal-600"
                            : "text-fg-subtle group-hover:text-fg-muted",
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.external && (
                        <ArrowUpRight
                          className="size-3 shrink-0 text-fg-subtle"
                          aria-label="Opens outside the Command Center"
                        />
                      )}
                      {count > 0 && (
                        <span
                          className={cn(
                            "tabular rounded-full px-1.5 py-px text-[10px] font-semibold",
                            item.badge === "attention"
                              ? "bg-critical-bg text-critical"
                              : "bg-subtle text-fg-muted",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Session notice — only when the local session has diverged from the seed */}
      {dirty && (
        <div className="mx-2 mb-2 rounded-md border border-line bg-subtle px-2.5 py-2">
          <p className="text-[10px] leading-4 text-fg-muted">
            You have unsaved local changes to the sample data.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[10px] font-medium text-teal-700 hover:underline"
          >
            <RotateCcw className="size-3" />
            Reset to seed data
          </button>
        </div>
      )}

      {/* Current user */}
      <div className="border-t border-line-soft p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-subtle">
            <UserAvatar user={currentUser} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-fg">
                {currentUser?.name}
              </span>
              <span className="block truncate text-[10px] text-fg-subtle">
                {currentUser?.title}
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-fg-subtle" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-52">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <p className="text-xs font-medium text-fg">{currentUser?.name}</p>
              <p className="text-2xs text-fg-muted">{currentUser?.email}</p>
              <p className="mt-0.5 text-2xs text-fg-subtle">
                {currentUser && DEPARTMENTS[currentUser.department].name}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <UserCog />
                Settings
              </Link>
            </DropdownMenuItem>
            <form action={signOutAction}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full cursor-pointer">
                  <LogOut />
                  Sign out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
