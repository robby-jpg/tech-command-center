import type { Tone } from "./common";
import { quarterOf, type Project, type ProjectStatus } from "./project";
import type { DepartmentKey } from "./user";
import {
  TICKET_STATUS_META,
  type Ticket,
  type TicketActivity,
  type TicketComment,
  type TicketSource,
  type TicketStatus,
} from "./ticket";

/**
 * What a request looks like to the person who raised it.
 *
 * The Command Center and the Employee Portal show the same tickets. They are
 * not the same view of them, and the difference is not cosmetic:
 *
 *   - The department needs seven statuses to run a queue. A requester needs to
 *     know one of four things: you have it, you are on it, you need me, it is
 *     done. `requesterStage` collapses the former onto the latter.
 *   - Internal notes, SLA arithmetic, effort estimates and assignment churn
 *     are the department's working material. None of it is the requester's,
 *     and some of it would be actively misread.
 *
 * Everything the portal is allowed to see passes through `toPortalTicket` and
 * `isVisibleToRequester` below. Keeping the boundary in the domain layer — one
 * file, no React, no data access — is what makes it auditable before this is
 * pointed at people outside the department.
 */

/* -------------------------------------------------------------------------- */
/* Stages — the four-rung ladder a requester actually cares about             */
/* -------------------------------------------------------------------------- */

export const REQUESTER_STAGE_ORDER = [
  "received",
  "in_progress",
  "needs_you",
  "done",
] as const;

export type RequesterStage = (typeof REQUESTER_STAGE_ORDER)[number];

export const REQUESTER_STAGE_META: Record<
  RequesterStage,
  {
    label: string;
    tone: Tone;
    /** What this means, said to the requester rather than about them. */
    meaning: string;
    /** Whose move it is. The portal sorts and colours on this. */
    ball: "tech" | "you" | "nobody";
  }
> = {
  received: {
    label: "Received",
    tone: "info",
    meaning: "We have your request and it is in the queue.",
    ball: "tech",
  },
  in_progress: {
    label: "Being worked on",
    tone: "brand",
    meaning: "Someone on the Tech team is actively on this.",
    ball: "tech",
  },
  needs_you: {
    label: "Needs you",
    tone: "warning",
    meaning: "We cannot move until you reply. This is waiting on you.",
    ball: "you",
  },
  done: {
    label: "Done",
    tone: "success",
    meaning: "Finished. Tell us if it is not actually fixed.",
    ball: "nobody",
  },
};

/**
 * Internal status to requester stage.
 *
 * `blocked` deliberately reads as "Being worked on" rather than as its own
 * rung: it means the department is stuck on a vendor or another team, which is
 * the department's problem to chase, not a prompt for the requester to act. It
 * would sit next to "Needs you" and be read as the same thing.
 */
export function requesterStage(status: TicketStatus): RequesterStage {
  switch (status) {
    case "new":
    case "triaged":
      return "received";
    case "waiting_on_requester":
      return "needs_you";
    case "resolved":
      return "done";
    case "in_progress":
    case "blocked":
    case "testing":
      return "in_progress";
  }
}

/** The department's own wording, shown as secondary detail. */
export function internalStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_META[status].label;
}

/* -------------------------------------------------------------------------- */
/* Which portal a department submits through                                  */
/* -------------------------------------------------------------------------- */

/**
 * Where a submission would come from once the portal lives in each department's
 * own application.
 *
 * A ticket carries its source rather than living in a separate queue, so this
 * is the whole of what "moving the page" changes about the data. Departments
 * without a portal of their own fall back to the Command Center's own source
 * until they get one.
 */
export const PORTAL_SOURCE_BY_DEPARTMENT: Record<DepartmentKey, TicketSource> = {
  tech: "command_center",
  leadership: "command_center",
  sales: "sales_portal",
  sdr: "sales_portal",
  cam: "production_portal",
  est: "project_consultant_portal",
  production: "production_portal",
  pm: "project_consultant_portal",
  marketing: "command_center",
  accounting_hr: "command_center",
};

/* -------------------------------------------------------------------------- */
/* Redaction                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A ticket, reduced to the fields the portal is allowed to render.
 *
 * A projection rather than a filter on the way out: a component holding a
 * `PortalTicket` cannot accidentally reach for `estimatedEffortHours` or
 * `externalRefs`, because they are not there to reach for.
 */
export type PortalTicket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  stage: RequesterStage;
  /** The department's own status, for the one line that explains the stage. */
  internalStatus: TicketStatus;
  category: Ticket["category"];
  requesterId: string | null;
  requesterDepartment: DepartmentKey;
  /** Who on the Tech team owns it. Null reads as "not picked up yet". */
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  /** Only where the department committed to one. Never the SLA target. */
  dueDate: string | null;
  source: TicketSource;
};

export function toPortalTicket(ticket: Ticket): PortalTicket {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    stage: requesterStage(ticket.status),
    internalStatus: ticket.status,
    category: ticket.category,
    requesterId: ticket.requesterId,
    requesterDepartment: ticket.requesterDepartment,
    assigneeId: ticket.assigneeId,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    resolvedAt: ticket.resolvedAt,
    dueDate: ticket.dueDate,
    source: ticket.source,
  };
}

