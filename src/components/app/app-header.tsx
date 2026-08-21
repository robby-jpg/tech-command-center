"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Bell, Plus, Search } from "lucide-react";
import { ATTENTION_META, needsAttention } from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/indicators";
import {
  Hint,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/primitives";
import { resolvePageMeta } from "./nav-config";

export function AppHeader({
  onOpenSearch,
  onQuickCreate,
}: {
  onOpenSearch: () => void;
  onQuickCreate: () => void;
}) {
  const pathname = usePathname();
  const snapshot = useSnapshot();
  const meta = resolvePageMeta(pathname);

  const attention = React.useMemo(() => needsAttention(snapshot), [snapshot]);
  const pressing = attention.filter(
    (a) => a.severity === "critical" || a.severity === "overdue",
  );

  const currentUser =
    snapshot.users.find((u) => u.id === snapshot.currentUserId) ?? null;

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-line bg-canvas/85 px-6 backdrop-blur-sm">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl leading-tight font-semibold text-fg">
          {meta.label}
        </h1>
        <p className="truncate text-xs text-fg-muted">{meta.description}</p>
      </div>

      {/* Search opens the palette rather than being a second search surface. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className={cn(
          "group hidden h-8 w-64 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-left transition-colors lg:flex",
          "hover:border-line-strong hover:bg-subtle",
        )}
      >
        <Search className="size-3.5 shrink-0 text-fg-subtle" />
        <span className="flex-1 truncate text-xs text-fg-subtle">Search everything</span>
        <kbd className="rounded border border-line bg-subtle px-1 py-px text-[10px] font-medium text-fg-subtle">
          ⌘K
        </kbd>
      </button>

      <Hint label="Search" side="bottom">
        <Button variant="ghost" size="iconSm" onClick={onOpenSearch} className="lg:hidden">
          <Search />
          <span className="sr-only">Search</span>
        </Button>
      </Hint>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="iconSm" className="relative">
            <Bell />
            {pressing.length > 0 && (
              <span className="absolute top-1 right-1 flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-critical opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-critical" />
              </span>
            )}
            <span className="sr-only">
              {pressing.length > 0
                ? `${pressing.length} items need attention`
                : "Nothing needs attention"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-line-soft px-3 py-2.5">
            <p className="text-xs font-semibold text-fg">Needs attention</p>
            <span className="text-2xs text-fg-subtle">{formatDateLong(snapshot.now)}</span>
          </div>

          {attention.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-fg-muted">
              Nothing needs attention. Everything is under control.
            </p>
          ) : (
            <ul className="scrollbar-slim max-h-80 divide-y divide-line-soft overflow-y-auto">
              {attention.slice(0, 8).map((item) => (
                <li key={`${item.severity}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-subtle"
                  >
                    <Dot tone={ATTENTION_META[item.severity].tone} className="mt-1.5 size-1.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-fg">
                        {item.title}
                      </span>
                      <span className="block truncate text-2xs text-fg-muted">
                        {item.context}
                      </span>
                      <span className="mt-0.5 block text-2xs text-fg-subtle">
                        {item.timing}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line-soft px-3 py-2">
            <Link
              href="/"
              className="text-2xs font-medium text-teal-700 hover:underline"
            >
              Open the Command Center
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="primary" size="sm" onClick={onQuickCreate}>
        <Plus />
        New
      </Button>

      <Link
        href="/settings"
        className="rounded-full transition-opacity hover:opacity-80"
        aria-label={`Signed in as ${currentUser?.name ?? "current user"}`}
      >
        <UserAvatar user={currentUser} size="md" />
      </Link>
    </header>
  );
}
