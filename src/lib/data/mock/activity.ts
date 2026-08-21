import {
  TICKET_STATUS_META,
  type ActivityEvent,
  type Diagram,
  type KnowledgeArticle,
  type Milestone,
  type Project,
  type TechSystem,
  type Ticket,
} from "@/domain";

/**
 * The audit stream.
 *
 * Derived from the records themselves rather than typed out separately: an
 * event exists because a ticket was created, or a project completed, or a
 * system's health changed. A database-backed implementation would read a real
 * `activity_event` table here; deriving it keeps the mock consistent with the
 * data it describes, which a hand-written list would not stay.
 */
export function buildActivityStream(input: {
  tickets: Ticket[];
  projects: Project[];
  milestones: Milestone[];
  systems: TechSystem[];
  diagrams: Diagram[];
  articles: KnowledgeArticle[];
}): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const push = (e: ActivityEvent) => events.push(e);

  for (const t of input.tickets) {
    push({
      id: `ae-t-${t.id}-created`,
      entityType: "ticket",
      entityId: t.id,
      entityLabel: t.ticketNumber,
      action: "created",
      actorId: t.requesterId,
      summary: `submitted ${t.ticketNumber} — ${t.title}`,
      detail: null,
      href: `/tickets/${t.id}`,
      createdAt: t.createdAt,
      significant: t.priority === "critical",
    });

    if (t.assigneeId && t.firstResponseAt) {
      push({
        id: `ae-t-${t.id}-assigned`,
        entityType: "ticket",
        entityId: t.id,
        entityLabel: t.ticketNumber,
        action: "assigned",
        actorId: t.assigneeId,
        summary: `picked up ${t.ticketNumber}`,
        detail: null,
        href: `/tickets/${t.id}`,
        createdAt: t.firstResponseAt,
        significant: false,
      });
    }

    if (t.resolvedAt) {
      push({
        id: `ae-t-${t.id}-resolved`,
        entityType: "ticket",
        entityId: t.id,
        entityLabel: t.ticketNumber,
        action: "resolved",
        actorId: t.assigneeId ?? t.requesterId,
        summary: `resolved ${t.ticketNumber} — ${t.title}`,
        detail: null,
        href: `/tickets/${t.id}`,
        createdAt: t.resolvedAt,
        significant: t.priority === "critical" || t.priority === "high",
      });
    } else if (t.status !== "new") {
      push({
        id: `ae-t-${t.id}-status`,
        entityType: "ticket",
        entityId: t.id,
        entityLabel: t.ticketNumber,
        action: "status_changed",
        actorId: t.assigneeId ?? t.requesterId,
        summary: `moved ${t.ticketNumber} to ${TICKET_STATUS_META[t.status].label}`,
        detail: t.title,
        href: `/tickets/${t.id}`,
        createdAt: t.updatedAt,
        significant: t.status === "blocked",
      });
    }
  }

  for (const p of input.projects) {
    push({
      id: `ae-p-${p.id}-created`,
      entityType: "project",
      entityId: p.id,
      entityLabel: p.name,
      action: "created",
      actorId: p.ownerId,
      summary: `created the project ${p.name}`,
      detail: null,
      href: `/projects/${p.id}`,
      createdAt: p.createdAt,
      significant: false,
    });

    if (p.completedAt) {
      push({
        id: `ae-p-${p.id}-complete`,
        entityType: "project",
        entityId: p.id,
        entityLabel: p.name,
        action: "completed",
        actorId: p.ownerId,
        summary: `completed ${p.name}`,
        detail: p.expectedImpact || null,
        href: `/projects/${p.id}`,
        createdAt: p.completedAt,
        significant: true,
      });
    } else {
      push({
        id: `ae-p-${p.id}-status`,
        entityType: "project",
        entityId: p.id,
        entityLabel: p.name,
        action: "status_changed",
        actorId: p.ownerId,
        summary: `updated ${p.name}`,
        detail: p.healthNote,
        href: `/projects/${p.id}`,
        createdAt: p.updatedAt,
        significant: p.health === "blocked",
      });
    }
  }

  for (const m of input.milestones) {
    if (!m.completedAt) continue;
    const project = input.projects.find((p) => p.id === m.projectId);
    push({
      id: `ae-m-${m.id}`,
      entityType: "milestone",
      entityId: m.id,
      entityLabel: m.name,
      action: "completed",
      actorId: project?.ownerId ?? "u-robby",
      summary: `completed the milestone ${m.name}`,
      detail: project ? project.name : null,
      href: `/projects/${m.projectId}`,
      createdAt: m.completedAt,
      significant: true,
    });
  }

  for (const s of input.systems) {
    for (const change of s.changeLog) {
      push({
        id: `ae-s-${change.id}`,
        entityType: "system",
        entityId: s.id,
        entityLabel: s.name,
        action: change.kind === "health" ? "health_changed" : "updated",
        actorId: change.actorId,
        summary:
          change.kind === "health"
            ? `changed ${s.name} health — ${change.summary}`
            : `updated ${s.name} — ${change.summary}`,
        detail: null,
        href: `/systems/${s.slug}`,
        createdAt: change.at,
        significant: change.kind === "health",
      });
    }
  }

  for (const d of input.diagrams) {
    push({
      id: `ae-d-${d.id}-created`,
      entityType: "diagram",
      entityId: d.id,
      entityLabel: d.name,
      action: "created",
      actorId: d.createdById,
      summary: `created the diagram ${d.name}`,
      detail: null,
      href: `/diagrams/${d.id}`,
      createdAt: d.createdAt,
      significant: false,
    });
    if (d.updatedAt !== d.createdAt) {
      push({
        id: `ae-d-${d.id}-updated`,
        entityType: "diagram",
        entityId: d.id,
        entityLabel: d.name,
        action: "updated",
        actorId: d.createdById,
        summary: `updated the diagram ${d.name}`,
        detail: null,
        href: `/diagrams/${d.id}`,
        createdAt: d.updatedAt,
        significant: false,
      });
    }
  }

  for (const a of input.articles) {
    push({
      id: `ae-a-${a.id}-published`,
      entityType: "article",
      entityId: a.id,
      entityLabel: a.title,
      action: "published",
      actorId: a.authorId,
      summary: `published ${a.title}`,
      detail: null,
      href: `/knowledge/${a.slug}`,
      createdAt: a.createdAt,
      significant: false,
    });
    if (a.updatedAt !== a.createdAt) {
      push({
        id: `ae-a-${a.id}-updated`,
        entityType: "article",
        entityId: a.id,
        entityLabel: a.title,
        action: "updated",
        actorId: a.authorId,
        summary: `updated ${a.title}`,
        detail: null,
        href: `/knowledge/${a.slug}`,
        createdAt: a.updatedAt,
        significant: false,
      });
    }
  }

  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
