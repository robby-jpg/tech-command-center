"use client";

import Link from "next/link";
import * as React from "react";
import * as Icons from "lucide-react";
import { Network, Plus, Server } from "lucide-react";
import {
  SYSTEM_CRITICALITY_META,
  SYSTEM_CRITICALITY_ORDER,
  SYSTEM_HEALTH_META,
  SYSTEM_HEALTH_ORDER,
  SYSTEM_KIND_META,
  SYSTEM_KIND_ORDER,
} from "@/domain";
import { systemCards } from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FacetFilter, FilterBar, SearchInput } from "@/components/shared/filter-bar";
import { PageBody } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import {
  CriticalityBadge,
  HealthIndicator,
  UserChip,
} from "@/components/shared/indicators";
import { useChrome } from "@/components/app/app-chrome";

/** Resolves the icon named on a system kind. Falls back rather than throwing. */
function KindIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    name
  ];
  const Fallback = Server;
  const Resolved = Icon ?? Fallback;
  return <Resolved className={className} />;
}

export function SystemsPage() {
  const snapshot = useSnapshot();
  const { openQuickCreate } = useChrome();

  const [search, setSearch] = React.useState("");
  const [health, setHealth] = React.useState<string[]>([]);
  const [criticality, setCriticality] = React.useState<string[]>([]);
  const [kind, setKind] = React.useState<string[]>([]);

  const cards = React.useMemo(() => systemCards(snapshot), [snapshot]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards
      .filter(({ system }) => {
        if (health.length && !health.includes(system.health)) return false;
        if (criticality.length && !criticality.includes(system.criticality)) return false;
        if (kind.length && !kind.includes(system.kind)) return false;
        if (
          q &&
          !`${system.name} ${system.description} ${system.tags.join(" ")} ${system.vendor ?? ""}`
            .toLowerCase()
            .includes(q)
        )
          return false;
        return true;
      })
      // Anything unhealthy first, then by how much it matters.
      .sort(
        (a, b) =>
          SYSTEM_HEALTH_META[a.system.health].rank - SYSTEM_HEALTH_META[b.system.health].rank ||
          SYSTEM_CRITICALITY_ORDER.indexOf(a.system.criticality) -
            SYSTEM_CRITICALITY_ORDER.indexOf(b.system.criticality) ||
          a.system.name.localeCompare(b.system.name),
      );
  }, [cards, search, health, criticality, kind]);

  const activeCount =
    (search ? 1 : 0) + (health.length ? 1 : 0) + (criticality.length ? 1 : 0) + (kind.length ? 1 : 0);

  const summary = React.useMemo(() => {
    const all = snapshot.systems;
    return {
      total: all.length,
      operational: all.filter((s) => s.health === "operational").length,
      degraded: all.filter((s) => s.health === "degraded").length,
      down: all.filter((s) => s.health === "outage" || s.health === "partial_outage").length,
      critical: all.filter((s) => s.criticality === "critical").length,
      integrations: snapshot.connections.length,
    };
  }, [snapshot]);

  return (
    <PageBody>
      <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:grid-cols-6">
        {[
          { label: "Systems tracked", value: summary.total },
          { label: "Operational", value: summary.operational, tone: "success" as const },
          { label: "Degraded", value: summary.degraded, tone: summary.degraded ? ("warning" as const) : undefined },
          { label: "Down", value: summary.down, tone: summary.down ? ("critical" as const) : undefined },
          { label: "Business critical", value: summary.critical },
          { label: "Integrations mapped", value: summary.integrations },
        ].map((tile) => (
          <div key={tile.label} className="px-4 py-3">
            <div
              className={cn(
                "tabular text-2xl leading-none font-semibold",
                tile.tone === "critical" && "text-critical",
                tile.tone === "warning" && "text-warning",
                tile.tone === "success" && "text-success",
                !tile.tone && "text-fg",
              )}
            >
              {tile.value}
            </div>
            <div className="mt-1.5 text-2xs text-fg-muted">{tile.label}</div>
          </div>
        ))}
      </div>

      <FilterBar
        activeCount={activeCount}
        onClear={() => {
          setSearch("");
          setHealth([]);
          setCriticality([]);
          setKind([]);
        }}
        className="rounded-lg border border-line bg-surface px-3 py-2.5 shadow-xs"
        right={
          <>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/system-map">
                <Network />
                Open system map
              </Link>
            </Button>
            <Button variant="primary" size="sm" onClick={() => openQuickCreate("system")}>
              <Plus />
              Add system
            </Button>
          </>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search systems…"
          className="w-60"
        />
        <FacetFilter
          label="Health"
          selected={health}
          onChange={setHealth}
          options={SYSTEM_HEALTH_ORDER.map((h) => ({
            value: h,
            label: SYSTEM_HEALTH_META[h].label,
            count: snapshot.systems.filter((s) => s.health === h).length,
          }))}
        />
        <FacetFilter
          label="Criticality"
          selected={criticality}
          onChange={setCriticality}
          options={SYSTEM_CRITICALITY_ORDER.map((c) => ({
            value: c,
            label: SYSTEM_CRITICALITY_META[c].label,
            count: snapshot.systems.filter((s) => s.criticality === c).length,
          }))}
        />
        <FacetFilter
          label="Type"
          selected={kind}
          onChange={setKind}
          options={SYSTEM_KIND_ORDER.map((k) => ({
            value: k,
            label: SYSTEM_KIND_META[k].label,
            count: snapshot.systems.filter((s) => s.kind === k).length,
          }))}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Server}
            title="No systems match these filters."
            description="Clear a filter to see the whole estate."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map(({ system, openTickets, activeProjects, integrations, owner }) => (
            <Link
              key={system.id}
              href={`/systems/${system.slug}`}
              className={cn(
                "card-interactive flex flex-col rounded-lg border bg-surface p-4 shadow-xs",
                system.health === "operational" ? "border-line" : "border-warning-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex size-8 shrink-0 items-center justify-center rounded-md",
                      system.health === "operational" ? "bg-subtle" : "bg-warning-bg",
                    )}
                  >
                    <KindIcon
                      name={SYSTEM_KIND_META[system.kind].icon}
                      className={cn(
                        "size-4",
                        system.health === "operational" ? "text-fg-muted" : "text-warning",
                      )}
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-fg">
                      {system.name}
                    </h3>
                    <p className="truncate text-[10px] text-fg-subtle">
                      {SYSTEM_KIND_META[system.kind].label}
                    </p>
                  </div>
                </div>
                <CriticalityBadge criticality={system.criticality} />
              </div>

              <p className="mt-2.5 line-clamp-2 text-xs leading-5 text-fg-muted">
                {system.description}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
                <HealthIndicator health={system.health} note={system.healthNote} />
                <UserChip user={owner} muted />
              </div>

              <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t border-line-soft pt-2.5 text-center">
                <div>
                  <dt className="text-[10px] text-fg-subtle">Open</dt>
                  <dd
                    className={cn(
                      "tabular text-sm font-semibold",
                      openTickets > 0 ? "text-fg" : "text-fg-subtle",
                    )}
                  >
                    {openTickets}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-fg-subtle">Projects</dt>
                  <dd
                    className={cn(
                      "tabular text-sm font-semibold",
                      activeProjects > 0 ? "text-fg" : "text-fg-subtle",
                    )}
                  >
                    {activeProjects}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] text-fg-subtle">Links</dt>
                  <dd className="tabular text-sm font-semibold text-fg-subtle">
                    {integrations}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </PageBody>
  );
}

export { KindIcon };
