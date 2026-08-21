import { DEFAULT_SLA_CONFIG, type TicketActivity, type Ticket } from "@/domain";
import type { WorkspaceSnapshot } from "../types";
import { buildActivityStream } from "./activity";
import { MOCK_DIAGRAMS } from "./diagrams";
import { MOCK_ARTICLES } from "./knowledge";
import { DATASET_NOW } from "./now";
import { MOCK_MILESTONES, MOCK_PROJECTS, MOCK_TASKS } from "./projects";
import { MOCK_CONNECTIONS, MOCK_SYSTEMS, SYSTEM_MAP_LAYOUT } from "./systems";
import {
  MOCK_TICKETS,
  MOCK_TICKET_ACTIVITY,
  MOCK_TICKET_COMMENTS,
} from "./tickets";
import { CURRENT_USER_ID, MOCK_USERS } from "./users";

/**
 * Baseline activity for a ticket, derived from its own timestamps.
 *
 * Every ticket then has a coherent trail without a hundred entries being typed
 * out by hand, and the trail cannot contradict the record it describes.
 * Hand-written entries in `MOCK_TICKET_ACTIVITY` are merged on top for the
 * tickets with a story worth reading.
 */
function baselineActivity(ticket: Ticket): TicketActivity[] {
  const out: TicketActivity[] = [
    {
      id: `ba-${ticket.id}-created`,
      ticketId: ticket.id,
      kind: "created",
      actorId: ticket.requesterId,
      from: null,
      to: null,
      detail: null,
      createdAt: ticket.createdAt,
    },
  ];

  if (ticket.assigneeId && ticket.firstResponseAt) {
    out.push({
      id: `ba-${ticket.id}-assigned`,
      ticketId: ticket.id,
      kind: "assigned",
      actorId: ticket.assigneeId,
      from: null,
      to: ticket.assigneeId,
      detail: null,
      createdAt: ticket.firstResponseAt,
    });
    out.push({
      id: `ba-${ticket.id}-first-response`,
      ticketId: ticket.id,
      kind: "sla_first_response",
      actorId: ticket.assigneeId,
      from: null,
      to: null,
      detail: null,
      createdAt: ticket.firstResponseAt,
    });
  }

  if (ticket.resolvedAt) {
    out.push({
      id: `ba-${ticket.id}-resolved`,
      ticketId: ticket.id,
      kind: "resolved",
      actorId: ticket.assigneeId ?? ticket.requesterId,
      from: null,
      to: "Resolved",
      detail: null,
      createdAt: ticket.resolvedAt,
    });
  }

  return out;
}

let cached: WorkspaceSnapshot | null = null;

export function buildMockSnapshot(): WorkspaceSnapshot {
  if (cached) return cached;

  const ticketActivity = [
    ...MOCK_TICKETS.flatMap(baselineActivity),
    ...MOCK_TICKET_ACTIVITY,
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  cached = {
    now: DATASET_NOW.toISOString(),
    currentUserId: CURRENT_USER_ID,
    users: MOCK_USERS,
    systems: MOCK_SYSTEMS,
    connections: MOCK_CONNECTIONS,
    tickets: MOCK_TICKETS,
    ticketComments: MOCK_TICKET_COMMENTS,
    ticketActivity,
    projects: MOCK_PROJECTS,
    tasks: MOCK_TASKS,
    milestones: MOCK_MILESTONES,
    diagrams: MOCK_DIAGRAMS,
    articles: MOCK_ARTICLES,
    activity: buildActivityStream({
      tickets: MOCK_TICKETS,
      projects: MOCK_PROJECTS,
      milestones: MOCK_MILESTONES,
      systems: MOCK_SYSTEMS,
      diagrams: MOCK_DIAGRAMS,
      articles: MOCK_ARTICLES,
    }),
    slaConfig: DEFAULT_SLA_CONFIG,
    systemMapLayout: SYSTEM_MAP_LAYOUT,
  };

  return cached;
}
