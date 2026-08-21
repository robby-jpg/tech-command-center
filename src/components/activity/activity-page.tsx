"use client";

import Link from "next/link";
import * as React from "react";
import * as Icons from "lucide-react";
import { Activity as ActivityIcon, CircleDot } from "lucide-react";
import {
  ACTIVITY_ENTITY_META,
  ACTIVITY_ENTITY_TYPES,
  type ActivityEntityType,
  type ActivityEvent,
} from "@/domain";
import { userById } from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { formatDateLong, formatRelative, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FacetFilter, FilterBar, SearchInput } from "@/components/shared/filter-bar";
import { PageBody } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import { UserAvatar } from "@/components/shared/indicators";

function EntityIcon({ name, className }: { name: string; className?: string }) {
  const Resolved =
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    CircleDot;
  return <Resolved className={className} />;
}

const PAGE_SIZE = 40;

export function ActivityPage() {
  const snapshot = useSnapshot();
  const [search, setSearch] = React.useState("");
  const [types, setTypes] = React.useState<string[]>([]);
  const [actors, setActors] = React.useState<string[]>([]);
  const [significantOnly, setSignificantOnly] = React.useState(false);
  const [limit, setLimit] = React.useState(PAGE_SIZE);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.activity.filter((event) => {
      if (types.length && !types.includes(event.entityType)) return false;
      if (actors.length && !actors.includes(event.actorId)) return false;
      if (significantOnly && !event.significant) return false;
      if (q && !`${event.summary} ${event.entityLabel} ${event.detail ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [snapshot.activity, search, types, actors, significantOnly]);

  // Paging resets whenever the result set changes underneath it. Adjusted
  // during render rather than in an effect: an effect would paint one frame of
  // the old page size against the new results before correcting itself.
  const filterSignature = `${search}|${types.join()}|${actors.join()}|${significantOnly}`;
  const [lastSignature, setLastSignature] = React.useState(filterSignature);
  if (filterSignature !== lastSignature) {
    setLastSignature(filterSignature);
    setLimit(PAGE_SIZE);
  }

  const visible = filtered.slice(0, limit);

  const grouped = React.useMemo(() => {
    const days = new Map<string, ActivityEvent[]>();
    for (const event of visible) {
      const key = event.createdAt.slice(0, 10);
      days.set(key, [...(days.get(key) ?? []), event]);
    }
    return [...days.entries()];
  }, [visible]);

  const counts = React.useMemo(() => {
    const byType: Record<string, number> = {};
    const byActor: Record<string, number> = {};
    for (const event of snapshot.activity) {
      byType[event.entityType] = (byType[event.entityType] ?? 0) + 1;
      byActor[event.actorId] = (byActor[event.actorId] ?? 0) + 1;
    }
    return { byType, byActor };
  }, [snapshot.activity]);

  const activeCount =
    (search ? 1 : 0) + (types.length ? 1 : 0) + (actors.length ? 1 : 0) + (significantOnly ? 1 : 0);

  return (
    <PageBody>
      <FilterBar
        activeCount={activeCount}
        onClear={() => {
          setSearch("");
          setTypes([]);
          setActors([]);
          setSignificantOnly(false);
        }}
        className="rounded-lg border border-line bg-surface px-3 py-2.5 shadow-xs"
        right={
          <span className="text-2xs text-fg-subtle">
            {filtered.length} of {snapshot.activity.length} events
          </span>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search activity…"
          className="w-64"
        />
        <FacetFilter
          label="Type"
          selected={types}
          onChange={setTypes}
          options={ACTIVITY_ENTITY_TYPES.map((t) => ({
            value: t,
            label: ACTIVITY_ENTITY_META[t].plural,
            count: counts.byType[t] ?? 0,
          }))}
        />
        <FacetFilter
          label="Person"
          selected={actors}
          onChange={setActors}
          options={snapshot.users
            .filter((u) => (counts.byActor[u.id] ?? 0) > 0)
            .map((u) => ({
              value: u.id,
              label: u.name,
              count: counts.byActor[u.id] ?? 0,
            }))}
        />
        <Button
          variant={significantOnly ? "subtle" : "secondary"}
          size="sm"
          onClick={() => setSignificantOnly((v) => !v)}
          className={cn(significantOnly && "border border-navy-200 bg-navy-50 text-navy-700")}
          aria-pressed={significantOnly}
        >
          Notable only
        </Button>
      </FilterBar>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ActivityIcon}
            title="Nothing matches these filters."
            description="Everything the department does is recorded here — try widening the search."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, events]) => (
            <section key={day}>
              <h2 className="sticky top-0 z-10 -mx-1 bg-canvas/90 px-1 py-1.5 text-2xs font-semibold tracking-wide text-fg-subtle uppercase backdrop-blur-sm">
                {formatDateLong(events[0]!.createdAt)}
              </h2>

              <Card className="overflow-hidden">
                <ol className="divide-y divide-line-soft">
                  {events.map((event) => (
                    <ActivityRow key={event.id} event={event} />
                  ))}
                </ol>
              </Card>
            </section>
          ))}

          {limit < filtered.length && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLimit((l) => l + PAGE_SIZE)}
              >
                Load {Math.min(PAGE_SIZE, filtered.length - limit)} more
              </Button>
            </div>
          )}
        </div>
      )}
    </PageBody>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const snapshot = useSnapshot();
  const actor = userById(snapshot, event.actorId);
  const meta = ACTIVITY_ENTITY_META[event.entityType as ActivityEntityType];

  return (
    <li>
      <Link
        href={event.href}
        className={cn(
          "flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-subtle",
          event.significant && "bg-teal-50/30",
        )}
      >
        <UserAvatar user={actor} size="md" className="mt-px" />

        <span className="min-w-0 flex-1">
          <span className="text-sm leading-5 text-fg-body">
            <span className="font-medium text-fg">{actor?.name ?? "Someone"}</span>{" "}
            {event.summary}
          </span>
          {event.detail && (
            <span className="mt-0.5 block truncate text-xs text-fg-subtle">
              {event.detail}
            </span>
          )}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <Badge tone={meta.tone} variant="outline">
            <EntityIcon name={meta.icon} className="size-2.5" />
            {meta.label}
          </Badge>
          <span
            className="tabular w-14 text-right text-2xs whitespace-nowrap text-fg-subtle"
            title={formatRelative(event.createdAt, snapshot.now)}
          >
            {formatTime(event.createdAt)}
          </span>
        </span>
      </Link>
    </li>
  );
}
