import {
  businessMinutesBetween,
  BUSINESS_MINUTES_PER_DAY,
  evaluateSLA,
  isOpen,
  PROJECT_STATUS_META,
  quarterOf,
  SYSTEM_HEALTH_META,
  TASK_STATUS_META,
  TICKET_CATEGORY_META,
  TICKET_PRIORITY_META,
  TICKET_STATUS_META,
  type Milestone,
  type Project,
  type SLAEvaluation,
  type SystemConnection,
  type Task,
  type TechSystem,
  type Ticket,
  type TicketTimelineEntry,
  type Tone,
  type User,
} from "@/domain";
import type { WorkspaceSnapshot } from "./data/types";
import { average, groupBy, percentChange, sortBy, sum, unique } from "./utils";

const DAY_MS = 86_400_000;

/**
 * Business-time durations, said the way somebody would say them out loud.
 * "2 business days" rather than "960 minutes".
 */
function formatWorkingDuration(minutes: number): string {
  const abs = Math.abs(Math.round(minutes));
  if (abs < 60) return `${abs} ${abs === 1 ? "minute" : "minutes"}`;
  const hours = abs / 60;
  if (hours < BUSINESS_MINUTES_PER_DAY / 60) {
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded} ${rounded === 1 ? "hour" : "hours"}`;
  }
  const days = Math.round((abs / BUSINESS_MINUTES_PER_DAY) * 10) / 10;
  return `${days} business ${days === 1 ? "day" : "days"}`;
}

/** Working minutes a ticket consumed between being raised and being resolved. */
function resolutionBusinessHours(ticket: Ticket): number {
  if (!ticket.resolvedAt) return 0;
  return (
    businessMinutesBetween(new Date(ticket.createdAt), new Date(ticket.resolvedAt)) / 60
  );
}

/* ========================================================================== */
/* Lookups                                                                    */
/* ========================================================================== */

export function userById(snap: WorkspaceSnapshot, id: string | null): User | null {
  if (!id) return null;
  return snap.users.find((u) => u.id === id) ?? null;
}

export function userName(snap: WorkspaceSnapshot, id: string | null, fallback = "Unassigned") {
  return userById(snap, id)?.name ?? fallback;
}

export function systemById(snap: WorkspaceSnapshot, id: string): TechSystem | null {
  return snap.systems.find((s) => s.id === id) ?? null;
}

export function systemsByIds(snap: WorkspaceSnapshot, ids: string[]): TechSystem[] {
  return ids.map((id) => systemById(snap, id)).filter((s): s is TechSystem => s !== null);
}

export function projectById(snap: WorkspaceSnapshot, id: string | null): Project | null {
  if (!id) return null;
  return snap.projects.find((p) => p.id === id) ?? null;
}

export function ticketById(snap: WorkspaceSnapshot, id: string): Ticket | null {
  return snap.tickets.find((t) => t.id === id) ?? null;
}

export const openTickets = (snap: WorkspaceSnapshot) => snap.tickets.filter(isOpen);
export const techTeam = (snap: WorkspaceSnapshot) => snap.users.filter((u) => u.isTechTeam);

export function sla(snap: WorkspaceSnapshot, ticket: Ticket): SLAEvaluation {
  return evaluateSLA(ticket, new Date(snap.now), snap.slaConfig);
}

export function isOverdue(snap: WorkspaceSnapshot, ticket: Ticket): boolean {
  if (!ticket.dueDate || !isOpen(ticket)) return false;
  return new Date(ticket.dueDate).getTime() < new Date(snap.now).getTime();
}

/* ========================================================================== */
/* Command Center metrics                                                     */
/* ========================================================================== */

export type HeadlineMetrics = {
  openTickets: number;
  openTicketsDelta: number | null;
  urgent: number;
  activeProjects: number;
  blockedWork: number;
  avgResolutionHours: number;
  slaAttainment: number;
  unassigned: number;
};

export function headlineMetrics(snap: WorkspaceSnapshot): HeadlineMetrics {
  const now = new Date(snap.now).getTime();
  const open = openTickets(snap);

  // Week-on-week movement in the open queue, reconstructed from creation and
  // resolution times: what was open seven days ago, versus what is open now.
  const weekAgo = now - 7 * DAY_MS;
  const openLastWeek = snap.tickets.filter((t) => {
    const created = new Date(t.createdAt).getTime();
    if (created > weekAgo) return false;
    if (!t.resolvedAt) return true;
    return new Date(t.resolvedAt).getTime() > weekAgo;
  }).length;

  const resolvedLast30 = snap.tickets.filter(
    (t) => t.resolvedAt && new Date(t.resolvedAt).getTime() >= now - 30 * DAY_MS,
  );

  // Reported in working hours, not elapsed: a ticket raised on Friday and
  // closed first thing Monday took one hour of the team, not seventy-two.
  const resolutionHours = resolvedLast30.map(resolutionBusinessHours);

  const met = resolvedLast30.filter((t) => sla(snap, t).state === "met").length;

  const blockedTickets = open.filter((t) => t.status === "blocked").length;
  const blockedProjects = snap.projects.filter(
    (p) => p.health === "blocked" && PROJECT_STATUS_META[p.status].active,
  ).length;

  return {
    openTickets: open.length,
    openTicketsDelta: percentChange(open.length, openLastWeek),
    urgent: open.filter((t) => t.priority === "critical" || t.priority === "high").length,
    activeProjects: snap.projects.filter((p) => PROJECT_STATUS_META[p.status].active).length,
    blockedWork: blockedTickets + blockedProjects,
    avgResolutionHours: average(resolutionHours),
    slaAttainment: resolvedLast30.length === 0 ? 100 : (met / resolvedLast30.length) * 100,
    unassigned: open.filter((t) => !t.assigneeId).length,
  };
}

/* ========================================================================== */
/* Needs Attention                                                            */
/* ========================================================================== */

export type AttentionSeverity = "critical" | "overdue" | "blocked" | "sla_risk" | "degraded";

export type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  title: string;
  context: string;
  timing: string;
  href: string;
  /** Lower sorts first. */
  rank: number;
};

export const ATTENTION_META: Record<
  AttentionSeverity,
  { label: string; tone: Tone; rank: number }
> = {
  critical: { label: "Critical", tone: "critical", rank: 0 },
  overdue: { label: "Overdue", tone: "critical", rank: 1 },
  blocked: { label: "Blocked", tone: "warning", rank: 2 },
  sla_risk: { label: "SLA Risk", tone: "warning", rank: 3 },
  degraded: { label: "Degraded", tone: "warning", rank: 4 },
};

/**
 * The prioritised queue on the Command Center.
 *
 * Each item appears once, at its most severe reading — a critical ticket that
 * is also breaching SLA is one row, not two. Severity is earned, not assigned:
 * if nothing is genuinely critical the section says so rather than colouring
 * routine work red.
 */
export function needsAttention(snap: WorkspaceSnapshot): AttentionItem[] {
  const items: AttentionItem[] = [];
  const claimed = new Set<string>();
  const now = new Date(snap.now);

  const add = (item: AttentionItem) => {
    if (claimed.has(item.id)) return;
    claimed.add(item.id);
    items.push(item);
  };

  for (const ticket of openTickets(snap)) {
    const evaluation = sla(snap, ticket);
    const impacted = ticket.relatedSystemIds.length;

    if (ticket.priority === "critical") {
      add({
        id: ticket.id,
        severity: "critical",
        title: ticket.title,
        context:
          ticket.businessImpact === "company" || ticket.businessImpact === "department"
            ? `${ticket.ticketNumber} · affects a whole department`
            : `${ticket.ticketNumber} · ${impacted} ${impacted === 1 ? "system" : "systems"} involved`,
        timing:
          evaluation.state === "breached"
            ? evaluation.awaitingFirstResponse
              ? "First response overdue"
              : "Past target resolution"
            : "Opened recently",
        href: `/tickets/${ticket.id}`,
        rank: ATTENTION_META.critical.rank,
      });
      continue;
    }

    if (isOverdue(snap, ticket)) {
      const daysOver = Math.floor(
        (now.getTime() - new Date(ticket.dueDate!).getTime()) / DAY_MS,
      );
      add({
        id: ticket.id,
        severity: "overdue",
        title: ticket.title,
        context: `${ticket.ticketNumber} · ${userName(snap, ticket.assigneeId)}`,
        timing: `${daysOver === 0 ? "Due today" : `${daysOver} ${daysOver === 1 ? "day" : "days"} overdue`}`,
        href: `/tickets/${ticket.id}`,
        rank: ATTENTION_META.overdue.rank,
      });
      continue;
    }

    if (ticket.status === "blocked") {
      add({
        id: ticket.id,
        severity: "blocked",
        title: ticket.title,
        context: `${ticket.ticketNumber} · ${userName(snap, ticket.assigneeId)}`,
        timing: "Blocked",
        href: `/tickets/${ticket.id}`,
        rank: ATTENTION_META.blocked.rank,
      });
      continue;
    }

    // SLA pressure earns a place here only for work that was already judged
    // urgent. A Normal ticket drifting past a three-day target is a backlog
    // problem, not an interrupt — it belongs in Backlog Aging on Analytics.
    // Without this filter the queue fills with routine ageing and the section
    // stops meaning anything.
    // Critical tickets already returned above, so "high" is the only remaining
    // priority that qualifies.
    if (ticket.priority === "high" && (evaluation.state === "risk" || evaluation.state === "breached")) {
      const minutes = Math.abs(Math.round(evaluation.minutesRemaining ?? 0));
      add({
        id: ticket.id,
        severity: "sla_risk",
        title: ticket.title,
        context: `${ticket.ticketNumber} · ${TICKET_PRIORITY_META[ticket.priority].label} priority`,
        timing:
          evaluation.state === "breached"
            ? `${formatWorkingDuration(minutes)} past target`
            : `${formatWorkingDuration(minutes)} remaining`,
        href: `/tickets/${ticket.id}`,
        rank: ATTENTION_META.sla_risk.rank,
      });
    }
  }

  for (const project of snap.projects) {
    if (project.health !== "blocked" || !PROJECT_STATUS_META[project.status].active) continue;
    add({
      id: project.id,
      severity: "blocked",
      title: project.name,
      context: `Project · ${userName(snap, project.ownerId)}`,
      timing: project.healthNote ? "Waiting on a decision" : "Blocked",
      href: `/projects/${project.id}`,
      rank: ATTENTION_META.blocked.rank,
    });
  }

  for (const system of snap.systems) {
    if (system.health === "operational" || system.health === "maintenance") continue;
    add({
      id: system.id,
      severity: system.health === "outage" || system.health === "partial_outage" ? "critical" : "degraded",
      title: `${system.name} — ${SYSTEM_HEALTH_META[system.health].label}`,
      context: system.healthNote ?? system.description,
      timing: "System health",
      href: `/systems/${system.slug}`,
      rank:
        system.health === "outage" || system.health === "partial_outage"
          ? ATTENTION_META.critical.rank
          : ATTENTION_META.degraded.rank,
    });
  }

  return sortBy(items, (a, b) => a.rank - b.rank);
}

/* ========================================================================== */
/* My Work                                                                    */
/* ========================================================================== */

export type WorkItem = {
  id: string;
  kind: "ticket" | "task";
  reference: string;
  title: string;
  status: { label: string; tone: Tone };
  priority: { label: string; tone: Tone } | null;
  systemLabel: string | null;
  requesterLabel: string | null;
  assigneeId: string | null;
  createdAt: string;
  dueDate: string | null;
  href: string;
  slaState: SLAEvaluation | null;
  /** Lower sorts first: what to pick up next. */
  urgencyRank: number;
};

export type WorkQueueTab = "mine" | "team" | "waiting" | "recent";

/**
 * The "what should I work on next" queue.
 *
 * Tickets and project tasks appear side by side deliberately — a person's day
 * contains both, and a queue that shows only one of them sends them to another
 * tool to see the rest.
 */
export function workQueue(
  snap: WorkspaceSnapshot,
  tab: WorkQueueTab,
  userId = snap.currentUserId,
): WorkItem[] {
  const items: WorkItem[] = [];

  for (const ticket of snap.tickets) {
    if (!isOpen(ticket)) continue;
    const evaluation = sla(snap, ticket);
    const system = ticket.relatedSystemIds[0]
      ? systemById(snap, ticket.relatedSystemIds[0])
      : null;

    items.push({
      id: ticket.id,
      kind: "ticket",
      reference: ticket.ticketNumber,
      title: ticket.title,
      status: {
        label: TICKET_STATUS_META[ticket.status].label,
        tone: TICKET_STATUS_META[ticket.status].tone,
      },
      priority: {
        label: TICKET_PRIORITY_META[ticket.priority].label,
        tone: TICKET_PRIORITY_META[ticket.priority].tone,
      },
      systemLabel: system?.shortName ?? TICKET_CATEGORY_META[ticket.category].label,
      requesterLabel: userName(snap, ticket.requesterId),
      assigneeId: ticket.assigneeId,
      createdAt: ticket.createdAt,
      dueDate: ticket.dueDate,
      href: `/tickets/${ticket.id}`,
      slaState: evaluation,
      urgencyRank:
        TICKET_PRIORITY_META[ticket.priority].weight * 10 +
        (evaluation.state === "breached" ? 0 : evaluation.state === "risk" ? 1 : 5),
    });
  }

  for (const task of snap.tasks) {
    if (TASK_STATUS_META[task.status].done) continue;
    const project = projectById(snap, task.projectId);
    items.push({
      id: task.id,
      kind: "task",
      reference: project?.name ?? "Project task",
      title: task.title,
      status: {
        label: TASK_STATUS_META[task.status].label,
        tone: TASK_STATUS_META[task.status].tone,
      },
      priority:
        task.priority === "normal"
          ? null
          : {
              label: task.priority === "high" ? "High" : "Low",
              tone: task.priority === "high" ? "warning" : "neutral",
            },
      systemLabel: project ? project.initiative : null,
      requesterLabel: null,
      assigneeId: task.ownerId,
      createdAt: task.createdAt,
      dueDate: task.dueDate,
      href: `/projects/${task.projectId}?tab=tasks`,
      slaState: null,
      urgencyRank:
        (task.priority === "high" ? 5 : task.priority === "low" ? 35 : 25) +
        (task.status === "blocked" ? -3 : 0),
    });
  }

  const now = new Date(snap.now).getTime();
  const filtered = items.filter((item) => {
    switch (tab) {
      case "mine":
        return item.assigneeId === userId;
      case "team":
        return true;
      case "waiting":
        return (
          item.status.label === "Waiting on Requester" ||
          item.status.label === "Blocked" ||
          item.status.label === "Review"
        );
      case "recent":
        return now - new Date(item.createdAt).getTime() < 3 * DAY_MS;
    }
  });

  return sortBy(
    filtered,
    (a, b) => a.urgencyRank - b.urgencyRank,
    (a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );
}

/* ========================================================================== */
/* Tickets — analytics                                                        */
/* ========================================================================== */

export type VolumePoint = { date: string; label: string; created: number; resolved: number };

export function ticketVolumeSeries(snap: WorkspaceSnapshot, days: number): VolumePoint[] {
  const now = new Date(snap.now);
  const buckets = new Map<string, VolumePoint>();

  // Weekly buckets past a month, otherwise the 90-day chart is unreadable.
  const weekly = days > 45;
  const step = weekly ? 7 : 1;

  for (let offset = days - 1; offset >= 0; offset -= step) {
    const date = new Date(now.getTime() - offset * DAY_MS);
    const key = keyFor(date, weekly);
    if (!buckets.has(key)) {
      buckets.set(key, { date: key, label: labelFor(date, weekly), created: 0, resolved: 0 });
    }
  }

  const cutoff = now.getTime() - days * DAY_MS;
  for (const ticket of snap.tickets) {
    const created = new Date(ticket.createdAt);
    if (created.getTime() >= cutoff) {
      const bucket = buckets.get(keyFor(created, weekly));
      if (bucket) bucket.created += 1;
    }
    if (ticket.resolvedAt) {
      const resolved = new Date(ticket.resolvedAt);
      if (resolved.getTime() >= cutoff) {
        const bucket = buckets.get(keyFor(resolved, weekly));
        if (bucket) bucket.resolved += 1;
      }
    }
  }

  return [...buckets.values()];
}

function keyFor(date: Date, weekly: boolean): string {
  const d = new Date(date);
  if (weekly) d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

function labelFor(date: Date, weekly: boolean): string {
  const d = new Date(date);
  if (weekly) d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export type Distribution = { key: string; label: string; value: number; share: number };

function distribute(entries: { key: string; label: string }[]): Distribution[] {
  const counts = groupBy(entries, (e) => e.key);
  const total = entries.length || 1;
  return Object.entries(counts)
    .map(([key, group]) => ({
      key,
      label: group[0]!.label,
      value: group.length,
      share: (group.length / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}

export function ticketsBySystem(snap: WorkspaceSnapshot, days = 30): Distribution[] {
  const cutoff = new Date(snap.now).getTime() - days * DAY_MS;
  const recent = snap.tickets.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  return distribute(
    recent.map((t) => ({
      key: t.category,
      label: TICKET_CATEGORY_META[t.category].label,
    })),
  );
}

export function ticketsByDepartment(snap: WorkspaceSnapshot, days = 30): Distribution[] {
  const cutoff = new Date(snap.now).getTime() - days * DAY_MS;
  const recent = snap.tickets.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  return distribute(
    recent.map((t) => ({
      key: t.requesterDepartment,
      label: userById(snap, t.requesterId)?.department ?? t.requesterDepartment,
    })),
  );
}

export function ticketsByPriority(snap: WorkspaceSnapshot, days = 30): Distribution[] {
  const cutoff = new Date(snap.now).getTime() - days * DAY_MS;
  const recent = snap.tickets.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  return distribute(
    recent.map((t) => ({
      key: t.priority,
      label: TICKET_PRIORITY_META[t.priority].label,
    })),
  );
}

export const BACKLOG_BUCKETS = [
  { key: "lt1", label: "< 1 day", max: 1 },
  { key: "1-3", label: "1–3 days", max: 3 },
  { key: "4-7", label: "4–7 days", max: 7 },
  { key: "8-14", label: "8–14 days", max: 14 },
  { key: "15+", label: "15+ days", max: Infinity },
] as const;

export function backlogAging(snap: WorkspaceSnapshot): Distribution[] {
  const now = new Date(snap.now).getTime();
  const open = openTickets(snap);
  const counts = new Map<string, number>(BACKLOG_BUCKETS.map((b) => [b.key, 0]));

  for (const ticket of open) {
    const ageDays = (now - new Date(ticket.createdAt).getTime()) / DAY_MS;
    const bucket = BACKLOG_BUCKETS.find((b) => ageDays < b.max) ?? BACKLOG_BUCKETS.at(-1)!;
    counts.set(bucket.key, (counts.get(bucket.key) ?? 0) + 1);
  }

  const total = open.length || 1;
  return BACKLOG_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    value: counts.get(b.key) ?? 0,
    share: ((counts.get(b.key) ?? 0) / total) * 100,
  }));
}

export type ResolutionPoint = { label: string; hours: number; count: number };

export function resolutionTrend(snap: WorkspaceSnapshot, weeks = 12): ResolutionPoint[] {
  const now = new Date(snap.now);
  const points: ResolutionPoint[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const end = now.getTime() - w * 7 * DAY_MS;
    const start = end - 7 * DAY_MS;
    const resolved = snap.tickets.filter((t) => {
      if (!t.resolvedAt) return false;
      const at = new Date(t.resolvedAt).getTime();
      return at >= start && at < end;
    });
    const hours = resolved.map(
      (t) => (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 3_600_000,
    );
    const date = new Date(start);
    points.push({
      label: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
      hours: Math.round(average(hours) * 10) / 10,
      count: resolved.length,
    });
  }
  return points;
}

export type TicketAnalytics = {
  created: number;
  resolved: number;
  backlog: number;
  backlogChange: number;
  avgFirstResponseMinutes: number;
  avgResolutionHours: number;
  slaAttainment: number;
  overdue: number;
  reopenedRate: number;
  perTechMember: { user: User; open: number; resolved: number }[];
};

export function ticketAnalytics(snap: WorkspaceSnapshot, days = 30): TicketAnalytics {
  const now = new Date(snap.now).getTime();
  const cutoff = now - days * DAY_MS;
  const priorCutoff = cutoff - days * DAY_MS;

  const created = snap.tickets.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
  const resolved = snap.tickets.filter(
    (t) => t.resolvedAt && new Date(t.resolvedAt).getTime() >= cutoff,
  );
  const priorCreated = snap.tickets.filter((t) => {
    const at = new Date(t.createdAt).getTime();
    return at >= priorCutoff && at < cutoff;
  });
  const priorResolved = snap.tickets.filter((t) => {
    if (!t.resolvedAt) return false;
    const at = new Date(t.resolvedAt).getTime();
    return at >= priorCutoff && at < cutoff;
  });

  const firstResponses = snap.tickets
    .filter((t) => t.firstResponseAt && new Date(t.createdAt).getTime() >= cutoff)
    .map((t) => (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime()) / 60_000);

  const resolutionHours = resolved.map(resolutionBusinessHours);

  const met = resolved.filter((t) => sla(snap, t).state === "met").length;
  const open = openTickets(snap);

  return {
    created: created.length,
    resolved: resolved.length,
    backlog: open.length,
    backlogChange:
      created.length - resolved.length - (priorCreated.length - priorResolved.length),
    avgFirstResponseMinutes: average(firstResponses),
    avgResolutionHours: average(resolutionHours),
    slaAttainment: resolved.length === 0 ? 100 : (met / resolved.length) * 100,
    overdue: open.filter((t) => isOverdue(snap, t)).length,
    reopenedRate:
      resolved.length === 0
        ? 0
        : (resolved.filter((t) => t.reopenCount > 0).length / resolved.length) * 100,
    perTechMember: techTeam(snap).map((user) => ({
      user,
      open: open.filter((t) => t.assigneeId === user.id).length,
      resolved: resolved.filter((t) => t.assigneeId === user.id).length,
    })),
  };
}

/* ========================================================================== */
/* Ticket detail                                                              */
/* ========================================================================== */

export function ticketTimeline(snap: WorkspaceSnapshot, ticketId: string): TicketTimelineEntry[] {
  const comments = snap.ticketComments
    .filter((c) => c.ticketId === ticketId)
    .map<TicketTimelineEntry>((comment) => ({
      type: "comment",
      at: comment.createdAt,
      comment,
    }));

  const activity = snap.ticketActivity
    .filter((a) => a.ticketId === ticketId)
    .map<TicketTimelineEntry>((entry) => ({
      type: "activity",
      at: entry.createdAt,
      activity: entry,
    }));

  return [...comments, ...activity].sort((a, b) => a.at.localeCompare(b.at));
}

/* ========================================================================== */
/* Projects                                                                   */
/* ========================================================================== */

export type ProjectWorkspace = {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  tickets: Ticket[];
  nextMilestone: Milestone | null;
  taskProgress: { done: number; total: number };
  blockers: Task[];
  systems: TechSystem[];
  owner: User | null;
  contributors: User[];
  dependencies: Project[];
};

export function projectWorkspace(
  snap: WorkspaceSnapshot,
  projectId: string,
): ProjectWorkspace | null {
  const project = projectById(snap, projectId);
  if (!project) return null;

  const tasks = sortBy(
    snap.tasks.filter((t) => t.projectId === project.id),
    (a, b) => a.order - b.order,
  );
  const milestones = sortBy(
    snap.milestones.filter((m) => m.projectId === project.id),
    (a, b) => a.order - b.order,
  );

  return {
    project,
    tasks,
    milestones,
    tickets: snap.tickets.filter((t) => t.relatedProjectId === project.id),
    nextMilestone: milestones.find((m) => m.status !== "complete") ?? null,
    taskProgress: {
      done: tasks.filter((t) => TASK_STATUS_META[t.status].done).length,
      total: tasks.length,
    },
    blockers: tasks.filter((t) => t.status === "blocked"),
    systems: systemsByIds(snap, project.systemIds),
    owner: userById(snap, project.ownerId),
    contributors: project.contributorIds
      .map((id) => userById(snap, id))
      .filter((u): u is User => u !== null),
    dependencies: project.dependsOnProjectIds
      .map((id) => projectById(snap, id))
      .filter((p): p is Project => p !== null),
  };
}

export type ProjectAnalytics = {
  active: number;
  completedThisQuarter: number;
  onTrack: number;
  atRisk: number;
  blocked: number;
  avgCycleTimeDays: number;
  byStatus: Distribution[];
  bySystem: Distribution[];
  completedOverTime: { label: string; count: number }[];
  deliveryPerformance: { onTime: number; late: number };
};

export function projectAnalytics(snap: WorkspaceSnapshot): ProjectAnalytics {
  const now = new Date(snap.now);
  const thisQuarter = quarterOf(now);
  const active = snap.projects.filter((p) => PROJECT_STATUS_META[p.status].active);
  const completed = snap.projects.filter((p) => p.completedAt);

  const cycleTimes = completed.map(
    (p) => (new Date(p.completedAt!).getTime() - new Date(p.startDate).getTime()) / DAY_MS,
  );

  const monthly = new Map<string, number>();
  for (const p of completed) {
    const d = new Date(p.completedAt!);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    monthly.set(key, (monthly.get(key) ?? 0) + 1);
  }

  return {
    active: active.length,
    completedThisQuarter: completed.filter((p) => quarterOf(p.completedAt!) === thisQuarter)
      .length,
    onTrack: active.filter((p) => p.health === "on_track").length,
    atRisk: active.filter((p) => p.health === "at_risk").length,
    blocked: active.filter((p) => p.health === "blocked").length,
    avgCycleTimeDays: average(cycleTimes),
    byStatus: distribute(
      snap.projects.map((p) => ({
        key: p.status,
        label: PROJECT_STATUS_META[p.status].label,
      })),
    ),
    bySystem: distribute(
      snap.projects.flatMap((p) =>
        p.systemIds.map((id) => ({
          key: id,
          label: systemById(snap, id)?.shortName ?? "Unknown",
        })),
      ),
    ),
    completedOverTime: [...monthly.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([key, count]) => {
        const [year, month] = key.split("-");
        const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
        return {
          label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
          count,
        };
      }),
    deliveryPerformance: {
      onTime: completed.filter(
        (p) => new Date(p.completedAt!).getTime() <= new Date(p.targetDate).getTime(),
      ).length,
      late: completed.filter(
        (p) => new Date(p.completedAt!).getTime() > new Date(p.targetDate).getTime(),
      ).length,
    },
  };
}

/* ========================================================================== */
/* Business impact                                                            */
/* ========================================================================== */

export type ImpactMetrics = {
  projectsCompletedThisQuarter: number;
  automationsRunning: number;
  hoursSavedMonthly: number;
  hoursSavedAnnual: number;
  manualProcessesEliminated: number;
  systemsImproved: number;
  departmentsImpacted: number;
  majorLaunches: number;
  trend: { label: string; hours: number }[];
};

/**
 * What the department has actually returned to the business.
 *
 * Hours saved come from completed projects only — a project's estimate does
 * not count towards the total until it has shipped, and once it has, the
 * measured figure replaces the estimate where one exists. The methodology is
 * deliberately conservative rather than precise; the purpose is to make the
 * department legible as an investment, not to produce an audited number.
 */
export function impactMetrics(snap: WorkspaceSnapshot): ImpactMetrics {
  const completed = snap.projects.filter((p) => p.completedAt);
  const thisQuarter = quarterOf(new Date(snap.now));

  const hoursSavedMonthly = sum(
    completed.map((p) => p.actualHoursSavedMonthly ?? p.estimatedHoursSavedMonthly),
  );

  // A rolling monthly view of cumulative savings as each project landed.
  const byMonth = new Map<string, number>();
  for (const p of completed) {
    const d = new Date(p.completedAt!);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(
      key,
      (byMonth.get(key) ?? 0) + (p.actualHoursSavedMonthly ?? p.estimatedHoursSavedMonthly),
    );
  }
  let running = 0;
  const trend = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([key, hours]) => {
      running += hours;
      const [year, month] = key.split("-");
      const d = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
      return {
        label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        hours: running,
      };
    });

  return {
    projectsCompletedThisQuarter: completed.filter(
      (p) => quarterOf(p.completedAt!) === thisQuarter,
    ).length,
    automationsRunning: sum(snap.projects.map((p) => p.automationsCreated)) + 48,
    hoursSavedMonthly,
    hoursSavedAnnual: hoursSavedMonthly * 12,
    manualProcessesEliminated: sum(completed.map((p) => p.manualProcessesEliminated)),
    systemsImproved: unique(completed.flatMap((p) => p.systemIds)).length,
    departmentsImpacted: unique(completed.flatMap((p) => p.departmentsImpacted)).length,
    majorLaunches: completed.filter((p) => p.priority === "critical" || p.priority === "high")
      .length,
    trend,
  };
}

/* ========================================================================== */
/* Systems                                                                    */
/* ========================================================================== */

export type SystemSummary = {
  system: TechSystem;
  openTickets: Ticket[];
  activeProjects: Project[];
  upstream: { connection: SystemConnection; system: TechSystem }[];
  downstream: { connection: SystemConnection; system: TechSystem }[];
  articles: WorkspaceSnapshot["articles"];
  diagrams: WorkspaceSnapshot["diagrams"];
  owner: User | null;
};

export function systemSummary(
  snap: WorkspaceSnapshot,
  systemIdOrSlug: string,
): SystemSummary | null {
  const system = snap.systems.find(
    (s) => s.id === systemIdOrSlug || s.slug === systemIdOrSlug,
  );
  if (!system) return null;

  const resolve = (id: string) => snap.systems.find((s) => s.id === id);

  return {
    system,
    openTickets: snap.tickets.filter(
      (t) => isOpen(t) && t.relatedSystemIds.includes(system.id),
    ),
    activeProjects: snap.projects.filter(
      (p) => p.systemIds.includes(system.id) && PROJECT_STATUS_META[p.status].active,
    ),
    upstream: snap.connections
      .filter((c) => c.targetSystemId === system.id)
      .map((connection) => ({ connection, system: resolve(connection.sourceSystemId)! }))
      .filter((x) => x.system),
    downstream: snap.connections
      .filter((c) => c.sourceSystemId === system.id)
      .map((connection) => ({ connection, system: resolve(connection.targetSystemId)! }))
      .filter((x) => x.system),
    articles: snap.articles.filter((a) => a.relatedSystemIds.includes(system.id)),
    diagrams: snap.diagrams.filter((d) => d.relatedSystemIds.includes(system.id)),
    owner: userById(snap, system.ownerId),
  };
}

export type SystemCardData = {
  system: TechSystem;
  openTickets: number;
  activeProjects: number;
  integrations: number;
  owner: User | null;
};

export function systemCards(snap: WorkspaceSnapshot): SystemCardData[] {
  return snap.systems.map((system) => ({
    system,
    openTickets: snap.tickets.filter(
      (t) => isOpen(t) && t.relatedSystemIds.includes(system.id),
    ).length,
    activeProjects: snap.projects.filter(
      (p) => p.systemIds.includes(system.id) && PROJECT_STATUS_META[p.status].active,
    ).length,
    integrations: snap.connections.filter(
      (c) => c.sourceSystemId === system.id || c.targetSystemId === system.id,
    ).length,
    owner: userById(snap, system.ownerId),
  }));
}

/**
 * What stops working if a system goes down: everything reachable downstream of
 * it. Answers "what happens if this breaks?" without opening a dozen documents.
 */
export function blastRadius(snap: WorkspaceSnapshot, systemId: string): TechSystem[] {
  const seen = new Set<string>([systemId]);
  const queue = [systemId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const connection of snap.connections) {
      if (connection.sourceSystemId !== current) continue;
      if (seen.has(connection.targetSystemId)) continue;
      seen.add(connection.targetSystemId);
      queue.push(connection.targetSystemId);
    }
  }

  seen.delete(systemId);
  return [...seen]
    .map((id) => systemById(snap, id))
    .filter((s): s is TechSystem => s !== null);
}