/** Internal notes never leave the department. */
export function isVisibleToRequester(comment: TicketComment): boolean {
  return !comment.internal;
}

/**
 * Ticket activity the portal will show.
 *
 * An allow-list, not a block-list. A new activity kind added for the
 * department's benefit should not appear in front of the whole company because
 * nobody remembered to exclude it, so anything unlisted is hidden by default.
 *
 * Assignment is included as an event but rendered without naming a previous
 * owner — that a request changed hands three times is the department's
 * business, that somebody owns it now is the requester's.
 */
const REQUESTER_VISIBLE_ACTIVITY = new Set<TicketActivity["kind"]>([
  "created",
  "status_changed",
  "assigned",
  "resolved",
  "reopened",
]);

export function isActivityVisibleToRequester(activity: TicketActivity): boolean {
  return REQUESTER_VISIBLE_ACTIVITY.has(activity.kind);
}

/* -------------------------------------------------------------------------- */
/* Projects — what the company sees of what is being built                    */
/* -------------------------------------------------------------------------- */

/**
 * The rungs a project is described on outside the department.
 *
 * Eight internal statuses collapse to four, on the same principle as
 * `requesterStage`: the department needs `idea`, `backlog`, `planning`,
 * `testing`, `rollout` and `on_hold` to run a portfolio; somebody waiting on a
 * thing needs to know whether it is being thought about, being built, arriving,
 * or done.
 *
 * `on_hold` reads as "Being considered" rather than as its own rung. It is an
 * accurate description — the work is not happening — and it avoids publishing a
 * judgement about why, which is usually about resourcing or another department.
 */
export const ROADMAP_STAGE_ORDER = ["considering", "building", "arriving", "done"] as const;
export type RoadmapStage = (typeof ROADMAP_STAGE_ORDER)[number];

export const ROADMAP_STAGE_META: Record<
  RoadmapStage,
  { label: string; tone: Tone; meaning: string }
> = {
  considering: {
    label: "Being considered",
    tone: "neutral",
    meaning: "On the list. Not being built yet, and not committed to.",
  },
  building: {
    label: "Being built",
    tone: "brand",
    meaning: "Actively being worked on.",
  },
  arriving: {
    label: "Arriving",
    tone: "warning",
    meaning: "Built, being tested or rolled out. You will see this one soon.",
  },
  done: {
    label: "Delivered",
    tone: "success",
    meaning: "Live. If it is not doing what you expected, raise a request.",
  },
};

export function roadmapStage(status: ProjectStatus): RoadmapStage {
  switch (status) {
    case "idea":
    case "backlog":
    case "planning":
    case "on_hold":
      return "considering";
    case "in_progress":
      return "building";
    case "testing":
    case "rollout":
      return "arriving";
    case "complete":
      return "done";
  }
}

/**
 * A project, reduced to what the rest of the company may read.
 *
 * The omissions are the design. `health` and `healthNote` are the department's
 * own risk assessment written in its own words — "will keep breaking until it
 * moves onto the Fabric models" is a true and useful sentence to a colleague
 * and an alarming one to the team depending on it. `priority` invites the
 * question of why somebody else's project outranks yours. Hours saved and
 * automation counts are how Technology justifies itself upwards, not something
 * the affected department needs.
 *
 * What survives is what somebody actually wants: what it is, what it is for,
 * roughly where it has got to, roughly when, and whether they are involved.
 */
export type PortalProject = {
  id: string;
  name: string;
  /** What it is for, in business terms. Never the internal description. */
  goal: string;
  stage: RoadmapStage;
  /**
   * A quarter, never a date.
   *
   * A specific day shown to the whole company is a promise, and roadmap dates
   * move. A quarter is honest about the precision that actually exists.
   */
  timeframe: string | null;
  /** Progress, rounded hard. Precision here implies a confidence nobody has. */
  progressBand: "just started" | "under way" | "nearly there" | "done";
  /** True when the viewer is named on it, which is why it is shown at all. */
  youAreOn: boolean;
  /** How this reached the viewer: named on it, or their team is affected. */
  reason: "named" | "department";
};

function progressBand(progress: number, stage: RoadmapStage): PortalProject["progressBand"] {
  if (stage === "done") return "done";
  if (progress >= 70) return "nearly there";
  if (progress >= 25) return "under way";
  return "just started";
}

export function toPortalProject(
  project: Project,
  viewerId: string,
  reason: PortalProject["reason"],
): PortalProject {
  const stage = roadmapStage(project.status);

  return {
    id: project.id,
    name: project.name,
    goal: project.businessGoal,
    stage,
    timeframe: project.targetDate ? quarterOf(project.targetDate) : null,
    progressBand: progressBand(project.progress, stage),
    youAreOn: project.ownerId === viewerId || project.contributorIds.includes(viewerId),
    reason,
  };
}
