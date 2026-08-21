"use client";

import Link from "next/link";
import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ExternalLink,
  KeyRound,
  Network,
  Server,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import {
  CONNECTION_METHOD_META,

  SYSTEM_HEALTH_META,
  SYSTEM_HEALTH_ORDER,
  SYSTEM_KIND_META,
  PROJECT_STATUS_META,
  TICKET_STATUS_META,
  type SystemConnection,
  type SystemHealth,
  type TechSystem,
} from "@/domain";
import { blastRadius, sla, systemSummary, userById } from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives";
import { DetailRow } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import {
  CriticalityBadge,
  HealthIndicator,
  ProgressBar,
  ProjectHealthBadge,
  SLAIndicator,
  UserAvatar,
  UserChip,
} from "@/components/shared/indicators";
import { KindIcon } from "./systems-page";

export function SystemDetail({ slug }: { slug: string }) {
  const snapshot = useSnapshot();
  const summary = React.useMemo(() => systemSummary(snapshot, slug), [snapshot, slug]);

  if (!summary) {
    return (
      <div className="px-6 py-16">
        <EmptyState
          icon={Server}
          title="That system is not in the catalogue."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/systems">Back to systems</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { system } = summary;

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-5">
      <SystemHeader summary={summary} />

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="integrations">
            Integrations
            <span className="ml-1.5 text-fg-subtle">
              {summary.upstream.length + summary.downstream.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tickets">
            Tickets
            <span className="ml-1.5 text-fg-subtle">{summary.openTickets.length}</span>
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects
            <span className="ml-1.5 text-fg-subtle">{summary.activeProjects.length}</span>
          </TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab summary={summary} />
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab summary={summary} />
        </TabsContent>
        <TabsContent value="tickets" className="mt-4">
          <TicketsTab summary={summary} />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <ProjectsTab summary={summary} />
        </TabsContent>
        <TabsContent value="documentation" className="mt-4">
          <DocsTab summary={summary} />
        </TabsContent>
        <TabsContent value="diagrams" className="mt-4">
          <DiagramsTab summary={summary} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab system={system} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Summary = NonNullable<ReturnType<typeof systemSummary>>;

/* ========================================================================== */
/* Header                                                                     */
/* ========================================================================== */

function SystemHeader({ summary }: { summary: Summary }) {
  const snapshot = useSnapshot();
  const { system, owner } = summary;

  return (
    <div>
      <Link
        href="/systems"
        className="inline-flex items-center gap-1 text-2xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3" />
        All systems
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
              system.health === "operational" ? "bg-subtle" : "bg-warning-bg",
            )}
          >
            <KindIcon
              name={SYSTEM_KIND_META[system.kind].icon}
              className={cn(
                "size-5",
                system.health === "operational" ? "text-fg-muted" : "text-warning",
              )}
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl leading-tight font-semibold text-fg">
                {system.name}
              </h1>
              <CriticalityBadge criticality={system.criticality} />
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-fg-muted">
              {system.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <HealthMenu system={system} />
          {system.adminUrl && (
            <Button variant="secondary" size="sm" asChild>
              <a href={system.adminUrl} target="_blank" rel="noopener noreferrer">
                Open admin
                <ExternalLink />
              </a>
            </Button>
          )}
        </div>
      </div>

      {system.healthNote && system.health !== "operational" && (
        <div className="mt-3 flex gap-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2">
          <ShieldAlert className="mt-px size-3.5 shrink-0 text-warning" />
          <div>
            <p className="text-xs leading-5 text-fg-body">{system.healthNote}</p>
            <p className="mt-0.5 text-[10px] text-fg-subtle">
              Changed {formatRelative(system.healthChangedAt, snapshot.now)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 divide-x divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:grid-cols-5">
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Status</p>
          <div className="mt-1">
            <HealthIndicator health={system.health} />
          </div>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Owner</p>
          <div className="mt-1">
            <UserChip user={owner} />
          </div>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Open tickets</p>
          <p className="tabular mt-1 text-sm font-semibold text-fg">
            {summary.openTickets.length}
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Active projects</p>
          <p className="tabular mt-1 text-sm font-semibold text-fg">
            {summary.activeProjects.length}
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Connected systems</p>
          <p className="tabular mt-1 text-sm font-semibold text-fg">
            {summary.upstream.length + summary.downstream.length}
          </p>
        </div>
      </div>
    </div>
  );
}

function HealthMenu({ system }: { system: TechSystem }) {
  const actions = useActions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Dot tone={SYSTEM_HEALTH_META[system.health].tone} className="size-1.5" />
          {SYSTEM_HEALTH_META[system.health].label}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Set health</DropdownMenuLabel>
        {SYSTEM_HEALTH_ORDER.map((health) => (
          <DropdownMenuItem
            key={health}
            onSelect={() =>
              actions.setSystemHealth(
                system.id,
                health as SystemHealth,
                health === "operational"
                  ? null
                  : SYSTEM_HEALTH_META[health].description,
              )
            }
            className="flex-col items-start gap-0.5"
          >
            <span className="flex w-full items-center gap-2">
              <Dot tone={SYSTEM_HEALTH_META[health].tone} className="size-1.5" />
              <span className="font-medium">{SYSTEM_HEALTH_META[health].label}</span>
              {health === system.health && (
                <Check className="ml-auto size-3.5 text-teal-600" />
              )}
            </span>
            <span className="pl-3.5 text-[10px] leading-4 text-fg-subtle">
              {SYSTEM_HEALTH_META[health].description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ========================================================================== */
/* Overview                                                                   */
/* ========================================================================== */

function OverviewTab({ summary }: { summary: Summary }) {
  const snapshot = useSnapshot();
  const { system } = summary;
  const downstream = React.useMemo(
    () => blastRadius(snapshot, system.id),
    [snapshot, system.id],
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>What it is for</CardTitle>
          </CardHeader>
          <div className="px-4 py-3.5">
            <p className="text-sm leading-6 text-fg-body">{system.purpose || system.description}</p>
          </div>
        </Card>

        {/* The question this page exists to answer. */}
        <Card className={downstream.length > 0 ? "border-warning-border" : undefined}>
          <CardHeader
            className={downstream.length > 0 ? "border-warning-border bg-warning-bg" : undefined}
          >
            <div>
              <CardTitle className={downstream.length > 0 ? "text-warning" : undefined}>
                What breaks if {system.shortName} goes down
              </CardTitle>
              <p className="mt-0.5 text-xs text-fg-muted">
                Everything reachable downstream, following the integration graph.
              </p>
            </div>
          </CardHeader>
          <div className="px-4 py-3.5">
            {downstream.length === 0 ? (
              <p className="text-xs text-fg-muted">
                Nothing else depends on this system. An outage here is contained.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {downstream.map((s) => (
                  <Link
                    key={s.id}
                    href={`/systems/${s.slug}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                      s.criticality === "critical"
                        ? "border-critical-border bg-critical-bg text-critical hover:brightness-95"
                        : "border-line bg-subtle text-fg-body hover:bg-sunken",
                    )}
                  >
                    <Dot tone={SYSTEM_HEALTH_META[s.health].tone} className="size-1.5" />
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Who uses it</CardTitle>
          </CardHeader>
          <div className="px-4 py-3.5">
            {system.businessTeams.length === 0 ? (
              <p className="text-xs text-fg-muted">Not recorded yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {system.businessTeams.map((team) => (
                  <span
                    key={team}
                    className="rounded-sm bg-subtle px-2 py-1 text-xs text-fg-body"
                  >
                    {team}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <div className="divide-y divide-line-soft px-4">
            <div className="py-1">
              <DetailRow label="Type">{SYSTEM_KIND_META[system.kind].label}</DetailRow>
              <DetailRow label="Criticality">
                <CriticalityBadge criticality={system.criticality} />
              </DetailRow>
              <DetailRow label="Owner team">{system.ownerTeam}</DetailRow>
              <DetailRow label="Vendor">{system.vendor ?? "Internal"}</DetailRow>
            </div>
            <div className="py-1">
              <DetailRow label="Health since">
                {formatDate(system.healthChangedAt)}
              </DetailRow>
              <DetailRow label="Last change">{formatDate(system.updatedAt)}</DetailRow>
            </div>
            {system.tags.length > 0 && (
              <div className="py-2.5">
                <p className="mb-1.5 text-2xs text-fg-muted">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {system.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-subtle px-1.5 py-0.5 text-[10px] text-fg-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Credentials are referenced, never stored. */}
        <Card>
          <CardHeader>
            <CardTitle>Integration credentials</CardTitle>
          </CardHeader>
          <div className="px-4 py-3">
            {system.credentialEnvKey ? (
              <>
                <p className="flex items-center gap-1.5 text-xs text-fg-body">
                  <KeyRound className="size-3 shrink-0 text-fg-subtle" />
                  <code className="rounded-sm bg-subtle px-1.5 py-0.5 font-mono text-[11px]">
                    {system.credentialEnvKey}
                  </code>
                </p>
                <p className="mt-2 text-[10px] leading-4 text-fg-subtle">
                  The record stores the variable name only. The value lives in the server
                  environment and is never sent to the browser.
                </p>
              </>
            ) : (
              <p className="text-xs text-fg-muted">
                No API integration planned for this system.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Integrations                                                               */
/* ========================================================================== */

function IntegrationsTab({ summary }: { summary: Summary }) {
  const { system, upstream, downstream } = summary;

  if (upstream.length === 0 && downstream.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Network}
          title="No integrations recorded."
          description="Add a connection on the System Map and it appears here."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/system-map">Open the system map</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ConnectionList
        title="Upstream"
        description={`Feeds into ${system.shortName}. If one of these fails, ${system.shortName} may be wrong or stale.`}
        connections={upstream}
        direction="in"
      />
      <ConnectionList
        title="Downstream"
        description={`Reads from ${system.shortName}. These are affected when it fails.`}
        connections={downstream}
        direction="out"
      />
    </div>
  );
}

function ConnectionList({
  title,
  description,
  connections,
  direction,
}: {
  title: string;
  description: string;
  connections: { connection: SystemConnection; system: TechSystem }[];
  direction: "in" | "out";
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
        </div>
        <span className="tabular text-2xs text-fg-subtle">{connections.length}</span>
      </CardHeader>

      {connections.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-fg-subtle">
          Nothing {direction === "in" ? "feeds in" : "reads from this"}.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {connections.map(({ connection, system: other }) => {
            const method = CONNECTION_METHOD_META[connection.method];
            return (
              <li key={connection.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {direction === "in" && (
                    <ArrowRight className="size-3 shrink-0 text-fg-subtle" />
                  )}
                  <Link
                    href={`/systems/${other.slug}`}
                    className="truncate text-sm font-medium text-fg hover:text-navy-700"
                  >
                    {other.name}
                  </Link>
                  {direction === "out" && (
                    <ArrowRight className="size-3 shrink-0 text-fg-subtle" />
                  )}
                  <Badge tone={method.tone} className="ml-auto shrink-0">
                    {method.label}
                  </Badge>
                  {connection.direction === "bidirectional" && (
                    <Badge tone="neutral">Two-way</Badge>
                  )}
                </div>

                <p className="mt-1.5 text-xs leading-5 text-fg-muted">
                  {connection.description}
                </p>

                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                  <div>
                    <dt className="text-fg-subtle">Data</dt>
                    <dd className="text-fg-body">{connection.dataDescription}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Frequency</dt>
                    <dd className="text-fg-body">{connection.frequency}</dd>
                  </div>
                </dl>

                {connection.health !== "operational" && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    <Dot tone="warning" className="size-1.5" />
                    {SYSTEM_HEALTH_META[connection.health].label}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ========================================================================== */
/* Tickets, projects, docs, diagrams, history                                 */
/* ========================================================================== */

function TicketsTab({ summary }: { summary: Summary }) {
  const snapshot = useSnapshot();
  const all = snapshot.tickets.filter((t) =>
    t.relatedSystemIds.includes(summary.system.id),
  );

  if (all.length === 0) {
    return (
      <Card>
        <EmptyState
          title={`No tickets have been raised against ${summary.system.shortName}.`}
          description="That is a good sign, or nobody is linking them. Both are worth knowing."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>
          Tickets
          <span className="ml-2 font-normal text-fg-subtle">
            {summary.openTickets.length} open of {all.length}
          </span>
        </CardTitle>
      </CardHeader>
      <ul className="divide-y divide-line-soft">
        {all.slice(0, 40).map((ticket) => (
          <li key={ticket.id}>
            <Link
              href={`/tickets/${ticket.id}`}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-subtle"
            >
              <span className="tabular w-20 shrink-0 text-2xs text-fg-muted">
                {ticket.ticketNumber}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg group-hover:text-navy-700">
                {ticket.title}
              </span>
              <Badge tone={TICKET_STATUS_META[ticket.status].tone}>
                {TICKET_STATUS_META[ticket.status].label}
              </Badge>
              <span className="w-28 shrink-0">
                <SLAIndicator evaluation={sla(snapshot, ticket)} />
              </span>
              <UserAvatar user={userById(snapshot, ticket.assigneeId)} size="sm" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProjectsTab({ summary }: { summary: Summary }) {
  const snapshot = useSnapshot();
  const projects = snapshot.projects.filter((p) =>
    p.systemIds.includes(summary.system.id),
  );

  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState title={`No projects currently affect ${summary.system.shortName}.`} />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="card-interactive rounded-lg border border-line bg-surface p-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-fg">{project.name}</h3>
            <ProjectHealthBadge health={project.health} note={project.healthNote} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-fg-muted">
            {project.description}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Badge tone={PROJECT_STATUS_META[project.status].tone}>
              {PROJECT_STATUS_META[project.status].label}
            </Badge>
            <span className="tabular text-2xs text-fg-muted">{project.progress}%</span>
          </div>
          <div className="mt-1.5">
            <ProgressBar value={project.progress} health={project.health} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function DocsTab({ summary }: { summary: Summary }) {
  if (summary.articles.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          title={`Nothing written about ${summary.system.shortName} yet.`}
          description="Documentation that references this system appears here automatically."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/knowledge">Browse the knowledge base</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {summary.articles.map((article) => (
        <Link
          key={article.id}
          href={`/knowledge/${article.slug}`}
          className="card-interactive rounded-lg border border-line bg-surface p-4 shadow-xs"
        >
          <h3 className="text-sm font-semibold text-fg">{article.title}</h3>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-fg-muted">
            {article.summary}
          </p>
          <p className="mt-2.5 text-[10px] text-fg-subtle">
            Updated {formatDate(article.updatedAt)}
          </p>
        </Link>
      ))}
    </div>
  );
}

function DiagramsTab({ summary }: { summary: Summary }) {
  if (summary.diagrams.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Workflow}
          title="No diagrams include this system."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/diagrams">Open diagrams</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {summary.diagrams.map((diagram) => (
        <Link
          key={diagram.id}
          href={`/diagrams/${diagram.id}`}
          className="card-interactive rounded-lg border border-line bg-surface p-4 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Workflow className="size-3.5 shrink-0 text-fg-subtle" />
            <h3 className="truncate text-sm font-semibold text-fg">{diagram.name}</h3>
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-fg-muted">
            {diagram.description}
          </p>
          <p className="mt-2.5 text-[10px] text-fg-subtle">
            {diagram.nodes.length} nodes · {diagram.edges.length} connections
          </p>
        </Link>
      ))}
    </div>
  );
}

function HistoryTab({ system }: { system: TechSystem }) {
  const snapshot = useSnapshot();

  if (system.changeLog.length === 0) {
    return (
      <Card>
        <EmptyState title="No changes recorded for this system yet." />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line-soft">
        {system.changeLog.map((change) => {
          const actor = userById(snapshot, change.actorId);
          return (
            <li key={change.id} className="flex items-start gap-3 px-4 py-3">
              <UserAvatar user={actor} size="sm" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-fg">{actor?.name}</span>
                  <Badge tone="neutral" className="capitalize">
                    {change.kind}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-fg-body">{change.summary}</p>
              </div>
              <span className="shrink-0 text-2xs whitespace-nowrap text-fg-subtle">
                {formatDateTime(change.at)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
