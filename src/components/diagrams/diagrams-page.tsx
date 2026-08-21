"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Copy, MoreHorizontal, Plus, Trash2, Workflow } from "lucide-react";
import {
  DIAGRAM_TYPE_META,
  DIAGRAM_TYPE_ORDER,
  DIAGRAM_NODE_KIND_META,
  type Diagram,
} from "@/domain";
import { userById } from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/primitives";
import { FacetFilter, FilterBar, SearchInput } from "@/components/shared/filter-bar";
import { PageBody } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import { UserChip } from "@/components/shared/indicators";
import { useChrome } from "@/components/app/app-chrome";

export function DiagramsPage() {
  const snapshot = useSnapshot();
  const { openQuickCreate } = useChrome();
  const [search, setSearch] = React.useState("");
  const [types, setTypes] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.diagrams.filter((d) => {
      if (types.length && !types.includes(d.type)) return false;
      if (
        q &&
        !`${d.name} ${d.description} ${d.nodes.map((n) => n.label).join(" ")}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [snapshot.diagrams, search, types]);

  const grouped = DIAGRAM_TYPE_ORDER.map((type) => ({
    type,
    diagrams: filtered.filter((d) => d.type === type),
  })).filter((g) => g.diagrams.length > 0);

  return (
    <PageBody>
      <FilterBar
        activeCount={(search ? 1 : 0) + (types.length ? 1 : 0)}
        onClear={() => {
          setSearch("");
          setTypes([]);
        }}
        className="rounded-lg border border-line bg-surface px-3 py-2.5 shadow-xs"
        right={
          <Button variant="primary" size="sm" onClick={() => openQuickCreate("diagram")}>
            <Plus />
            New diagram
          </Button>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search diagrams…"
          className="w-64"
        />
        <FacetFilter
          label="Type"
          selected={types}
          onChange={setTypes}
          options={DIAGRAM_TYPE_ORDER.map((t) => ({
            value: t,
            label: DIAGRAM_TYPE_META[t].label,
            count: snapshot.diagrams.filter((d) => d.type === t).length,
          }))}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Workflow}
            title={
              search || types.length
                ? `Nothing matched${search ? ` “${search}”` : ""}.`
                : "No diagrams yet."
            }
            description="Architecture, workflow, troubleshooting and data-flow diagrams live here."
            action={
              <Button variant="primary" size="sm" onClick={() => openQuickCreate("diagram")}>
                <Plus />
                New diagram
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.type} className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-fg">
                  {DIAGRAM_TYPE_META[group.type].label}
                </h2>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {DIAGRAM_TYPE_META[group.type].description}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.diagrams.map((diagram) => (
                  <DiagramCard key={diagram.id} diagram={diagram} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageBody>
  );
}

function DiagramCard({ diagram }: { diagram: Diagram }) {
  const snapshot = useSnapshot();
  const actions = useActions();
  const router = useRouter();
  const author = userById(snapshot, diagram.createdById);

  return (
    <div className="card-interactive group relative rounded-lg border border-line bg-surface shadow-xs">
      <Link href={`/diagrams/${diagram.id}`} className="block p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate pr-6 text-sm font-semibold text-fg">{diagram.name}</h3>
          <Badge tone={DIAGRAM_TYPE_META[diagram.type].tone}>
            {DIAGRAM_TYPE_META[diagram.type].label}
          </Badge>
        </div>

        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-fg-muted">
          {diagram.description}
        </p>

        {/* A glance at what is inside, without rendering a canvas per card. */}
        <div className="mt-3 flex flex-wrap gap-1">
          {diagram.nodes.slice(0, 5).map((node) => (
            <span
              key={node.id}
              className={cn(
                "truncate rounded-sm border px-1.5 py-0.5 text-[10px]",
                node.kind === "decision"
                  ? "border-warning-border bg-warning-bg text-warning"
                  : node.kind === "system"
                    ? "border-teal-200 bg-teal-50 text-teal-700"
                    : "border-line bg-subtle text-fg-muted",
              )}
              title={DIAGRAM_NODE_KIND_META[node.kind].label}
            >
              {node.label}
            </span>
          ))}
          {diagram.nodes.length > 5 && (
            <span className="rounded-sm px-1.5 py-0.5 text-[10px] text-fg-subtle">
              +{diagram.nodes.length - 5} more
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
          <UserChip user={author} muted />
          <span className="text-[10px] text-fg-subtle">
            {diagram.nodes.length} nodes · {formatRelative(diagram.updatedAt, snapshot.now)}
          </span>
        </div>
      </Link>

      <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconXs" aria-label={`Actions for ${diagram.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                const id = actions.duplicateDiagram(diagram.id);
                router.push(`/diagrams/${id}`);
              }}
            >
              <Copy />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => actions.deleteDiagram(diagram.id)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
