"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Cloud,
  Database,
  Lock,
  Plug,
  RotateCcw,
  Server,
  Users,
  Zap,
} from "lucide-react";
import {
  DEFAULT_SLA_CONFIG,
  DEPARTMENTS,
  PROJECT_HEALTH_META,
  PROJECT_HEALTH_ORDER,
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  SYSTEM_CRITICALITY_META,
  SYSTEM_CRITICALITY_ORDER,
  TICKET_CATEGORY_META,
  TICKET_CATEGORY_ORDER,
  TICKET_PRIORITY_META,
  TICKET_PRIORITY_ORDER,
  SOURCE_STATUS_META,
  TICKET_SOURCE_META,
  TICKET_SOURCE_ORDER,
  TICKET_STATUS_META,
  TICKET_STATUS_ORDER,
} from "@/domain";
import { useSnapshot, useWorkspace } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { PageBody } from "@/components/shared/page";
import { UserAvatar } from "@/components/shared/indicators";

/**
 * Settings is intentionally read-mostly in V1.
 *
 * Everything shown here is real configuration the application already runs on —
 * statuses, priorities, categories, SLA targets — surfaced so the shape of it is
 * agreed before anyone builds an editor. Controls that would need a database to
 * mean anything are shown as not yet configurable rather than as dead buttons.
 */
export function SettingsPage() {
  return (
    <PageBody>
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">Ticket Configuration</TabsTrigger>
          <TabsTrigger value="sla">SLA Rules</TabsTrigger>
          <TabsTrigger value="projects">Project Configuration</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <TicketConfiguration />
        </TabsContent>
        <TabsContent value="sla">
          <SLARules />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectConfiguration />
        </TabsContent>
        <TabsContent value="systems">
          <SystemsConfiguration />
        </TabsContent>
        <TabsContent value="team">
          <TeamSettings />
        </TabsContent>
        <TabsContent value="integrations">
          <Integrations />
        </TabsContent>
        <TabsContent value="data">
          <DataSettings />
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}

function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-line bg-subtle px-3 py-2 text-xs leading-5 text-fg-muted">
      <Lock className="mt-0.5 size-3 shrink-0 text-fg-subtle" />
      {children}
    </p>
  );
}

/* ========================================================================== */

