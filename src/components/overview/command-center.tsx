"use client";

import Link from "next/link";
import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FolderKanban,
  Gauge,
  ShieldCheck,
  Ticket as TicketIcon,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  PROJECT_STATUS_META,
  SYSTEM_HEALTH_META,
  TICKET_CATEGORY_META,
  type Project,
} from "@/domain";
import {
  ATTENTION_META,
  headlineMetrics,
  impactMetrics,
  needsAttention,
  systemById,
  ticketVolumeSeries,
  ticketsBySystem,
  userById,
  workQueue,
  type WorkQueueTab,
} from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import {
  formatAge,
  formatDate,
  formatDateLong,
  formatHours,
  formatNumber,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,

  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/primitives";
import { DistributionList, ImpactArea, VolumeChart } from "@/components/charts/charts";
import { MetricCard } from "@/components/shared/metric-card";
import { PageBody, SectionHeader } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import {
  AvatarStack,

  PriorityBadge,
  ProgressBar,
  ProjectHealthBadge,
  SLAIndicator,
  SystemBadge,
  UserAvatar,
} from "@/components/shared/indicators";
import { useChrome } from "@/components/app/app-chrome";

export function CommandCenter() {
  const snapshot = useSnapshot();
  const metrics = React.useMemo(() => headlineMetrics(snapshot), [snapshot]);

  return (
    <PageBody>
      <Greeting />

      {/* ---------------------------------------------------------------- KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Open Tickets"
          value={metrics.openTickets}
          delta={metrics.openTicketsDelta}
          deltaLabel="vs last week"
          direction="down-good"
          href="/tickets"
          icon={TicketIcon}
        />
        <MetricCard
          label="Urgent / High"
          value={metrics.urgent}
          tone={metrics.urgent > 0 ? "critical" : undefined}
          deltaLabel={metrics.urgent === 0 ? "Nothing urgent" : "Needs a decision today"}
          href="/tickets?priority=critical,high"
          icon={AlertTriangle}
        />
        <MetricCard
          label="Active Projects"
          value={metrics.activeProjects}
          deltaLabel="In flight"
          href="/projects"
          icon={FolderKanban}
        />
        <MetricCard
          label="Blocked Work"
          value={metrics.blockedWork}
          tone={metrics.blockedWork > 0 ? "warning" : undefined}
          deltaLabel="Tickets and projects"
          href="/tickets?status=blocked"
          icon={Gauge}
        />
        <MetricCard
          label="Avg Resolution"
          value={metrics.avgResolutionHours.toFixed(1)}
          unit="hrs"
          deltaLabel="Last 30 days"
          href="/analytics"
          icon={Clock}
        />
        <MetricCard
          label="SLA Performance"
          value={formatPercent(metrics.slaAttainment)}
          tone={metrics.slaAttainment < 90 ? "warning" : undefined}
          deltaLabel="Resolved in target"
          href="/analytics"
          icon={ShieldCheck}
        />
      </div>

      {/* -------------------------------------------- Attention + system health */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <NeedsAttention className="xl:col-span-2" />
        <SystemHealth />
      </div>

      <MyWork />

      <ActiveProjects />

      {/* -------------------------------------------------- Impact + analytics */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TicketAnalyticsPanel className="xl:col-span-2" />
        <TechImpact />
      </div>

      <RecentActivity />
    </PageBody>
  );
}

/* ========================================================================== */
/* Greeting                                                                   */
/* ========================================================================== */

function Greeting() {
  const snapshot = useSnapshot();
  const { openQuickCreate } = useChrome();
  const attention = React.useMemo(() => needsAttention(snapshot), [snapshot]);
  const user = userById(snapshot, snapshot.currentUserId);

  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Denver",
    }).format(new Date(snapshot.now)),
  );
  const partOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const firstName = user?.name.split(" ")[0] ?? "there";

  const pressing = attention.filter(
    (a) => a.severity === "critical" || a.severity === "overdue",
  ).length;

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl leading-tight text-fg">
          Good {partOfDay}, {firstName}.{" "}
          <span className="text-fg-muted">
            {pressing === 0
              ? "Nothing is on fire."
              : `${pressing} ${pressing === 1 ? "thing needs" : "things need"} attention.`}
          </span>
        </h2>
        <p className="mt-1 text-xs text-fg-subtle">{formatDateLong(snapshot.now)}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={() => openQuickCreate("ticket")}>
        <TicketIcon />
        New ticket
      </Button>
    </div>
  );
}

/* ========================================================================== */
/* Needs Attention                                                            */
/* ========================================================================== */

