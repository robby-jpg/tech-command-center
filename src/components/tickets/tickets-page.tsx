"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { KanbanSquare, LayoutList, Plus, TrendingUp } from "lucide-react";
import {
  DEPARTMENTS,
  DEPARTMENT_KEYS,
  TICKET_CATEGORY_META,
  TICKET_CATEGORY_ORDER,
  TICKET_PRIORITY_META,
  TICKET_PRIORITY_ORDER,
  TICKET_STATUS_META,
  TICKET_STATUS_ORDER,
  isOpen,
  type Ticket,
} from "@/domain";
import {
  backlogAging,
  isOverdue,
  sla,
  ticketAnalytics,
  ticketVolumeSeries,
  ticketsByDepartment,
  ticketsBySystem,
} from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { formatHours, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/primitives";
import {
  CategoricalBarChart,
  DistributionList,
  SimpleBarChart,
  VolumeChart,
} from "@/components/charts/charts";
import { FacetFilter, FilterBar, SearchInput } from "@/components/shared/filter-bar";
import { PageBody } from "@/components/shared/page";
import { StatTile } from "@/components/shared/metric-card";
import { useChrome } from "@/components/app/app-chrome";
import { TicketKanban } from "./ticket-kanban";
import { TicketTable } from "./ticket-table";

type Filters = {
  search: string;
  status: string[];
  priority: string[];
  category: string[];
  system: string[];
  department: string[];
  assignee: string[];
  slaState: string[];
  age: string[];
};

const EMPTY: Filters = {
  search: "",
  status: [],
  priority: [],
  category: [],
  system: [],
  department: [],
  assignee: [],
  slaState: [],
  age: [],
};

const AGE_BUCKETS = [
  { value: "today", label: "Today", maxDays: 1 },
  { value: "week", label: "Last 7 days", maxDays: 7 },
  { value: "month", label: "Last 30 days", maxDays: 30 },
  { value: "older", label: "Older than 30 days", maxDays: Infinity },
];

export function TicketsPage() {
  const snapshot = useSnapshot();
  const searchParams = useSearchParams();
  const { openQuickCreate } = useChrome();

  // The Command Center links here with a filter already applied, so the URL is
  // read once as the initial state rather than being kept in sync both ways.
  const [filters, setFilters] = React.useState<Filters>(() => ({
    ...EMPTY,
    status: splitParam(searchParams.get("status")),
    priority: splitParam(searchParams.get("priority")),
    category: splitParam(searchParams.get("category")),
    system: splitParam(searchParams.get("system")),
    assignee: splitParam(searchParams.get("assignee")),
  }));

  const [view, setView] = React.useState(searchParams.get("view") ?? "table");

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const activeCount = React.useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) =>
        key === "search" ? value !== "" : (value as string[]).length > 0,
      ).length,
    [filters],
  );

  const filtered = React.useMemo(() => {
    const now = new Date(snapshot.now).getTime();
    const search = filters.search.trim().toLowerCase();

    return snapshot.tickets.filter((ticket) => {
      if (filters.status.length && !filters.status.includes(ticket.status)) return false;
      if (filters.priority.length && !filters.priority.includes(ticket.priority))
        return false;
      if (filters.category.length && !filters.category.includes(ticket.category))
        return false;
      if (
        filters.department.length &&
        !filters.department.includes(ticket.requesterDepartment)
      )
        return false;
      if (
        filters.system.length &&
        !ticket.relatedSystemIds.some((id) => filters.system.includes(id))
      )
        return false;
      if (filters.assignee.length) {
        const key = ticket.assigneeId ?? "unassigned";
        if (!filters.assignee.includes(key)) return false;
      }
      if (filters.slaState.length && !filters.slaState.includes(sla(snapshot, ticket).state))
        return false;
      if (filters.age.length) {
        const ageDays = (now - new Date(ticket.createdAt).getTime()) / 86_400_000;
        const match = filters.age.some((key) => {
          const bucket = AGE_BUCKETS.find((b) => b.value === key);
          if (!bucket) return false;
          if (bucket.value === "older") return ageDays > 30;
          return ageDays <= bucket.maxDays;
        });
        if (!match) return false;
      }
      if (search) {
        const haystack =
          `${ticket.ticketNumber} ${ticket.title} ${ticket.description} ${ticket.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [snapshot, filters]);

  // Facet counts are computed over everything, so a filter never appears to
  // have nothing behind it just because another filter is currently narrowing.
  const counts = React.useMemo(() => countFacets(snapshot.tickets), [snapshot.tickets]);

  return (
    <PageBody>
      <TicketMetrics onFilter={(patch) => setFilters({ ...EMPTY, ...patch })} />

      <Tabs value={view} onValueChange={setView} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="pill">
            <TabsTrigger value="table" variant="pill">
              <LayoutList className="mr-1.5 inline size-3.5" />
              Table
            </TabsTrigger>
            <TabsTrigger value="kanban" variant="pill">
              <KanbanSquare className="mr-1.5 inline size-3.5" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="analytics" variant="pill">
              <TrendingUp className="mr-1.5 inline size-3.5" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <Button variant="primary" size="sm" onClick={() => openQuickCreate("ticket")}>
            <Plus />
            New ticket
          </Button>
        </div>

        {view !== "analytics" && (
          <FilterBar
            activeCount={activeCount}
            onClear={() => setFilters(EMPTY)}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 shadow-xs"
          >
            <SearchInput
              value={filters.search}
              onChange={(v) => set("search", v)}
              placeholder="Search tickets…"
              className="w-64"
            />
            <FacetFilter
              label="Status"
              selected={filters.status}
              onChange={(v) => set("status", v)}
              options={TICKET_STATUS_ORDER.map((s) => ({
                value: s,
                label: TICKET_STATUS_META[s].label,
                count: counts.status[s] ?? 0,
              }))}
            />
            <FacetFilter
              label="Priority"
              selected={filters.priority}
              onChange={(v) => set("priority", v)}
              options={TICKET_PRIORITY_ORDER.map((p) => ({
                value: p,
                label: TICKET_PRIORITY_META[p].label,
                count: counts.priority[p] ?? 0,
              }))}
            />
            <FacetFilter
              label="Category"
              selected={filters.category}
              onChange={(v) => set("category", v)}
              options={TICKET_CATEGORY_ORDER.map((c) => ({
                value: c,
                label: TICKET_CATEGORY_META[c].label,
                count: counts.category[c] ?? 0,
              }))}
            />
            <FacetFilter
              label="System"
              selected={filters.system}
              onChange={(v) => set("system", v)}
              options={snapshot.systems.map((s) => ({
                value: s.id,
                label: s.name,
                count: counts.system[s.id] ?? 0,
              }))}
            />
            <FacetFilter
              label="Department"
              selected={filters.department}
              onChange={(v) => set("department", v)}
              options={DEPARTMENT_KEYS.map((d) => ({
                value: d,
                label: DEPARTMENTS[d].name,
                count: counts.department[d] ?? 0,
              }))}
            />
            <FacetFilter
              label="Assignee"
              selected={filters.assignee}
              onChange={(v) => set("assignee", v)}
              options={[
                { value: "unassigned", label: "Unassigned", count: counts.assignee.unassigned ?? 0 },
                ...snapshot.users
                  .filter((u) => u.isTechTeam)
                  .map((u) => ({
                    value: u.id,
                    label: u.name,
                    count: counts.assignee[u.id] ?? 0,
                  })),
              ]}
            />
            <FacetFilter
              label="SLA"
              selected={filters.slaState}
              onChange={(v) => set("slaState", v)}
              options={[
                { value: "breached", label: "Breached" },
                { value: "risk", label: "At risk" },
                { value: "healthy", label: "On track" },
                { value: "met", label: "Met" },
              ]}
            />
            <FacetFilter
              label="Created"
              align="end"
              selected={filters.age}
              onChange={(v) => set("age", v)}
              options={AGE_BUCKETS.map((b) => ({ value: b.value, label: b.label }))}
            />
          </FilterBar>
        )}

        <TabsContent value="table">
          <TicketTable tickets={filtered} />
        </TabsContent>

        <TabsContent value="kanban">
          <TicketKanban tickets={filtered} />
        </TabsContent>

        <TabsContent value="analytics">
          <TicketAnalyticsView />
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}

function splitParam(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function countFacets(tickets: Ticket[]) {
  const bump = (record: Record<string, number>, key: string) => {
    record[key] = (record[key] ?? 0) + 1;
  };
  const status: Record<string, number> = {};
  const priority: Record<string, number> = {};
  const category: Record<string, number> = {};
  const system: Record<string, number> = {};
  const department: Record<string, number> = {};
  const assignee: Record<string, number> = {};

  for (const t of tickets) {
    bump(status, t.status);
    bump(priority, t.priority);
    bump(category, t.category);
    bump(department, t.requesterDepartment);
    bump(assignee, t.assigneeId ?? "unassigned");
    for (const id of t.relatedSystemIds) bump(system, id);
  }
  return { status, priority, category, system, department, assignee };
}

/* ========================================================================== */
/* Top metrics                                                                */
/* ========================================================================== */

function TicketMetrics({ onFilter }: { onFilter: (patch: Partial<Filters>) => void }) {
  const snapshot = useSnapshot();

  const stats = React.useMemo(() => {
    const open = snapshot.tickets.filter(isOpen);
    const weekAgo = new Date(snapshot.now).getTime() - 7 * 86_400_000;
    return {
      open: open.length,
      unassigned: open.filter((t) => !t.assigneeId).length,
      urgent: open.filter((t) => t.priority === "critical" || t.priority === "high").length,
      waiting: open.filter(
        (t) => t.status === "waiting_on_requester" || t.status === "blocked",
      ).length,
      overdue: open.filter(
        (t) => isOverdue(snapshot, t) || sla(snapshot, t).state === "breached",
      ).length,
      resolvedThisWeek: snapshot.tickets.filter(
        (t) => t.resolvedAt && new Date(t.resolvedAt).getTime() >= weekAgo,
      ).length,
    };
  }, [snapshot]);

  const tiles: {
    label: string;
    value: number;
    tone?: "critical" | "warning" | "success";
    patch: Partial<Filters>;
  }[] = [
    { label: "Open", value: stats.open, patch: { status: [...TICKET_STATUS_ORDER.filter((s) => TICKET_STATUS_META[s].open)] } },
    { label: "Unassigned", value: stats.unassigned, patch: { assignee: ["unassigned"] } },
    {
      label: "High / Critical",
      value: stats.urgent,
      tone: stats.urgent > 0 ? "warning" : undefined,
      patch: { priority: ["critical", "high"] },
    },
    {
      label: "Waiting",
      value: stats.waiting,
      patch: { status: ["waiting_on_requester", "blocked"] },
    },
    {
      label: "Overdue",
      value: stats.overdue,
      tone: stats.overdue > 0 ? "critical" : undefined,
      patch: { slaState: ["breached"] },
    },
    {
      label: "Resolved this week",
      value: stats.resolvedThisWeek,
      tone: "success",
      patch: { status: ["resolved"] },
    },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:grid-cols-6">
      {tiles.map((tile) => (
        <button
          key={tile.label}
          type="button"
          onClick={() => onFilter(tile.patch)}
          className="cursor-pointer px-4 py-3 text-left transition-colors hover:bg-subtle"
        >
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
        </button>
      ))}
    </div>
  );
}

/* ========================================================================== */
/* Analytics view                                                             */
/* ========================================================================== */

function TicketAnalyticsView() {
  const snapshot = useSnapshot();
  const [range, setRange] = React.useState("30");
  const days = Number(range);

  const analytics = React.useMemo(() => ticketAnalytics(snapshot, days), [snapshot, days]);
  const volume = React.useMemo(() => ticketVolumeSeries(snapshot, days), [snapshot, days]);
  const bySystem = React.useMemo(() => ticketsBySystem(snapshot, days), [snapshot, days]);
  const byDepartment = React.useMemo(
    () =>
      ticketsByDepartment(snapshot, days).map((d) => ({
        ...d,
        label: DEPARTMENTS[d.key as keyof typeof DEPARTMENTS]?.shortName ?? d.label,
      })),
    [snapshot, days],
  );
  const aging = React.useMemo(() => backlogAging(snapshot), [snapshot]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-fg-muted">
          A summary. The Analytics page carries department performance and business impact.
        </p>
        <ToggleGroup
          type="single"
          value={range}
          onValueChange={(v) => v && setRange(v)}
          aria-label="Date range"
        >
          <ToggleGroupItem value="7">7d</ToggleGroupItem>
          <ToggleGroupItem value="30">30d</ToggleGroupItem>
          <ToggleGroupItem value="90">90d</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card>
        <div className="grid grid-cols-2 divide-x divide-y divide-line-soft md:grid-cols-4 xl:grid-cols-7 xl:divide-y-0">
          <StatTile label="Created" value={analytics.created} />
          <StatTile label="Resolved" value={analytics.resolved} />
          <StatTile
            label="Backlog"
            value={analytics.backlog}
            sublabel={
              analytics.backlogChange === 0
                ? "flat"
                : `${analytics.backlogChange > 0 ? "+" : "−"}${Math.abs(analytics.backlogChange)} vs prior`
            }
          />
          <StatTile
            label="Avg first response"
            value={`${Math.round(analytics.avgFirstResponseMinutes)}m`}
          />
          <StatTile
            label="Avg resolution"
            value={formatHours(analytics.avgResolutionHours)}
            sublabel="business hours"
          />
          <StatTile
            label="SLA attainment"
            value={formatPercent(analytics.slaAttainment)}
            tone={analytics.slaAttainment < 90 ? "warning" : "success"}
          />
          <StatTile
            label="Reopened"
            value={formatPercent(analytics.reopenedRate, 1)}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Created vs Resolved</CardTitle>
        </CardHeader>
        <div className="p-3">
          <VolumeChart data={volume} height={230} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>By system</CardTitle>
          </CardHeader>
          <div className="p-4">
            <DistributionList data={bySystem} max={7} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By department</CardTitle>
          </CardHeader>
          <div className="p-3">
            <CategoricalBarChart
              data={byDepartment.map((d) => ({ label: d.label, value: d.value }))}
              height={210}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backlog aging</CardTitle>
            <span className="text-2xs text-fg-subtle">Open tickets</span>
          </CardHeader>
          <div className="p-3">
            <SimpleBarChart
              data={aging.map((a) => ({ label: a.label, value: a.value }))}
              horizontal
              height={210}
              color="var(--color-warning)"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