function TicketConfiguration() {
  const snapshot = useSnapshot();

  return (
    <div className="space-y-4">
      <ReadOnlyNote>
        These are the values the application runs on today. Editing them requires the
        database behind the data layer, which arrives with the Postgres provider.
      </ReadOnlyNote>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Statuses</CardTitle>
            <span className="text-2xs text-fg-subtle">{TICKET_STATUS_ORDER.length}</span>
          </CardHeader>
          <ul className="divide-y divide-line-soft">
            {TICKET_STATUS_ORDER.map((status) => {
              const meta = TICKET_STATUS_META[status];
              const count = snapshot.tickets.filter((t) => t.status === status).length;
              return (
                <li key={status} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {!meta.open && (
                      <span className="text-[10px] text-fg-subtle">closes the ticket</span>
                    )}
                    <span className="tabular ml-auto text-2xs text-fg-subtle">{count}</span>
                  </div>
                  <p className="mt-1 text-2xs leading-4 text-fg-muted">{meta.description}</p>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Priorities</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-line-soft">
            {TICKET_PRIORITY_ORDER.map((priority) => {
              const meta = TICKET_PRIORITY_META[priority];
              const count = snapshot.tickets.filter((t) => t.priority === priority).length;
              return (
                <li key={priority} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Dot tone={meta.tone} className="size-1.5" />
                    <span className="text-xs font-medium text-fg">{meta.label}</span>
                    <span className="tabular ml-auto text-2xs text-fg-subtle">{count}</span>
                  </div>
                  <p className="mt-1 text-2xs leading-4 text-fg-muted">{meta.description}</p>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <span className="text-2xs text-fg-subtle">{TICKET_CATEGORY_ORDER.length}</span>
          </CardHeader>
          <ul className="divide-y divide-line-soft">
            {TICKET_CATEGORY_ORDER.map((category) => {
              const meta = TICKET_CATEGORY_META[category];
              const count = snapshot.tickets.filter((t) => t.category === category).length;
              const system = meta.systemSlug
                ? snapshot.systems.find((s) => s.slug === meta.systemSlug)
                : null;
              return (
                <li key={category} className="flex items-center gap-2 px-4 py-2">
                  <span className="text-xs text-fg">{meta.label}</span>
                  {system && (
                    <span className="text-[10px] text-fg-subtle">→ {system.name}</span>
                  )}
                  <span className="tabular ml-auto text-2xs text-fg-subtle">{count}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Intake sources</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              Where a ticket can come from. Department portals write to the same queue as
              this application does — a ticket carries its source rather than living in a
              separate system.
            </p>
          </div>
        </CardHeader>
        <ul className="divide-y divide-line-soft">
          {TICKET_SOURCE_ORDER.map((source) => {
            const meta = TICKET_SOURCE_META[source];
            const count = snapshot.tickets.filter((t) => t.source === source).length;
            return (
              <li key={source} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-fg">{meta.label}</span>
                <Badge tone={SOURCE_STATUS_META[meta.status].tone}>
                  {meta.status === "live" && <Check className="size-2.5" />}
                  {SOURCE_STATUS_META[meta.status].label}
                </Badge>
                <span className="tabular ml-auto text-2xs text-fg-subtle">
                  {count > 0 ? `${count} tickets` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/* ========================================================================== */

function SLARules() {
  const snapshot = useSnapshot();
  const config = snapshot.slaConfig ?? DEFAULT_SLA_CONFIG;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Service level targets</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              First response and resolution, by priority.
            </p>
          </div>
        </CardHeader>
        <table className="w-full">
          <thead className="bg-subtle">
            <tr className="border-b border-line">
              {["Priority", "First response", "Target resolution", "Clock", "Open now"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-2xs font-semibold tracking-wide text-fg-muted uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {TICKET_PRIORITY_ORDER.map((priority) => {
              const target = config.targets[priority];
              if (!target) return null;
              const open = snapshot.tickets.filter(
                (t) => t.priority === priority && t.status !== "resolved",
              ).length;
              return (
                <tr key={priority}>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <Dot tone={TICKET_PRIORITY_META[priority].tone} className="size-1.5" />
                      <span className="text-xs font-medium text-fg">
                        {TICKET_PRIORITY_META[priority].label}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-fg-body">
                    {target.firstResponseLabel}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-fg-body">
                    {target.resolutionLabel}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={target.clock === "elapsed" ? "critical" : "neutral"}>
                      {target.clock === "elapsed" ? "Wall clock" : "Business hours"}
                    </Badge>
                  </td>
                  <td className="tabular px-4 py-2.5 text-xs text-fg-body">{open}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How the clock works</CardTitle>
        </CardHeader>
        <div className="space-y-2 px-4 py-3.5 text-xs leading-6 text-fg-muted">
          <p>
            <strong className="text-fg">Business hours</strong> are Monday to Friday,
            09:00–17:00 Mountain Time — {config.businessHoursPerDay} hours a day. A ticket
            raised at 4pm on Friday and resolved at 9am on Monday consumed one business hour,
            not sixty-five.
          </p>
          <p>
            <strong className="text-fg">Critical runs on the wall clock instead.</strong> When
            work has stopped, the fact that it is the evening does not make the outage less
            urgent.
          </p>
          <p>
            <strong className="text-fg">The clock pauses</strong> while a ticket is Waiting on
            Requester. Counting that time against the department measures the requester&apos;s
            response, not the team&apos;s.
          </p>
          <p>
            <strong className="text-fg">Resolved tickets stop moving.</strong> They are judged
            once, on whether they landed inside target, and never reported as still breaching.
          </p>
          <p className="border-t border-line-soft pt-2 text-fg-subtle">
            Public holidays are not yet modelled, and the timezone offset is fixed rather than
            resolved from a timezone database. Both are noted in the code and both are safe to
            change without touching any caller.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ========================================================================== */

function ProjectConfiguration() {
  const snapshot = useSnapshot();
  const initiatives = Array.from(new Set(snapshot.projects.map((p) => p.initiative))).sort();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Statuses</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-line-soft">
          {PROJECT_STATUS_ORDER.map((status) => {
            const meta = PROJECT_STATUS_META[status];
            return (
              <li key={status} className="flex items-center gap-2 px-4 py-2">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                {meta.active && <span className="text-[10px] text-fg-subtle">counts as active</span>}
                <span className="ml-auto text-[10px] text-fg-subtle">
                  {meta.roadmapLane}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Health</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              Set by a person, never derived from progress.
            </p>
          </div>
        </CardHeader>
        <ul className="divide-y divide-line-soft">
          {PROJECT_HEALTH_ORDER.map((health) => (
            <li key={health} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Dot tone={PROJECT_HEALTH_META[health].tone} className="size-1.5" />
                <span className="text-xs font-medium text-fg">
                  {PROJECT_HEALTH_META[health].label}
                </span>
              </div>
              <p className="mt-1 text-2xs leading-4 text-fg-muted">
                {PROJECT_HEALTH_META[health].description}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Strategic initiatives</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-line-soft">
          {initiatives.map((initiative) => (
            <li key={initiative} className="flex items-center gap-2 px-4 py-2">
              <span className="text-xs text-fg">{initiative}</span>
              <span className="tabular ml-auto text-2xs text-fg-subtle">
                {snapshot.projects.filter((p) => p.initiative === initiative).length}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ========================================================================== */

function SystemsConfiguration() {
  const snapshot = useSnapshot();

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>System catalogue</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              {snapshot.systems.length} systems, {snapshot.connections.length} mapped
              integrations.
            </p>
          </div>
        </CardHeader>
        <table className="w-full">
          <thead className="bg-subtle">
            <tr className="border-b border-line">
              {["System", "Criticality", "Owner team", "Credentials", "Links"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-2xs font-semibold tracking-wide text-fg-muted uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {snapshot.systems.map((system) => {
              const links = snapshot.connections.filter(
                (c) => c.sourceSystemId === system.id || c.targetSystemId === system.id,
              ).length;
              return (
                <tr key={system.id} className="transition-colors hover:bg-subtle">
                  <td className="px-4 py-2 text-xs text-fg">{system.name}</td>
                  <td className="px-4 py-2">
                    <Badge tone={SYSTEM_CRITICALITY_META[system.criticality].tone}>
                      {SYSTEM_CRITICALITY_META[system.criticality].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-2xs text-fg-muted">{system.ownerTeam}</td>
                  <td className="px-4 py-2">
                    {system.credentialEnvKey ? (
                      <code className="rounded-xs bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-navy-700">
                        {system.credentialEnvKey}
                      </code>
                    ) : (
                      <span className="text-2xs text-fg-subtle">—</span>
                    )}
                  </td>
                  <td className="tabular px-4 py-2 text-2xs text-fg-muted">{links}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <ReadOnlyNote>
        A system record stores the <em>name</em> of the environment variable holding its
        credentials, never the value. Secrets stay in the server environment and are never
        sent to the browser.
      </ReadOnlyNote>

      <Card>
        <CardHeader>
          <CardTitle>Criticality definitions</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-line-soft">
          {SYSTEM_CRITICALITY_ORDER.map((criticality) => (
            <li key={criticality} className="flex items-start gap-3 px-4 py-2.5">
              <Badge tone={SYSTEM_CRITICALITY_META[criticality].tone}>
                {SYSTEM_CRITICALITY_META[criticality].label}
              </Badge>
              <p className="text-xs leading-5 text-fg-muted">
                {SYSTEM_CRITICALITY_META[criticality].description}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ========================================================================== */

function TeamSettings() {
  const snapshot = useSnapshot();
  const tech = snapshot.users.filter((u) => u.isTechTeam);
  const others = snapshot.users.filter((u) => !u.isTechTeam);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>
              <Users className="mr-1.5 inline size-3.5 text-fg-subtle" />
              Tech Department
            </CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              Work can be assigned to these people.
            </p>
          </div>
        </CardHeader>
        <ul className="divide-y divide-line-soft">
          {tech.map((user) => {
            const open = snapshot.tickets.filter(
              (t) => t.assigneeId === user.id && t.status !== "resolved",
            ).length;
            const owned = snapshot.projects.filter(
              (p) => p.ownerId === user.id && PROJECT_STATUS_META[p.status].active,
            ).length;
            return (
              <li key={user.id} className="flex items-center gap-3 px-4 py-3">
                <UserAvatar user={user} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">
                    {user.name}
                    {user.id === snapshot.currentUserId && (
                      <span className="ml-2 text-[10px] font-normal text-fg-subtle">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-fg-muted">{user.title}</p>
                  <p className="text-[10px] text-fg-subtle">{user.email}</p>
                </div>
                <div className="flex gap-5 text-right">
                  <div>
                    <p className="tabular text-sm font-semibold text-fg">{open}</p>
                    <p className="text-[10px] text-fg-subtle">open tickets</p>
                  </div>
                  <div>
                    <p className="tabular text-sm font-semibold text-fg">{owned}</p>
                    <p className="text-[10px] text-fg-subtle">projects owned</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Everyone else</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              People who raise requests. Roles and permissions arrive with authentication.
            </p>
          </div>
        </CardHeader>
        <ul className="divide-y divide-line-soft">
          {others.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-4 py-2">
              <UserAvatar user={user} size="sm" />
              <span className="text-xs text-fg">{user.name}</span>
              <span className="text-2xs text-fg-muted">{user.title}</span>
              <span className="ml-auto text-2xs text-fg-subtle">
                {DEPARTMENTS[user.department].name}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <ReadOnlyNote>
        V1 has no authentication and no permission model. The signed-in user is resolved in
        one place so company SSO can replace it without changes anywhere else.
      </ReadOnlyNote>
    </div>
  );
}

/* ========================================================================== */

const INTEGRATIONS = [
  {
    name: "Slack",
    icon: Zap,
    description: "Ticket intake from the Tech channel, plus failure notifications.",
    note: "Also the source for a one-time import of historical requests.",
  },
  {
    name: "Salesforce",
    icon: Cloud,
    description: "User directory, object metadata and automation status.",
    note: "Read-only to begin with.",
  },
  {
    name: "Microsoft Fabric",
    icon: Database,
    description: "Pipeline runs and refresh health, so a late refresh raises itself.",
  },
  {
    name: "Power BI",
    icon: Server,
    description: "Dataset and report refresh monitoring.",
  },
  {
    name: "Zapier",
    icon: Zap,
    description: "Zap status and failure counts feeding system health directly.",
    note: "Would have raised KHT-1094 before anyone noticed.",
  },
  {
    name: "Google Workspace",
    icon: Users,
    description: "Identity, and the directory behind onboarding and offboarding.",
  },
  {
    name: "ClickUp",
    icon: Plug,
    description: "One-time import of historical tickets and projects.",
    note: "Import only — not an ongoing sync.",
  },
  {
    name: "Department Portals",
    icon: Plug,
    description: "Sales, Project Consultant and Production portals submitting requests.",
    note: "Writes into the same queue with its own source value.",
  },
];

function Integrations() {
  return (
    <div className="space-y-4">
      <ReadOnlyNote>
        None of these are connected. V1 runs entirely on local data — the application is
        fully usable without a single external credential, which is deliberate. Each
        integration will sit behind the same data-layer boundary the mock provider uses
        today.
      </ReadOnlyNote>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((integration) => (
          <Card key={integration.name} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-subtle">
                  <integration.icon className="size-4 text-fg-subtle" />
                </span>
                <h3 className="truncate text-sm font-semibold text-fg">
                  {integration.name}
                </h3>
              </div>
              <Badge tone="neutral">Not configured</Badge>
            </div>

            <p className="mt-2.5 text-xs leading-5 text-fg-muted">
              {integration.description}
            </p>
            {integration.note && (
              <p className="mt-1.5 text-[10px] leading-4 text-fg-subtle">
                {integration.note}
              </p>
            )}

            <Button variant="secondary" size="sm" className="mt-3 w-full" disabled>
              Connect
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */

/**
 * What the ClickUp import could not determine.
 *
 * Shown rather than hidden: every gap here is something the source system
 * never captured, which is the clearest argument for moving intake into this
 * application. Computed from the tickets themselves so it cannot drift out of
 * step with them.
 */
function ImportQuality() {
  const snapshot = useSnapshot();

  const imported = snapshot.tickets.filter((t) => t.externalRefs.length > 0);
  if (imported.length === 0) return null;

  const hasSlack = (t: (typeof imported)[number]) =>
    t.externalRefs.some((r) => r.source === "slack");
  const hasClickUp = (t: (typeof imported)[number]) =>
    t.externalRefs.some((r) => r.source === "clickup");

  const reconciled = imported.filter((t) => hasSlack(t) && hasClickUp(t)).length;
  const slackOnly = imported.filter((t) => hasSlack(t) && !hasClickUp(t)).length;
  const clickUpOnly = imported.filter((t) => !hasSlack(t) && hasClickUp(t)).length;

  const withRequester = imported.filter((t) => t.requesterId !== null).length;
  const categorised = imported.filter((t) => t.category !== "other").length;
  const linked = imported.filter((t) => t.relatedSystemIds.length > 0).length;

  const rows = [
    {
      label: "Requester known",
      value: withRequester,
      note: "Comes from the Slack intake form. The ClickUp copy discards it.",
    },
    {
      label: "Category inferred",
      value: categorised,
      note: "Neither source has a category field — these were matched on keywords.",
    },
    {
      label: "Linked to a system",
      value: linked,
      note: "Also inferred. Good enough to navigate by, not authoritative.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Import quality</CardTitle>
          <p className="mt-0.5 text-xs text-fg-muted">
            {imported.length} requests, reconciled across Slack and ClickUp.
          </p>
        </div>
      </CardHeader>

      {/* Deduplication is the headline: the automation means the same request
          exists twice, and counting it twice would overstate the workload. */}
      <div className="grid grid-cols-3 divide-x divide-line-soft border-b border-line-soft">
        <div className="px-4 py-3">
          <p className="tabular text-xl leading-none font-semibold text-teal-700">
            {reconciled}
          </p>
          <p className="mt-1.5 text-2xs font-medium text-fg">Duplicates collapsed</p>
          <p className="mt-0.5 text-2xs leading-4 text-fg-subtle">
            Raised in Slack, copied into ClickUp by the automation. Matched on the
            Slack timestamp and shown once.
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="tabular text-xl leading-none font-semibold text-fg">
            {slackOnly}
          </p>
          <p className="mt-1.5 text-2xs font-medium text-fg">Slack only</p>
          <p className="mt-0.5 text-2xs leading-4 text-fg-subtle">
            In an intake channel with no ClickUp copy — the automation did not fire,
            or it is outside the captured window.
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="tabular text-xl leading-none font-semibold text-fg">
            {clickUpOnly}
          </p>
          <p className="mt-1.5 text-2xs font-medium text-fg">ClickUp only</p>
          <p className="mt-0.5 text-2xs leading-4 text-fg-subtle">
            Pasted straight into ClickUp, or raised before the intake channels
            existed. These are the ones with no requester.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-line-soft">
        {rows.map((row) => {
          const pct = Math.round((row.value / imported.length) * 100);
          return (
            <li key={row.label} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-fg">{row.label}</span>
                <span className="tabular shrink-0 text-xs text-fg-muted">
                  {row.value} of {imported.length}
                  <span
                    className={cn(
                      "ml-2 font-medium",
                      pct >= 80 ? "text-success" : pct >= 40 ? "text-warning" : "text-critical",
                    )}
                  >
                    {pct}%
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken">
                <div
                  className={cn(
                    "h-full rounded-full",
                    pct >= 80 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-critical",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-2xs leading-4 text-fg-subtle">{row.note}</p>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line-soft px-4 py-3">
        <p className="text-2xs leading-5 text-fg-muted">
          Priorities and SLA targets are <strong className="text-fg">not</strong> imported
          — ClickUp records no priority on any of these tickets. The targets under SLA
          Rules are placeholders and need the department&apos;s real expectations before
          the attainment figure means anything.
        </p>
      </div>
    </Card>
  );
}

function DataSettings() {
  const { snapshot, dirty, reset } = useWorkspace();

  const counts = [
    { label: "Tickets", value: snapshot.tickets.length },
    { label: "Comments", value: snapshot.ticketComments.length },
    { label: "Activity entries", value: snapshot.ticketActivity.length },
    { label: "Projects", value: snapshot.projects.length },
    { label: "Tasks", value: snapshot.tasks.length },
    { label: "Milestones", value: snapshot.milestones.length },
    { label: "Systems", value: snapshot.systems.length },
    { label: "Integrations", value: snapshot.connections.length },
    { label: "Diagrams", value: snapshot.diagrams.length },
    { label: "Articles", value: snapshot.articles.length },
    { label: "Audit events", value: snapshot.activity.length },
    { label: "People", value: snapshot.users.length },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Current dataset</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              Provider: <code className="font-mono text-[11px]">mock</code> · anchored to{" "}
              {new Date(snapshot.now).toLocaleString("en-US", {
                timeZone: "America/Denver",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              Mountain Time
            </p>
          </div>
        </CardHeader>
        <div className="grid grid-cols-3 divide-x divide-y divide-line-soft md:grid-cols-6">
          {counts.map((count) => (
            <div key={count.label} className="px-4 py-3">
              <p className="tabular text-lg leading-none font-semibold text-fg">
                {count.value}
              </p>
              <p className="mt-1.5 text-2xs text-fg-muted">{count.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <ImportQuality />

      <Card>
        <CardHeader>
          <CardTitle>Why the clock is fixed</CardTitle>
        </CardHeader>
        <div className="space-y-2 px-4 py-3.5 text-xs leading-6 text-fg-muted">
          <p>
            The sample dataset is anchored to one instant rather than reading the wall clock.
            Relative timestamps are rendered on the server and again in the browser; if either
            side read the real time they would disagree and React would report a hydration
            mismatch. Anchoring removes that class of bug entirely.
          </p>
          <p>
            It also keeps the sample coherent. A ticket described as forty-three minutes from
            breaching still says that tomorrow, instead of decaying into nonsense.
          </p>
          <p className="text-fg-subtle">
            A live provider returns the real clock from the same function and nothing else
            changes.
          </p>
        </div>
      </Card>

      <Card className={dirty ? "border-warning-border" : undefined}>
        <CardHeader className={dirty ? "border-warning-border bg-warning-bg" : undefined}>
          <div>
            <CardTitle className={dirty ? "text-warning" : undefined}>
              Local changes
            </CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              Everything you change in this session is kept in your browser only.
            </p>
          </div>
        </CardHeader>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <p className="text-xs leading-5 text-fg-muted">
            {dirty ? (
              <>
                <AlertTriangle className="mr-1.5 inline size-3.5 text-warning" />
                This session has diverged from the seeded dataset. Resetting discards those
                changes and restores the original sample data.
              </>
            ) : (
              "Nothing has been changed yet — this is the seeded dataset exactly as shipped."
            )}
          </p>
          <Button variant="secondary" size="sm" onClick={reset} disabled={!dirty}>
            <RotateCcw />
            Reset to seed data
          </Button>
        </div>
      </Card>

      <Separator />

      <p className={cn("text-2xs leading-5 text-fg-subtle")}>
        Tech Command Center · Kind Home Solutions · V1 on mock data
      </p>
    </div>
  );
}