function NeedsAttention({ className }: { className?: string }) {
  const snapshot = useSnapshot();
  const items = React.useMemo(() => needsAttention(snapshot), [snapshot]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div>
          <CardTitle>Needs Attention</CardTitle>
          <p className="mt-0.5 text-xs text-fg-muted">
            Ordered by how much it matters, not by when it arrived.
          </p>
        </div>
        {items.length > 0 && (
          <span className="tabular shrink-0 rounded-full bg-subtle px-2 py-0.5 text-2xs font-semibold text-fg-muted">
            {items.length}
          </span>
        )}
      </CardHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing needs attention."
          description="No critical tickets, nothing overdue, nothing blocked, and every system is behaving. Good place to be."
        />
      ) : (
        <ul className="divide-y divide-line-soft">
          {items.slice(0, 6).map((item) => {
            const meta = ATTENTION_META[item.severity];
            return (
              <li key={`${item.severity}-${item.id}`}>
                <Link
                  href={item.href}
                  className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-subtle"
                >
                  <span className="mt-0.5 w-20 shrink-0">
                    <Badge tone={meta.tone} variant={item.severity === "critical" ? "solid" : "soft"}>
                      {meta.label}
                    </Badge>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg group-hover:text-navy-700">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-fg-muted">
                      {item.context}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "shrink-0 pt-0.5 text-2xs whitespace-nowrap",
                      item.severity === "critical" || item.severity === "overdue"
                        ? "font-medium text-critical"
                        : "text-fg-subtle",
                    )}
                  >
                    {item.timing}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 6 && (
        <div className="border-t border-line-soft px-4 py-2">
          <Link href="/tickets" className="text-2xs font-medium text-teal-700 hover:underline">
            {items.length - 6} more
          </Link>
        </div>
      )}
    </Card>
  );
}

/* ========================================================================== */
/* System health                                                              */
/* ========================================================================== */

function SystemHealth() {
  const snapshot = useSnapshot();

  // Anything unhealthy first, then critical systems. A long alphabetical list
  // would bury the one thing that is actually wrong.
  const systems = React.useMemo(
    () =>
      [...snapshot.systems]
        .sort(
          (a, b) =>
            SYSTEM_HEALTH_META[a.health].rank - SYSTEM_HEALTH_META[b.health].rank ||
            (a.criticality === "critical" ? -1 : 1),
        )
        .slice(0, 8),
    [snapshot.systems],
  );

  const unhealthy = snapshot.systems.filter((s) => s.health !== "operational").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>System Health</CardTitle>
          <p className="mt-0.5 text-xs text-fg-muted">
            {unhealthy === 0
              ? "All systems operational"
              : `${unhealthy} not fully operational`}
          </p>
        </div>
        <Link href="/systems" className="text-2xs font-medium text-teal-700 hover:underline">
          All systems
        </Link>
      </CardHeader>

      <ul className="divide-y divide-line-soft">
        {systems.map((system) => (
          <li key={system.id}>
            <Link
              href={`/systems/${system.slug}`}
              className="flex items-center gap-2.5 px-4 py-2 transition-colors hover:bg-subtle"
            >
              <Dot
                tone={SYSTEM_HEALTH_META[system.health].tone}
                className="size-2 shrink-0"
                pulse={system.health === "outage" || system.health === "partial_outage"}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-fg">
                  {system.name}
                </span>
                {system.healthNote && (
                  <span className="block truncate text-2xs text-fg-muted">
                    {system.healthNote}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "shrink-0 text-2xs",
                  system.health === "operational" ? "text-fg-subtle" : "font-medium text-warning",
                )}
              >
                {SYSTEM_HEALTH_META[system.health].label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ========================================================================== */
/* My Work                                                                    */
/* ========================================================================== */

const WORK_TABS: { id: WorkQueueTab; label: string }[] = [
  { id: "mine", label: "Assigned to Me" },
  { id: "team", label: "Tech Team" },
  { id: "waiting", label: "Waiting" },
  { id: "recent", label: "Recently Updated" },
];

function MyWork() {
  const snapshot = useSnapshot();
  const [tab, setTab] = React.useState<WorkQueueTab>("mine");
  const items = React.useMemo(() => workQueue(snapshot, tab), [snapshot, tab]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-line-soft px-4 pt-3">
        <div className="min-w-0">
          <CardTitle>My Work</CardTitle>
          <p className="mt-0.5 mb-2.5 text-xs text-fg-muted">
            Tickets and project tasks together — what to pick up next.
          </p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as WorkQueueTab)}>
          <TabsList variant="pill" className="mb-2.5">
            {WORK_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} variant="pill">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          compact
          title={
            tab === "mine"
              ? "Nothing assigned to you."
              : tab === "waiting"
                ? "Nothing is waiting on anyone."
                : "Nothing here."
          }
          description={
            tab === "mine"
              ? "Your queue is clear. Pick something up from the Tech Team tab."
              : undefined
          }
        />
      ) : (
        <table className="w-full">
          <thead className="sr-only">
            <tr>
              <th>Item</th>
              <th>Priority</th>
              <th>Status</th>
              <th>System</th>
              <th>Requester</th>
              <th>Age</th>
              <th>SLA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {items.slice(0, 8).map((item) => (
              <tr key={item.id} className="group transition-colors hover:bg-subtle">
                <td className="py-2 pr-3 pl-4">
                  <Link href={item.href} className="block min-w-0">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-sm px-1 py-px text-[9px] font-semibold tracking-wide uppercase",
                          item.kind === "ticket"
                            ? "bg-info-bg text-info"
                            : "bg-accent-bg text-accent",
                        )}
                      >
                        {item.kind}
                      </span>
                      <span className="truncate text-sm text-fg group-hover:text-navy-700">
                        {item.title}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-2xs text-fg-subtle">
                      {item.reference}
                    </span>
                  </Link>
                </td>
                <td className="w-24 px-2 py-2">
                  {item.priority ? (
                    <PriorityBadge priority={
                      item.priority.label === "Critical"
                        ? "critical"
                        : item.priority.label === "High"
                          ? "high"
                          : item.priority.label === "Low"
                            ? "low"
                            : "normal"
                    } />
                  ) : (
                    <span className="text-2xs text-fg-subtle">—</span>
                  )}
                </td>
                <td className="w-36 px-2 py-2">
                  <Badge tone={item.status.tone}>{item.status.label}</Badge>
                </td>
                <td className="w-28 px-2 py-2">
                  <span className="truncate text-2xs text-fg-muted">
                    {item.systemLabel ?? "—"}
                  </span>
                </td>
                <td className="w-32 px-2 py-2">
                  <span className="truncate text-2xs text-fg-muted">
                    {item.requesterLabel ?? "—"}
                  </span>
                </td>
                <td className="tabular w-14 px-2 py-2 text-2xs text-fg-subtle">
                  {formatAge(item.createdAt, snapshot.now)}
                </td>
                <td className="w-28 py-2 pr-4 pl-2">
                  {item.slaState ? (
                    <SLAIndicator evaluation={item.slaState} />
                  ) : item.dueDate ? (
                    <span className="text-2xs text-fg-subtle">
                      {formatDate(item.dueDate)}
                    </span>
                  ) : (
                    <span className="text-2xs text-fg-subtle">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {items.length > 8 && (
        <div className="border-t border-line-soft px-4 py-2">
          <Link href="/tickets" className="text-2xs font-medium text-teal-700 hover:underline">
            {items.length - 8} more in the queue
          </Link>
        </div>
      )}
    </Card>
  );
}

/* ========================================================================== */
/* Active projects                                                            */
/* ========================================================================== */

function ActiveProjects() {
  const snapshot = useSnapshot();
  const projects = React.useMemo(
    () =>
      snapshot.projects
        .filter((p) => PROJECT_STATUS_META[p.status].active)
        .sort((a, b) => {
          const rank = { blocked: 0, at_risk: 1, on_track: 2 };
          return rank[a.health] - rank[b.health];
        })
        .slice(0, 6),
    [snapshot.projects],
  );

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Active Projects"
        description="What the department is building right now."
        href="/projects"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectSummaryCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
}

function ProjectSummaryCard({ project }: { project: Project }) {
  const snapshot = useSnapshot();
  const owner = userById(snapshot, project.ownerId);
  const contributors = project.contributorIds
    .map((id) => userById(snapshot, id))
    .filter((u): u is NonNullable<typeof u> => u !== null);

  const nextMilestone = snapshot.milestones
    .filter((m) => m.projectId === project.id && m.status !== "complete")
    .sort((a, b) => a.order - b.order)[0];

  const systems = project.systemIds
    .map((id) => systemById(snapshot, id))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card-interactive flex flex-col rounded-lg border border-line bg-surface p-3.5 shadow-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-fg">{project.name}</h3>
        <ProjectHealthBadge health={project.health} note={project.healthNote} />
      </div>

      <p className="mt-1 line-clamp-2 text-xs leading-5 text-fg-muted">
        {project.description}
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-2xs">
          <Badge tone={PROJECT_STATUS_META[project.status].tone}>
            {PROJECT_STATUS_META[project.status].label}
          </Badge>
          <span className="tabular text-fg-muted">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} health={project.health} />
      </div>

      {nextMilestone && (
        <p className="mt-2.5 truncate text-2xs text-fg-muted">
          <span className="text-fg-subtle">Next:</span> {nextMilestone.name} ·{" "}
          {formatDate(nextMilestone.targetDate)}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
        <span className="flex items-center gap-1.5">
          <AvatarStack users={[owner, ...contributors].filter(Boolean) as never[]} max={3} />
          <span className="truncate text-2xs text-fg-subtle">{owner?.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {systems.slice(0, 2).map((s) => (
            <SystemBadge key={s.id} system={s} />
          ))}
          {systems.length > 2 && (
            <span className="text-2xs text-fg-subtle">+{systems.length - 2}</span>
          )}
        </span>
      </div>
    </Link>
  );
}

/* ========================================================================== */
/* Ticket analytics                                                           */
/* ========================================================================== */

function TicketAnalyticsPanel({ className }: { className?: string }) {
  const snapshot = useSnapshot();
  const [range, setRange] = React.useState("30");

  const days = Number(range);
  const volume = React.useMemo(
    () => ticketVolumeSeries(snapshot, days),
    [snapshot, days],
  );
  const bySystem = React.useMemo(
    () => ticketsBySystem(snapshot, days),
    [snapshot, days],
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div>
          <CardTitle>Ticket Volume</CardTitle>
          <p className="mt-0.5 text-xs text-fg-muted">
            Created against resolved. Deeper analysis lives on Analytics.
          </p>
        </div>
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
      </CardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
        <div className="p-3">
          <VolumeChart data={volume} />
        </div>
        <div className="border-t border-line-soft p-4 lg:border-t-0 lg:border-l">
          <p className="mb-3 text-2xs font-semibold tracking-wide text-fg-subtle uppercase">
            Tickets by system
          </p>
          {bySystem.length === 0 ? (
            <p className="text-xs text-fg-muted">No tickets in this period.</p>
          ) : (
            <DistributionList data={bySystem} max={5} />
          )}
        </div>
      </div>
    </Card>
  );
}

/* ========================================================================== */
/* Tech impact                                                                */
/* ========================================================================== */

function TechImpact() {
  const snapshot = useSnapshot();
  const impact = React.useMemo(() => impactMetrics(snapshot), [snapshot]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Tech Impact</CardTitle>
          <p className="mt-0.5 text-xs text-fg-muted">What the department gave back.</p>
        </div>
        <Link href="/analytics" className="text-2xs font-medium text-teal-700 hover:underline">
          Detail
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-2 divide-x divide-y divide-line-soft">
          <ImpactStat
            icon={CheckCircle2}
            value={formatNumber(impact.projectsCompletedThisQuarter)}
            label="Projects completed"
            sub="This quarter"
          />
          <ImpactStat
            icon={Zap}
            value={formatNumber(impact.automationsRunning)}
            label="Automations running"
            sub="In production"
          />
          <ImpactStat
            icon={Clock}
            value={formatHours(impact.hoursSavedMonthly)}
            label="Hours saved"
            sub="Every month"
            emphasis
          />
          <ImpactStat
            icon={TrendingUp}
            value={formatNumber(impact.manualProcessesEliminated)}
            label="Manual processes"
            sub="Eliminated"
          />
        </div>

        <div className="border-t border-line-soft px-2 pt-3 pb-1">
          <p className="px-2 text-2xs font-semibold tracking-wide text-fg-subtle uppercase">
            Cumulative hours saved per month
          </p>
          <ImpactArea data={impact.trend} />
        </div>
      </CardContent>
    </Card>
  );
}

function ImpactStat({
  icon: Icon,
  value,
  label,
  sub,
  emphasis,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  sub: string;
  emphasis?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <Icon className={cn("size-3.5", emphasis ? "text-teal-600" : "text-fg-subtle")} />
      <p
        className={cn(
          "tabular mt-1.5 text-xl leading-tight font-semibold",
          emphasis ? "text-teal-700" : "text-fg",
        )}
      >
        {value}
      </p>
      <p className="text-2xs text-fg-body">{label}</p>
      <p className="text-2xs text-fg-subtle">{sub}</p>
    </div>
  );
}

/* ========================================================================== */
/* Recent activity                                                            */
/* ========================================================================== */

function RecentActivity() {
  const snapshot = useSnapshot();
  const events = snapshot.activity.slice(0, 8);

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Recent Activity"
        description="Everything that changed, newest first."
        href="/activity"
      />
      <Card>
        <ul className="divide-y divide-line-soft">
          {events.map((event) => {
            const actor = userById(snapshot, event.actorId);
            return (
              <li key={event.id}>
                <Link
                  href={event.href}
                  className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-subtle"
                >
                  <UserAvatar user={actor} size="sm" className="mt-px" />
                  <span className="min-w-0 flex-1">
                    <span className="text-xs text-fg-body">
                      <span className="font-medium text-fg">{actor?.name ?? "Someone"}</span>{" "}
                      {event.summary}
                    </span>
                    {event.detail && (
                      <span className="mt-0.5 block truncate text-2xs text-fg-subtle">
                        {event.detail}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-2xs whitespace-nowrap text-fg-subtle">
                    {formatRelative(event.createdAt, snapshot.now)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}

/** Re-exported so the tickets page can reuse the category label map. */
export { TICKET_CATEGORY_META };
