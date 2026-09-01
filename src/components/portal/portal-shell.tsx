"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Eye, LifeBuoy } from "lucide-react";
import { DEPARTMENTS } from "@/domain";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/app/brand-mark";
import { UserAvatar } from "@/components/shared/indicators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/primitives";
import { usePortalViewer } from "./portal-context";

/**
 * The portal's own frame.
 *
 * It shares no chrome with the Command Center — no sidebar, no command palette,
 * no department navigation — because none of that is the portal's to carry. A
 * person opening this from the Sales Portal should find one page about their
 * own requests and nothing that implies there is an application behind it.
 *
 * The preview bar is the one part that does not travel. It exists only so the
 * Tech Department can look at somebody else's view from inside its own tooling;
 * when the portal moves, that bar is deleted and `PortalViewerProvider` starts
 * reading the host application's session instead.
 */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const { viewer } = usePortalViewer();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <PreviewBar />

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <BrandMark className="h-8 w-auto shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm leading-5 font-semibold text-fg">
              Technology Help
            </p>
            <p className="truncate text-2xs text-fg-muted">
              Kind Home Solutions · {DEPARTMENTS[viewer.department].name}
            </p>
          </div>
          <span className="flex items-center gap-2">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-medium text-fg">{viewer.name}</span>
              <span className="block text-2xs text-fg-subtle">{viewer.title}</span>
            </span>
            <UserAvatar user={viewer} size="lg" />
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-line-soft px-4 py-4 sm:px-6">
        <p className="mx-auto flex max-w-4xl items-center gap-1.5 text-2xs text-fg-subtle">
          <LifeBuoy className="size-3" />
          Technology Department · Anything urgent and stopping work, say so in the
          request and it moves to the top.
        </p>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Preview bar — the part that does not travel                                */
/* -------------------------------------------------------------------------- */

function PreviewBar() {
  const { viewer, people, setViewer } = usePortalViewer();

  const withRequests = people.filter((p) => p.requestCount > 0);
  const withoutRequests = people.filter((p) => p.requestCount === 0);

  return (
    <div className="border-b border-navy-500 bg-navy-600 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6">
        <Badge
          tone="brand"
          className="shrink-0 border border-teal-300/40 bg-teal-500/20 text-teal-100"
        >
          <Eye className="size-2.5" />
          Preview
        </Badge>

        <p className="min-w-0 flex-1 text-2xs leading-4 text-navy-100">
          This is the Employee Portal as{" "}
          <span className="font-medium text-white">{viewer.name}</span> sees it. It is
          not live to the company yet.
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-navy-400/60 bg-navy-700/60 px-2 text-2xs font-medium text-white transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              View as {viewer.name.split(" ")[0]}
              <ChevronDown className="size-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-96 w-64 overflow-y-auto">
            <DropdownMenuLabel>Has raised requests</DropdownMenuLabel>
            {withRequests.map(({ user, requestCount }) => (
              <DropdownMenuItem key={user.id} onSelect={() => setViewer(user.id)}>
                <UserAvatar user={user} size="xs" />
                <span className="min-w-0 flex-1 truncate">{user.name}</span>
                <span className="tabular shrink-0 text-2xs text-fg-subtle">
                  {requestCount}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>No requests of their own</DropdownMenuLabel>
            {withoutRequests.map(({ user }) => (
              <DropdownMenuItem key={user.id} onSelect={() => setViewer(user.id)}>
                <UserAvatar user={user} size="xs" />
                <span className="min-w-0 flex-1 truncate">{user.name}</span>
                <span className="shrink-0 text-2xs text-fg-subtle">
                  {DEPARTMENTS[user.department].shortName}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          asChild
          size="xs"
          variant="ghost"
          className="shrink-0 text-navy-100 hover:bg-navy-700 hover:text-white"
        >
          <Link href="/">
            <ArrowLeft />
            Command Center
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Page heading inside the portal. Plainer than the Command Center's. */
export function PortalHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-lg leading-6 font-semibold text-fg">{title}</h1>
        {description && (
          <p className="mt-1 text-xs leading-5 text-fg-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
