"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  BookOpen,
  CornerDownLeft,
  FolderKanban,
  Plus,
  Search,
  Server,
  Ticket,
  Workflow,
} from "lucide-react";
import type { SearchResult, SearchResultType } from "@/lib/data/types";
import { searchSnapshot } from "@/lib/search";
import { useSnapshot } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/primitives";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ALL_NAV_ITEMS } from "./nav-config";

const RESULT_META: Record<
  SearchResultType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ticket: { label: "Tickets", icon: Ticket },
  project: { label: "Projects", icon: FolderKanban },
  system: { label: "Systems", icon: Server },
  article: { label: "Documentation", icon: BookOpen },
  diagram: { label: "Diagrams", icon: Workflow },
};

const GROUP_ORDER: SearchResultType[] = [
  "ticket",
  "project",
  "system",
  "article",
  "diagram",
];

export function CommandPalette({
  open,
  onOpenChange,
  onQuickCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuickCreate: () => void;
}) {
  const router = useRouter();
  const snapshot = useSnapshot();
  const [query, setQuery] = React.useState("");

  // Search runs against the in-memory snapshot, so results appear as fast as
  // the user types. There is no request to wait on and no spinner to show.
  const results = React.useMemo(
    () => (query.trim() ? searchSnapshot(snapshot, query, 30) : []),
    [snapshot, query],
  );

  const grouped = React.useMemo(() => {
    const map = new Map<SearchResultType, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.type) ?? [];
      list.push(r);
      map.set(r.type, list);
    }
    return GROUP_ORDER.filter((t) => map.has(t)).map((t) => ({
      type: t,
      items: map.get(t)!,
    }));
  }, [results]);

  React.useEffect(() => {
    if (!open) {
      // Reset after the close animation so the list does not flash empty.
      const timer = window.setTimeout(() => setQuery(""), 150);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  const trimmed = query.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed top-[15vh] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-pop data-[state=open]:animate-pop-in"
          aria-describedby={undefined}
        >
          <VisuallyHidden>
            <DialogPrimitive.Title>Search everything</DialogPrimitive.Title>
          </VisuallyHidden>

          <Command shouldFilter={false} loop className="flex flex-col">
            <div className="flex items-center gap-2.5 border-b border-line-soft px-3.5">
              <Search className="size-4 shrink-0 text-fg-subtle" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Search tickets, projects, systems, documentation…"
                className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
              />
              <kbd className="rounded border border-line bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">
                ESC
              </kbd>
            </div>

            <Command.List className="scrollbar-slim max-h-[52vh] overflow-y-auto overscroll-contain p-2">
              {trimmed === "" ? (
                <>
                  <Command.Group
                    heading="Quick actions"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-fg-subtle [&_[cmdk-group-heading]]:uppercase"
                  >
                    <PaletteItem
                      icon={Plus}
                      label="Create something new"
                      hint="Ticket, project, task, diagram, article"
                      onSelect={() => {
                        onOpenChange(false);
                        onQuickCreate();
                      }}
                    />
                  </Command.Group>

                  <Command.Group
                    heading="Go to"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-fg-subtle [&_[cmdk-group-heading]]:uppercase"
                  >
                    {ALL_NAV_ITEMS.map((item) => (
                      <PaletteItem
                        key={item.href}
                        icon={item.icon}
                        label={item.label}
                        hint={item.description}
                        onSelect={() => go(item.href)}
                      />
                    ))}
                  </Command.Group>
                </>
              ) : results.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <p className="text-sm text-fg">Nothing matched “{trimmed}”.</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Try a ticket number, a system name, or a word from the title.
                  </p>
                </div>
              ) : (
                grouped.map(({ type, items }) => {
                  const meta = RESULT_META[type];
                  return (
                    <Command.Group
                      key={type}
                      heading={meta.label}
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-fg-subtle [&_[cmdk-group-heading]]:uppercase"
                    >
                      {items.map((result) => (
                        <PaletteItem
                          key={result.id}
                          value={`${result.type}-${result.id}`}
                          icon={meta.icon}
                          label={result.title}
                          hint={result.subtitle}
                          badge={result.badge}
                          onSelect={() => go(result.href)}
                        />
                      ))}
                    </Command.Group>
                  );
                })
              )}
            </Command.List>

            <div className="flex items-center justify-between border-t border-line-soft bg-subtle/60 px-3.5 py-2">
              <div className="flex items-center gap-3 text-[10px] text-fg-subtle">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface px-1 py-px">↑</kbd>
                  <kbd className="rounded border border-line bg-surface px-1 py-px">↓</kbd>
                  navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded border border-line bg-surface px-1 py-px">
                    <CornerDownLeft className="size-2.5" />
                  </kbd>
                  open
                </span>
              </div>
              {results.length > 0 && (
                <span className="text-[10px] text-fg-subtle">
                  {results.length} {results.length === 1 ? "result" : "results"}
                </span>
              )}
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  hint,
  badge,
  value,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  badge?: string;
  value?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value ?? label}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm",
        "data-[selected=true]:bg-subtle",
      )}
    >
      <Icon className="size-4 shrink-0 text-fg-subtle" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-fg">{label}</span>
        {hint && <span className="block truncate text-[11px] text-fg-subtle">{hint}</span>}
      </span>
      {badge && (
        <span className="shrink-0 rounded-sm bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
          {badge}
        </span>
      )}
    </Command.Item>
  );
}
